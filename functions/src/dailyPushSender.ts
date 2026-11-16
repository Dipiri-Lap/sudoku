import { getMessaging } from "firebase-admin/messaging";
import { Timestamp, type DocumentReference, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import {
  EVENING_LOCAL_HOUR, MORNING_LOCAL_HOUR, buildEveningMessage, buildMorningMessage, dailyLinkFor,
  eveningQueryHour, isValidTimeZone, localDateKey, morningHourUtc, normalizeLang, normalizeTimeZone,
  slotDecision, DEFAULT_LANG, DEFAULT_TZ, type PushLang, type PushMessage,
} from "./dailyPush";

/**
 * 오늘의 퍼즐 웹 푸시 발송 (사용자 로컬 시각 기준, 매시 정각 실행).
 *  - 토큰: users/{uid}/pushTokens/{token}
 *      { token, tz: IANA 시간대, lang: 'ko'|'en'|'ja', pushHourUtc: 로컬 아침 8시가 되는 UTC 시(0~23), updatedAt, userAgent }
 *    클라이언트가 알림을 허용하거나 앱을 열 때 저장한다(src/services/pushNotification.ts).
 *  - 매시 정각(UTC 시 h)에
 *      아침: pushHourUtc == h 인 토큰만 조회 (collectionGroup + 단일 필드 색인)
 *      저녁: pushHourUtc == h - 13 인 토큰만 조회 (로컬 21시 = 로컬 8시 + 13시간)
 *    → 토큰 하나는 하루에 아침·저녁 한 번씩만 읽힌다(예전 "하루 두 번 전체 조회"와 같은 읽기 양).
 *  - 서머타임 등으로 pushHourUtc 가 어긋났으면 실제 로컬 시를 보고 고쳐 적는다(slotDecision).
 *  - 무슨 말을 보낼지는 dailyPush.ts 의 순수 함수가 정한다. null 이면 그 토큰에는 보내지 않는다.
 *  - 이미 무효가 된 토큰은 보내다 실패하면 지운다.
 */

const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export type PushSlot = "morning" | "evening";

interface TokenTarget {
  uid: string;
  token: string;
  ref: DocumentReference;
  tz: string;
  lang: PushLang;
}

export interface SendResult {
  slot: PushSlot;
  queryHour: number;
  tokens: number;
  users: number;
  sent: number;
  failed: number;
  removed: number;
  rescheduled: number;
}

/** 시간대·언어 필드가 없는 예전 토큰에 채울 값. 채울 것이 없으면 null. */
export function tokenDefaultsPatch(
  data: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  const tz = isValidTimeZone(data.tz) ? data.tz : DEFAULT_TZ;
  if (data.tz !== tz) patch.tz = tz;
  if (normalizeLang(data.lang) !== data.lang) patch.lang = DEFAULT_LANG;
  if (typeof data.pushHourUtc !== "number" || data.tz !== tz) patch.pushHourUtc = morningHourUtc(tz, now);
  return Object.keys(patch).length ? patch : null;
}

async function commitUpdates(db: Firestore, updates: { ref: DocumentReference; patch: Record<string, unknown> }[]) {
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    updates.slice(i, i + 400).forEach((u) => batch.set(u.ref, u.patch, { merge: true }));
    await batch.commit();
  }
}

const BACKFILL_MARKER = "system/dailyPushTokenBackfill";
/** 저장 시각(serverTimestamp)과 조회 사이의 지연을 덮으려고 지난 실행보다 조금 앞부터 다시 본다. */
const BACKFILL_OVERLAP_MS = 10 * 60 * 1000;

/**
 * tz/lang/pushHourUtc 가 없는 토큰을 한국 시간·한국어로 채운다.
 * Firestore 는 "필드 없음"을 조회할 수 없으므로 updatedAt(모든 앱 버전이 저장한다)으로 범위를 좁힌다:
 * 첫 실행은 전체를 한 번 훑고(기존 토큰 백필), 그 뒤로는 지난 실행 이후 저장된 토큰만 읽는다
 * (시간대 저장 이전의 옛 앱 캐시가 새로 저장한 토큰도 여기서 채워져 다음 정각 조회부터 걸린다).
 */
export async function fillMissingPushTokenFields(
  db: Firestore,
  now: Date = new Date(),
): Promise<{ scanned: number; updated: number }> {
  const marker = db.doc(BACKFILL_MARKER);
  const markerSnap = await marker.get();
  const checkedUntil = markerSnap.get("checkedUntil") as Timestamp | undefined;
  const base = db.collectionGroup("pushTokens");
  const snap = checkedUntil
    ? await base.where("updatedAt", ">", Timestamp.fromMillis(checkedUntil.toMillis() - BACKFILL_OVERLAP_MS)).get()
    : await base.get();
  const updates: { ref: DocumentReference; patch: Record<string, unknown> }[] = [];
  for (const d of snap.docs) {
    const patch = tokenDefaultsPatch(d.data(), now);
    if (patch) updates.push({ ref: d.ref, patch });
  }
  await commitUpdates(db, updates);
  await marker.set({ checkedUntil: Timestamp.fromDate(now), lastScanned: snap.size, lastUpdated: updates.length }, { merge: true });
  return { scanned: snap.size, updated: updates.length };
}

