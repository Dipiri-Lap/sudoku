"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyPush = sendDailyPush;
const messaging_1 = require("firebase-admin/messaging");
const dailyPush_1 = require("./dailyPush");
/**
 * 오늘의 퍼즐 웹 푸시 발송.
 *  - 토큰: users/{uid}/pushTokens/{token} (클라이언트가 알림을 허용하면 저장)
 *  - 무슨 말을 보낼지는 build 콜백(dailyPush.ts 의 순수 함수)이 정한다. null 이면 그 사람에게는 보내지 않는다.
 *  - 이미 무효가 된 토큰은 보내다 실패하면 지운다.
 */
const STALE_TOKEN_CODES = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
]);
async function sendDailyPush(db, build, tag, now = new Date()) {
    const today = (0, dailyPush_1.kstDateKey)(now);
    const tokenSnap = await db.collectionGroup("pushTokens").get();
    const byUid = new Map();
    for (const d of tokenSnap.docs) {
        const uid = d.ref.parent.parent?.id;
        const token = d.get("token");
        if (!uid || typeof token !== "string" || !token)
            continue;
        const list = byUid.get(uid) ?? [];
        list.push({ token, ref: d.ref });
        byUid.set(uid, list);
    }
    // 사용자별 연속 기록(clearedDates)을 읽는다.
    const uids = [...byUid.keys()];
    const clearedByUid = new Map();
    for (let i = 0; i < uids.length; i += 300) {
        const slice = uids.slice(i, i + 300);
        const snaps = await db.getAll(...slice.map((uid) => db.doc(`users/${uid}/dailyPuzzle/data`)));
        snaps.forEach((snap, idx) => {
            const cleared = snap.exists ? snap.get("clearedDates") : [];
            clearedByUid.set(slice[idx], Array.isArray(cleared) ? cleared : []);
        });
    }
    // 같은 문구를 받는 토큰끼리 묶어서 한 번에 보낸다.
    const groups = new Map();
    for (const [uid, targets] of byUid) {
        const msg = build(clearedByUid.get(uid) ?? [], today);
        if (!msg)
            continue;
        const key = `${msg.title}\n${msg.body}`;
        const group = groups.get(key) ?? { msg, targets: [] };
        group.targets.push(...targets);
        groups.set(key, group);
    }
    const messaging = (0, messaging_1.getMessaging)();
    const stale = [];
    let sent = 0;
    let failed = 0;
    for (const { msg, targets } of groups.values()) {
        for (let i = 0; i < targets.length; i += 500) {
            const chunk = targets.slice(i, i + 500);
            const res = await messaging.sendEachForMulticast({
                tokens: chunk.map((t) => t.token),
                // 알림 표시는 서비스 워커(public/firebase-messaging-sw.js)가 data 를 읽어서 직접 한다.
                data: { title: msg.title, body: msg.body, link: "/daily", tag },
                webpush: { headers: { TTL: "43200", Urgency: "high" } }, // 12시간 안에 못 받으면 버린다
            });
            sent += res.successCount;
            failed += res.failureCount;
            res.responses.forEach((r, idx) => {
                if (!r.success && r.error && STALE_TOKEN_CODES.has(r.error.code))
                    stale.push(chunk[idx].ref);
            });
        }
    }
    for (let i = 0; i < stale.length; i += 400) {
        const batch = db.batch();
        stale.slice(i, i + 400).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
    return { users: byUid.size, tokens: tokenSnap.size, sent, failed, removed: stale.length };
}
