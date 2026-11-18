/**
 * 워드소트 최고 진행 레벨 상위 N명 조회 (읽기 전용, uid·닉네임은 출력하지 않는다).
 *
 * 사전 준비 (한 번만):
 *   gcloud auth application-default login
 *
 * 실행:
 *   npx tsx functions/scripts/top-wordsort.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault(), projectId: 'sudoku-78eb5' });
const db = getFirestore();

async function top(collectionName: string, label: string) {
  const snap = await db.collectionGroup(collectionName).orderBy('clearedLevel', 'desc').limit(10).get();
  console.log(`${label} 상위 ${snap.size}명 clearedLevel:`, snap.docs.map(d => d.data().clearedLevel).join(', '));
}

async function main() {
  await top('wordSortProgress', '워드소트');
  await top('wordSortHardProgress', '워드소트(하드)');
}

main().catch(e => { console.error(e); process.exit(1); });
