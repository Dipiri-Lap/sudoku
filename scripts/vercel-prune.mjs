/**
 * 버셀 배포 정리 — 프로젝트마다 최근 N개만 남기고 지운다.
 *
 * 배포 저장소(Deployment Storage) 한도는 **배포 개수 × 배포 하나 크기**로 찬다.
 * 이 스크립트는 앞쪽(개수)만 다룬다. 뒤쪽(크기)은 에셋을 줄여야 한다.
 *
 *   node scripts/vercel-prune.mjs              무엇이 지워질지 보기만 한다
 *   node scripts/vercel-prune.mjs --go         실제로 지운다
 *   node scripts/vercel-prune.mjs --keep 20    남길 개수 바꾸기 (기본 10)
 *   node scripts/vercel-prune.mjs --project X  한 프로젝트만
 *   node scripts/vercel-prune.mjs --exclude a,b  그 프로젝트만 빼고
 *
 * 안전장치 둘:
 *  - `--safe`: 별칭(도메인)이 걸린 배포는 버셀이 건너뛴다. 살아 있는 사이트를
 *    내리는 실수를 CLI 쪽에서 한 번 더 막는다.
 *  - 기본이 미리보기다. `--go` 를 붙여야 지운다.
 *
 * 되돌릴 수 없다. 미리보기로 목록을 먼저 확인할 것.
 */
import { execSync } from 'child_process';

const SCOPE = process.env.VERCEL_SCOPE ?? 'dipiris-projects';
const args = process.argv.slice(2);
const GO = args.includes('--go');
const KEEP = Number(args[args.indexOf('--keep') + 1]) || 10;
const ONLY = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;
/** 손대지 않을 프로젝트. 따로 정리 중인 것을 건드리지 않으려고 둔다. */
const SKIP = new Set(
  (args.includes('--exclude') ? args[args.indexOf('--exclude') + 1] : '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
);
/** 한 번에 넘길 배포 수. 너무 크면 명령줄 길이 제한에 걸린다. */
const BATCH = 20;

/**
 * 윈도우에서 vercel 은 .cmd 래퍼라 execFile 로는 안 뜬다. 셸을 거친다.
 *
 * `mergeErr`: `vercel project ls` 는 표를 **stderr 로** 뱉는다. stdout 만 받으면
 * 빈 문자열이 와서 "프로젝트 0개"가 된다. `--format json` 쪽은 stdout 이라
 * 필요할 때만 합친다.
 */
function vercel(cmd, mergeErr = false) {
  return execSync(`vercel ${cmd} --scope ${SCOPE}${mergeErr ? ' 2>&1' : ''}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function projects() {
  const out = vercel('project ls', true);
  return [...out.matchAll(/^\s{2}([a-z0-9][\w-]*)\s{2,}https?:\/\//gim)].map(m => m[1]);
}

/** 그 프로젝트의 배포를 전부 모은다(페이지를 넘겨가며) */
function deployments(project) {
  const all = [];
  let next;
  for (let page = 0; page < 60; page++) {
    let res;
    try {
      res = JSON.parse(vercel(`ls ${project} --format json${next ? ` --next ${next}` : ''}`));
    } catch (e) {
      console.error(`  ! ${project} 조회 실패: ` + String(e.message).slice(0, 120));
      break;
    }
    const batch = res.deployments ?? [];
    all.push(...batch);
    next = res.pagination?.next;
    if (!next || batch.length === 0) break;
  }
  // 최신이 앞. createdAt 으로 직접 정렬한다 - 목록 순서에 기대지 않는다.
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

const list = (ONLY ? [ONLY] : projects()).filter(p => !SKIP.has(p));
if (SKIP.size > 0) console.log(`제외: ${[...SKIP].join(', ')}`);
console.log(`${SCOPE} · 프로젝트 ${list.length}개 · 최근 ${KEEP}개 유지` + (GO ? '' : '  (미리보기)'));

let totalDrop = 0;
let totalKeep = 0;
const plan = [];

for (const project of list) {
  const all = deployments(project);
  const drop = all.slice(KEEP);
  totalKeep += Math.min(all.length, KEEP);
  totalDrop += drop.length;
  plan.push({ project, drop });

  const oldest = all.length ? Math.round((Date.now() - all[all.length - 1].createdAt) / 86400000) : 0;
  console.log(
    `  ${project.padEnd(20)} 전체 ${String(all.length).padStart(3)}` +
      `  지울 ${String(drop.length).padStart(3)}  | 가장 오래된 것 ${oldest}일`,
  );
}

console.log(`\n합계: ${totalDrop}개 삭제 대상, ${totalKeep}개 유지`);

if (!GO) {
  console.log('\n실제로 지우려면 --go 를 붙이세요.');
  process.exit(0);
}

let removed = 0;
for (const { project, drop } of plan) {
  if (drop.length === 0) continue;
  console.log(`\n[${project}] ${drop.length}개`);

  for (let i = 0; i < drop.length; i += BATCH) {
    const batch = drop.slice(i, i + BATCH);
    try {
      // --safe 는 별칭 걸린 배포를 건너뛴다. 살아 있는 사이트를 지키는 마지막 방어선.
      vercel(`remove ${batch.map(d => d.url).join(' ')} --yes --safe`);
      removed += batch.length;
      console.log(`  ${Math.min(i + BATCH, drop.length)}/${drop.length}`);
    } catch (e) {
      console.error(`  ! ${i + 1}~${i + batch.length} 실패: ` + String(e.stderr ?? e.message).slice(0, 200));
    }
  }
}

console.log(`\n삭제 요청 ${removed}개 (별칭 걸린 것은 버셀이 건너뜁니다)`);
