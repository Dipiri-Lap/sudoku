/**
 * public/ 에서 **아무도 안 쓰는 큰 파일**을 찾는다.
 *
 * public 은 통째로 빌드 결과에 복사된다. 그래서 화면에서 쓰지 않는 원본 시트나
 * 옛 로고가 거기 남아 있으면 배포마다 그만큼씩 함께 실린다 - 배포 저장소가
 * 차는 이유의 절반이 이런 것들이었다.
 *
 *   node scripts/audit-assets.mjs         200KB 이상만
 *   node scripts/audit-assets.mjs 50      50KB 이상
 *
 * "참조 없음"은 **정적 검색 결과일 뿐**이다. 문자열을 조립해서 쓰는 경로
 * (`/icons/${name}.png`)는 못 찾으므로, 지우기 전에 눈으로 한 번 더 봐야 한다.
 */
import fs from 'fs';
import path from 'path';

const MIN_KB = Number(process.argv[2]) || 200;
const PUBLIC = 'public';
const SEARCH_DIRS = ['src', 'scripts', 'index.html', 'vite.config.ts'];

/** 참조를 찾을 텍스트를 전부 모아 한 덩어리로 만든다 */
function corpus() {
  const chunks = [];
  const walk = p => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isFile()) {
      if (/\.(ts|tsx|js|jsx|mjs|cjs|json|html|css|webmanifest)$/.test(p)) {
        chunks.push(fs.readFileSync(p, 'utf8'));
      }
      return;
    }
    for (const f of fs.readdirSync(p)) walk(path.join(p, f));
  };
  SEARCH_DIRS.forEach(walk);
  return chunks.join('\n');
}

function files(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) files(p, out);
    else out.push({ path: p, size: st.size, name: f });
  }
  return out;
}

const text = corpus();
const all = files(PUBLIC).filter(f => f.size >= MIN_KB * 1024);

const unused = [];
const used = [];
for (const f of all) {
  // 파일 이름으로 찾는다. 경로 전체로 찾으면 폴더 구조가 바뀔 때마다 놓친다.
  (text.includes(f.name) ? used : unused).push(f);
}

const mb = n => (n / 1048576).toFixed(2) + 'MB';
const sum = a => a.reduce((s, f) => s + f.size, 0);

console.log(`public/ 에서 ${MIN_KB}KB 이상 파일 ${all.length}개, 합계 ${mb(sum(all))}\n`);

console.log(`◆ 참조를 못 찾은 것 ${unused.length}개 — 합계 ${mb(sum(unused))}`);
unused
  .sort((a, b) => b.size - a.size)
  .forEach(f => console.log(`   ${mb(f.size).padStart(8)}  ${f.path}`));

console.log(`\n◇ 쓰이는 것 ${used.length}개 — 합계 ${mb(sum(used))} (큰 것부터 10개)`);
used
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .forEach(f => console.log(`   ${mb(f.size).padStart(8)}  ${f.path}`));

console.log('\n※ 문자열을 조립해 쓰는 경로는 못 찾는다. 지우기 전에 확인할 것.');