function toTarget(d: DocumentSnapshot): TokenTarget | null {
  const uid = d.ref.parent.parent?.id;
  const token = d.get("token");
  if (!uid || typeof token !== "string" || !token) return null;
  return { uid, token, ref: d.ref, tz: normalizeTimeZone(d.get("tz")), lang: normalizeLang(d.get("lang")) };
}

/** 이번 정각에 해당하는 슬롯(아침 또는 저녁)의 알림을 보낸다. */
export async function sendDailyPushSlot(
  db: Firestore,
  slot: PushSlot,
  now: Date = new Date(),
): Promise<SendResult> {
  const utcHour = now.getUTCHours();
  const queryHour = slot === "morning" ? utcHour : eveningQueryHour(utcHour);
  const targetLocalHour = slot === "morning" ? MORNING_LOCAL_HOUR : EVENING_LOCAL_HOUR;
  const build = slot === "morning" ? buildMorningMessage : buildEveningMessage;
  const tag = slot === "morning" ? "daily-puzzle-morning" : "daily-puzzle-evening";

  const tokenSnap = await db.collectionGroup("pushTokens").where("pushHourUtc", "==", queryHour).get();

  // 로컬 시가 어긋난 토큰은 pushHourUtc 를 고쳐 적고, 지금 보낼 토큰만 남긴다.
  const targets: TokenTarget[] = [];
  const reschedule: { ref: DocumentReference; patch: Record<string, unknown> }[] = [];
  for (const d of tokenSnap.docs) {
    const t = toTarget(d);
    if (!t) continue;
    const decision = slotDecision(now, t.tz, targetLocalHour);
    if (decision !== "send" || slot === "morning") {
      const fixed = morningHourUtc(t.tz, now);
      if (fixed !== d.get("pushHourUtc")) reschedule.push({ ref: d.ref, patch: { pushHourUtc: fixed } });
    }
    if (decision === "send") targets.push(t);
  }
  await commitUpdates(db, reschedule);

  // 사용자별 클리어 기록(clearedDates)을 읽는다.
  const uids = [...new Set(targets.map((t) => t.uid))];
  const clearedByUid = new Map<string, string[]>();
  for (let i = 0; i < uids.length; i += 300) {
    const slice = uids.slice(i, i + 300);
    const snaps = await db.getAll(...slice.map((uid) => db.doc(`users/${uid}/dailyPuzzle/data`)));
    snaps.forEach((snap, idx) => {
      const cleared = snap.exists ? snap.get("clearedDates") : [];
      clearedByUid.set(slice[idx], Array.isArray(cleared) ? cleared : []);
    });
  }

  // 토큰마다 그 시간대의 "오늘"과 언어로 문구를 정하고, 같은 문구·링크끼리 묶어서 한 번에 보낸다.
  const groups = new Map<string, { msg: PushMessage; link: string; targets: TokenTarget[] }>();
  for (const t of targets) {
    const today = localDateKey(now, t.tz);
    const msg = build(clearedByUid.get(t.uid) ?? [], today, t.lang);
    if (!msg) continue;
    const link = dailyLinkFor(t.lang);
    const key = `${link}\n${msg.title}\n${msg.body}`;
    const group = groups.get(key) ?? { msg, link, targets: [] };
    group.targets.push(t);
    groups.set(key, group);
  }

  const messaging = getMessaging();
  const stale: DocumentReference[] = [];
  let sent = 0;
  let failed = 0;
  for (const { msg, link, targets: groupTargets } of groups.values()) {
    for (let i = 0; i < groupTargets.length; i += 500) {
      const chunk = groupTargets.slice(i, i + 500);
      const res = await messaging.sendEachForMulticast({
        tokens: chunk.map((t) => t.token),
        // 알림 표시는 서비스 워커(public/firebase-messaging-sw.js)가 data 를 읽어서 직접 한다.
        data: { title: msg.title, body: msg.body, link, tag },
        webpush: { headers: { TTL: "43200", Urgency: "high" } }, // 12시간 안에 못 받으면 버린다
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && STALE_TOKEN_CODES.has(r.error.code)) stale.push(chunk[idx].ref);
      });
    }
  }

  for (let i = 0; i < stale.length; i += 400) {
    const batch = db.batch();
    stale.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return {
    slot, queryHour, tokens: tokenSnap.size, users: uids.length, sent, failed, removed: stale.length,
    rescheduled: reschedule.length,
  };
}
