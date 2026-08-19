/**
 * 도전과제 퍼즐력 재계산 — 영향 규모만 집계한다 (읽기 전용).
 *
 * 실제 반영은 Cloud Function `adminRecalcPuzzlePower({ dryRun: false })` 가 담당한다.
 * 이 스크립트는 아무것도 쓰지 않으므로 안심하고 돌려도 된다.
 *
 * 사전 준비 (한 번만):
 *   gcloud auth application-default login
 *   gcloud config set project sudoku-78eb5
 *
 * 실행:
 *   npx tsx functions/scripts/check-puzzle-power.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import sudoku from '../../src/data/sudoku-challenges.json';
import wordSort from '../../src/data/word-sort-challenges.json';
import queens from '../../src/data/queens-challenges.json';
import snapspot from '../../src/data/snapspot-challenges.json';

const PUZZLE_POWER_PER_CHALLENGE = 10;
const VALID_IDS = new Set(
  [...sudoku, ...wordSort, ...queens, ...snapspot].map(c => c.id)
);

initializeApp({ credential: applicationDefault(), projectId: 'sudoku-78eb5' });
const db = getFirestore();

async function main() {
  console.log(`유효 도전과제 ${VALID_IDS.size}개 · 개당 퍼즐력 ${PUZZLE_POWER_PER_CHALLENGE}\n`);

  const users = await db.collection('users').get();
  let withData = 0;
  let changed = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  let orphanClaims = 0;
  const samples: Array<{ uid: string; before: number; after: number; claims: number }> = [];

  for (const userDoc of users.docs) {
    const snap = await userDoc.ref.collection('challenges').doc('data').get();
    if (!snap.exists) continue;
    withData++;

    const data = snap.data() ?? {};
    const claimed: string[] = data.claimedIds ?? [];
    const before: number = data.mainDocSyncedPP ?? 0;

    const valid = claimed.filter(id => VALID_IDS.has(id));
    orphanClaims += claimed.length - valid.length;
    const after = valid.length * PUZZLE_POWER_PER_CHALLENGE;

    totalBefore += before;
    totalAfter += after;
    if (after !== before) {
      changed++;
      if (samples.length < 15) {
        samples.push({ uid: userDoc.id, before, after, claims: valid.length });
      }
    }
  }

  console.log(`전체 사용자         ${users.size}명`);
  console.log(`도전과제 기록 보유   ${withData}명`);
  console.log(`값이 바뀌는 사용자   ${changed}명`);
  console.log(`퍼즐력 합계         ${totalBefore} → ${totalAfter} (${totalAfter - totalBefore})`);
  console.log(`없어진 도전과제 수령 ${orphanClaims}건 (0으로 계산됨)`);

  if (samples.length > 0) {
    console.log('\n예시 (최대 15명)');
    for (const s of samples) {
      console.log(`  ${s.uid.slice(0, 12).padEnd(12)} ${String(s.before).padStart(5)} → ${String(s.after).padStart(4)}  (수령 ${s.claims}개)`);
    }
  }
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
