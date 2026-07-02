"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundPortOnePayment = exports.adminGetPayments = exports.adminSaveUserData = exports.adminGetUserData = exports.verifyPortOnePayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const PORTONE_API_SECRET = (0, params_1.defineSecret)("PORTONE_API_SECRET");
const ADMIN_EMAIL = "ehrbs50@gmail.com";
function assertAdmin(request) {
    if (request.auth?.token?.email !== ADMIN_EMAIL) {
        throw new https_1.HttpsError("permission-denied", "관리자만 사용할 수 있습니다.");
    }
}
// 결제 금액(원) -> 지급 코인. 클라이언트가 보낸 금액이 아니라
// PortOne에서 실제로 조회한 결제 금액을 기준으로 지급 코인을 결정한다.
const AMOUNT_TO_COINS = {
    2200: 500,
    4400: 1200,
    11000: 3500,
    25000: 10000,
};
exports.verifyPortOnePayment = (0, https_1.onCall)({ secrets: [PORTONE_API_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const paymentId = request.data?.paymentId;
    if (!paymentId || typeof paymentId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "paymentId가 필요합니다.");
    }
    const paymentRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `PortOne ${PORTONE_API_SECRET.value()}` } });
    if (!paymentRes.ok) {
        throw new https_1.HttpsError("internal", "PortOne 결제 조회에 실패했습니다.");
    }
    const payment = (await paymentRes.json());
    if (payment.status !== "PAID") {
        throw new https_1.HttpsError("failed-precondition", `결제가 완료되지 않았습니다 (status: ${payment.status})`);
    }
    // 결제 요청 시 심어둔 customerId(uid 앞 20자)와 실제 결제자가 일치하는지 확인
    const expectedCustomerId = uid.slice(0, 20);
    const actualCustomerId = payment.customer?.id;
    if (actualCustomerId && actualCustomerId !== expectedCustomerId) {
        throw new https_1.HttpsError("permission-denied", "결제자 정보가 일치하지 않습니다.");
    }
    const paidAmount = payment.amount?.total;
    const coinsToGrant = paidAmount !== undefined ? AMOUNT_TO_COINS[paidAmount] : undefined;
    if (!coinsToGrant) {
        throw new https_1.HttpsError("invalid-argument", "알 수 없는 결제 금액입니다.");
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
            processedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.set(userRef, { paidCoins: firestore_1.FieldValue.increment(coinsToGrant) }, { merge: true });
        return { alreadyProcessed: false, coins: coinsToGrant };
    });
    return result;
});
const ADMIN_DOC_PATHS = {
    profile: (uid) => db.doc(`users/${uid}`),
    sudoku: (uid) => db.doc(`users/${uid}/sudokuProgress/data`),
    challenges: (uid) => db.doc(`users/${uid}/challenges/data`),
    wordsort: (uid) => db.doc(`users/${uid}/wordSortProgress/data`),
};
exports.adminGetUserData = (0, https_1.onCall)(async (request) => {
    assertAdmin(request);
    const targetUid = request.data?.targetUid;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid가 필요합니다.");
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
exports.adminSaveUserData = (0, https_1.onCall)(async (request) => {
    assertAdmin(request);
    const targetUid = request.data?.targetUid;
    const docType = request.data?.docType;
    const data = request.data?.data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid가 필요합니다.");
    }
    if (typeof docType !== "string" || !(docType in ADMIN_DOC_PATHS)) {
        throw new https_1.HttpsError("invalid-argument", "유효하지 않은 docType입니다.");
    }
    if (typeof data !== "object" || data === null) {
        throw new https_1.HttpsError("invalid-argument", "data가 필요합니다.");
    }
    await ADMIN_DOC_PATHS[docType](targetUid).set(data, { merge: true });
    return { ok: true };
});
// ── 관리자 전용: 결제 내역 조회 / 환불 처리 ─────────────────────────────────
exports.adminGetPayments = (0, https_1.onCall)(async (request) => {
    assertAdmin(request);
    const targetUid = request.data?.targetUid;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid가 필요합니다.");
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
exports.refundPortOnePayment = (0, https_1.onCall)({ secrets: [PORTONE_API_SECRET] }, async (request) => {
    assertAdmin(request);
    const paymentId = request.data?.paymentId;
    if (!paymentId || typeof paymentId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "paymentId가 필요합니다.");
    }
    const paymentRef = db.collection("processedPayments").doc(paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
        throw new https_1.HttpsError("not-found", "결제 내역을 찾을 수 없습니다.");
    }
    const payment = paymentSnap.data();
    if (payment.refunded) {
        throw new https_1.HttpsError("failed-precondition", "이미 환불 처리된 결제입니다.");
    }
    const uid = payment.uid;
    const originalAmount = payment.amount;
    const originalCoins = payment.coins;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const currentPaidCoins = userSnap.data()?.paidCoins ?? 0;
    // 이미 사용된 만큼은 환불 대상에서 제외 (남아있는 유료 코인만큼만)
    const refundableCoins = Math.min(originalCoins, currentPaidCoins);
    if (refundableCoins <= 0) {
        throw new https_1.HttpsError("failed-precondition", "환불 가능한 코인이 남아있지 않습니다 (이미 모두 사용됨).");
    }
    const isFullRefund = refundableCoins === originalCoins;
    const refundAmount = isFullRefund
        ? originalAmount
        : Math.round((originalAmount * refundableCoins) / originalCoins);
    const cancelRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
        method: "POST",
        headers: {
            Authorization: `PortOne ${PORTONE_API_SECRET.value()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(isFullRefund
            ? { reason: "관리자 환불 처리" }
            : { reason: "관리자 환불 처리 (부분)", amount: refundAmount }),
    });
    if (!cancelRes.ok) {
        const errText = await cancelRes.text();
        throw new https_1.HttpsError("internal", `PortOne 결제취소 실패: ${errText}`);
    }
    await db.runTransaction(async (tx) => {
        const freshUserSnap = await tx.get(userRef);
        const freshPaidCoins = freshUserSnap.data()?.paidCoins ?? 0;
        const actualDeduct = Math.min(refundableCoins, freshPaidCoins);
        tx.set(userRef, { paidCoins: firestore_1.FieldValue.increment(-actualDeduct) }, { merge: true });
        tx.set(paymentRef, {
            refunded: true,
            refundedCoins: refundableCoins,
            refundedAmount: refundAmount,
            refundedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { refundedCoins: refundableCoins, refundedAmount: refundAmount };
});
