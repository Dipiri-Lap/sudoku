import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const PORTONE_API_SECRET = defineSecret("PORTONE_API_SECRET");
const ADMIN_EMAIL = "ehrbs50@gmail.com";

function assertAdmin(request: CallableRequest): void {
  if (request.auth?.token?.email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "관리자만 사용할 수 있습니다.");
  }
}

// 결제 금액(원) -> 지급 코인. 클라이언트가 보낸 금액이 아니라
// PortOne에서 실제로 조회한 결제 금액을 기준으로 지급 코인을 결정한다.
const AMOUNT_TO_COINS: Record<number, number> = {
  2200: 500,
  4400: 1200,
  11000: 3500,
  25000: 10000,
};

export const verifyPortOnePayment = onCall(
  { secrets: [PORTONE_API_SECRET] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const paymentId = request.data?.paymentId;
    if (!paymentId || typeof paymentId !== "string") {
      throw new HttpsError("invalid-argument", "paymentId가 필요합니다.");
    }

    const paymentRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${PORTONE_API_SECRET.value()}` } }
    );
    if (!paymentRes.ok) {
      throw new HttpsError("internal", "PortOne 결제 조회에 실패했습니다.");
    }
    const payment = (await paymentRes.json()) as {
      status?: string;
      customer?: { id?: string };
      amount?: { total?: number };
    };

    if (payment.status !== "PAID") {
      throw new HttpsError(
        "failed-precondition",
        `결제가 완료되지 않았습니다 (status: ${payment.status})`
      );
    }

    // 결제 요청 시 심어둔 customerId(uid 앞 20자)와 실제 결제자가 일치하는지 확인
    const expectedCustomerId = uid.slice(0, 20);
    const actualCustomerId = payment.customer?.id;
    if (actualCustomerId && actualCustomerId !== expectedCustomerId) {
      throw new HttpsError("permission-denied", "결제자 정보가 일치하지 않습니다.");
    }

    const paidAmount: number | undefined = payment.amount?.total;
    const coinsToGrant = paidAmount !== undefined ? AMOUNT_TO_COINS[paidAmount] : undefined;
    if (!coinsToGrant) {
      throw new HttpsError("invalid-argument", "알 수 없는 결제 금액입니다.");
    }

    const paymentRef = db.collection("processedPayments").doc(paymentId);
    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(paymentRef);
      if (existing.exists) {
        return { alreadyProcessed: true, coins: existing.data()?.coins ?? 0 };
      }
      tx.set(paymentRef, {
        uid,
        paymentId,
        amount: paidAmount,
        coins: coinsToGrant,
        processedAt: FieldValue.serverTimestamp(),
      });
      tx.set(userRef, { paidCoins: FieldValue.increment(coinsToGrant) }, { merge: true });
      return { alreadyProcessed: false, coins: coinsToGrant };
    });

    return result;
  }
);

// ── 관리자 전용: 유저 데이터 조회/저장 ──────────────────────────────────────
// AdminPage가 클라이언트에서 직접 Firestore를 쓰면 다른 유저 문서에는
// (보안 규칙상 본인 것만 쓰기 허용이라) 접근할 수 없다. Admin SDK로 우회하되,
// 호출자가 관리자 이메일인지 서버에서 반드시 검증한다.

type AdminDocType = "profile" | "sudoku" | "challenges" | "wordsort";

const ADMIN_DOC_PATHS: Record<AdminDocType, (uid: string) => FirebaseFirestore.DocumentReference> = {
  profile: (uid) => db.doc(`users/${uid}`),
  sudoku: (uid) => db.doc(`users/${uid}/sudokuProgress/data`),
  challenges: (uid) => db.doc(`users/${uid}/challenges/data`),
  wordsort: (uid) => db.doc(`users/${uid}/wordSortProgress/data`),
};

export const adminGetUserData = onCall(async (request) => {
  assertAdmin(request);

  const targetUid = request.data?.targetUid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid가 필요합니다.");
  }

  const [profile, sudoku, challenges, wordsort] = await Promise.all([
    ADMIN_DOC_PATHS.profile(targetUid).get(),
    ADMIN_DOC_PATHS.sudoku(targetUid).get(),
    ADMIN_DOC_PATHS.challenges(targetUid).get(),
    ADMIN_DOC_PATHS.wordsort(targetUid).get(),
  ]);

  return {
    profile: profile.exists ? profile.data() : null,
    sudoku: sudoku.exists ? sudoku.data() : null,
    challenges: challenges.exists ? challenges.data() : null,
    wordsort: wordsort.exists ? wordsort.data() : null,
  };
});

export const adminSaveUserData = onCall(async (request) => {
  assertAdmin(request);

  const targetUid = request.data?.targetUid;
  const docType = request.data?.docType;
  const data = request.data?.data;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid가 필요합니다.");
  }
  if (typeof docType !== "string" || !(docType in ADMIN_DOC_PATHS)) {
    throw new HttpsError("invalid-argument", "유효하지 않은 docType입니다.");
  }
  if (typeof data !== "object" || data === null) {
    throw new HttpsError("invalid-argument", "data가 필요합니다.");
  }

  await ADMIN_DOC_PATHS[docType as AdminDocType](targetUid).set(data, { merge: true });
  return { ok: true };
});

// ── 관리자 전용: 결제 내역 조회 / 환불 처리 ─────────────────────────────────

export const adminGetPayments = onCall(async (request) => {
  assertAdmin(request);

  const targetUid = request.data?.targetUid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid가 필요합니다.");
  }

  const snap = await db
    .collection("processedPayments")
    .where("uid", "==", targetUid)
    .orderBy("processedAt", "desc")
    .get();

  return {
    payments: snap.docs.map((d) => {
      const data = d.data();
      return {
        paymentId: d.id,
        amount: data.amount ?? 0,
        coins: data.coins ?? 0,
        refunded: data.refunded ?? false,
        refundedCoins: data.refundedCoins ?? 0,
        refundedAmount: data.refundedAmount ?? 0,
        processedAt: data.processedAt?.toMillis?.() ?? null,
        refundedAt: data.refundedAt?.toMillis?.() ?? null,
      };
    }),
  };
});

export const refundPortOnePayment = onCall(
  { secrets: [PORTONE_API_SECRET] },
  async (request) => {
    assertAdmin(request);

    const paymentId = request.data?.paymentId;
    if (!paymentId || typeof paymentId !== "string") {
      throw new HttpsError("invalid-argument", "paymentId가 필요합니다.");
    }

    const paymentRef = db.collection("processedPayments").doc(paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      throw new HttpsError("not-found", "결제 내역을 찾을 수 없습니다.");
    }
    const payment = paymentSnap.data()!;
    if (payment.refunded) {
      throw new HttpsError("failed-precondition", "이미 환불 처리된 결제입니다.");
    }

    const uid: string = payment.uid;
    const originalAmount: number = payment.amount;
    const originalCoins: number = payment.coins;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const currentPaidCoins: number = userSnap.data()?.paidCoins ?? 0;

    // 이미 사용된 만큼은 환불 대상에서 제외 (남아있는 유료 코인만큼만)
    const refundableCoins = Math.min(originalCoins, currentPaidCoins);
    if (refundableCoins <= 0) {
      throw new HttpsError(
        "failed-precondition",
        "환불 가능한 코인이 남아있지 않습니다 (이미 모두 사용됨)."
      );
    }

    const isFullRefund = refundableCoins === originalCoins;
    const refundAmount = isFullRefund
      ? originalAmount
      : Math.round((originalAmount * refundableCoins) / originalCoins);

    const cancelRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isFullRefund
            ? { reason: "관리자 환불 처리" }
            : { reason: "관리자 환불 처리 (부분)", amount: refundAmount }
        ),
      }
    );
    if (!cancelRes.ok) {
      const errText = await cancelRes.text();
      throw new HttpsError("internal", `PortOne 결제취소 실패: ${errText}`);
    }

    await db.runTransaction(async (tx) => {
      const freshUserSnap = await tx.get(userRef);
      const freshPaidCoins: number = freshUserSnap.data()?.paidCoins ?? 0;
      const actualDeduct = Math.min(refundableCoins, freshPaidCoins);
      tx.set(userRef, { paidCoins: FieldValue.increment(-actualDeduct) }, { merge: true });
      tx.set(
        paymentRef,
        {
          refunded: true,
          refundedCoins: refundableCoins,
          refundedAmount: refundAmount,
          refundedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return { refundedCoins: refundableCoins, refundedAmount: refundAmount };
  }
);

// ── 관리자 전용: 레거시 coins -> freeCoins 일괄 마이그레이션 ──────────────────
// paidCoins만 생기고 freeCoins 마이그레이션이 스킵됐던 유저들을 서버에서
// 일괄로 바로잡는다. freeCoins가 이미 있는 유저는 건드리지 않아 반복 실행해도 안전하다.

export const adminMigrateLegacyCoins = onCall(async (request) => {
  assertAdmin(request);

  const snap = await db.collection("users").get();
  const targets = snap.docs.filter((d) => {
    const data = d.data();
    return data.freeCoins === undefined && typeof data.coins === "number";
  });

  const BATCH_SIZE = 400;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const d of targets.slice(i, i + BATCH_SIZE)) {
      batch.set(d.ref, { freeCoins: d.data().coins }, { merge: true });
    }
    await batch.commit();
  }

  return { migratedCount: targets.length };
});

/**
 * 도전과제 퍼즐력 재계산.
 *
 * 퍼즐력은 '수령한 도전과제 보상의 합'과 같으므로 claimedIds 에서 다시 계산할 수 있다.
 * 보상을 전부 10으로 통일하면서, 이미 옛 보상을 받은 사용자의 값을 내리기 위한 것이다.
 * 여러 번 실행해도 같은 결과가 나온다(멱등).
 *
 * dryRun 기본값은 true — 먼저 몇 명이 얼마나 바뀌는지 확인하고 나서 {dryRun:false} 로 실행한다.
 */
const PUZZLE_POWER_PER_CHALLENGE = 10;

// src/data/*-challenges.json 의 id 목록. 도전과제를 추가·삭제하면 여기도 갱신해야 한다.
const VALID_CHALLENGE_IDS = new Set([
  "stage_001", "stage_005", "stage_5", "stage_10", "stage_25", "stage_50",
  "stage_100", "stage_200", "stage_300", "stage_400", "stage_500", "stage_1000",
  "word_st_1", "word_st_10", "word_st_25", "word_st_50", "word_st_75", "word_st_100",
  "word_st_150", "word_st_200", "word_st_250", "word_st_300", "word_hard_1", "word_hard_50",
  "word_hard_100", "word_hard_150", "word_hard_200", "cq_1", "cq_10", "cq_25",
  "cq_50", "cq_100", "cq_200", "cq_300", "cq_400", "cq_500",
  "cq_1000", "ss_1", "ss_10", "ss_30", "ss_50", "ss_100",
  "ss_200", "ss_300", "ss_500",
]);

export const adminRecalcPuzzlePower = onCall(
  {timeoutSeconds: 540, memory: "512MiB"},
  async (request) => {
    assertAdmin(request);
    const dryRun = request.data?.dryRun !== false;

    try {
      // 사용자마다 하위 문서를 하나씩 읽으면 왕복이 사용자 수만큼 생겨 60초를 넘긴다.
      // challenges 하위 컬렉션을 collectionGroup 으로 한 번에 가져온다.
      const challengeDocs = await db.collectionGroup("challenges").get();

      let changed = 0;
      let totalDelta = 0;
      const samples: Array<{uid: string; before: number; after: number}> = [];
      const updates: Array<{
        uid: string; ref: FirebaseFirestore.DocumentReference; newPP: number; delta: number;
      }> = [];

      for (const snap of challengeDocs.docs) {
        const userRef = snap.ref.parent.parent;
        if (!userRef) continue;

        const data = snap.data() ?? {};
        const claimed: string[] = data.claimedIds ?? [];
        const syncedPP: number = data.mainDocSyncedPP ?? 0;

        const validCount = claimed.filter((id) => VALID_CHALLENGE_IDS.has(id)).length;
        const newPP = validCount * PUZZLE_POWER_PER_CHALLENGE;
        const delta = newPP - syncedPP;
        if (delta === 0 && data.puzzlePower === newPP) continue;

        changed++;
        totalDelta += delta;
        if (samples.length < 10) {
          samples.push({uid: userRef.id, before: syncedPP, after: newPP});
        }
        updates.push({uid: userRef.id, ref: snap.ref, newPP, delta});
      }

      if (!dryRun) {
        const BATCH_SIZE = 200;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
          const batch = db.batch();
          for (const u of updates.slice(i, i + BATCH_SIZE)) {
            batch.set(u.ref, {puzzlePower: u.newPP, mainDocSyncedPP: u.newPP}, {merge: true});
            if (u.delta !== 0) {
              batch.set(
                db.collection("users").doc(u.uid),
                {puzzlePower: FieldValue.increment(u.delta)},
                {merge: true}
              );
            }
          }
          await batch.commit();
        }
      }

      return {dryRun, scanned: challengeDocs.size, changed, totalDelta, samples};
    } catch (e) {
      // 그냥 던지면 클라이언트에 'internal' 로만 보여 원인을 알 수 없다.
      const msg = e instanceof Error ? e.message : String(e);
      console.error("adminRecalcPuzzlePower 실패:", e);
      throw new HttpsError("internal", `재계산 실패: ${msg}`);
    }
  }
);
