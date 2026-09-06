/**
 * lucide 아이콘(ISC, 이미 이 프로젝트의 의존성) → 노노그램 소스용 흑백 PNG.
 *
 * 아이콘은 벡터라 원하는 해상도로 그릴 수 있고, 선 굵기를 직접 정할 수 있다.
 * 노노그램은 선이 한 칸 두께면 힌트가 잘게 쪼개져 못 푸는데, 여기서 굵기를 키워 렌더하면
 * 축소한 격자에서 이미 선이 두 칸이 되어 그 문제가 애초에 생기지 않는다.
 *
 * 렌더는 Playwright 헤드리스 브라우저로 한다(SVG 를 정확히 그리는 가장 확실한 방법).
 *
 *   node scripts/nonogram-icon-render.mjs <아이콘이름...> [--stroke 2.6] [--size 600] [--out dir] [--outline]
 *   예) node scripts/nonogram-icon-render.mjs umbrella rocket cat --stroke 2.8
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const names = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const STROKE = Number(opt('stroke', 2.6));
const SIZE = Number(opt('size', 600));
const OUT = opt('out', 'generated-images/icons');
const FILL = !args.includes('--outline'); // 기본은 실루엣, --outline 이면 선화
if (names.length === 0) {
  console.error('usage: nonogram-icon-render.mjs <icon-name...> [--stroke 2.6] [--size 600] [--out dir]');
  process.exit(1);
}

const ICON_DIR = 'node_modules/lucide-react/dist/esm/icons';
/** 아이콘 모듈에서 __iconNode 배열(태그와 속성 쌍)을 읽는다. 별칭 파일이면 원본을 따라간다 */
async function iconNode(name, depth = 0) {
  const file = path.join(ICON_DIR, `${name}.js`);
  if (!fs.existsSync(file)) throw new Error(`아이콘 없음: ${name}`);
  // 예: ice-cream.js 는 `export { default } from './ice-cream-cone.js'` 뿐이라 __iconNode 가 없다
  const alias = fs.readFileSync(file, 'utf-8').match(/export \{ default \} from '\.\/([\w-]+)\.js'/);
  if (alias && depth < 4) return iconNode(alias[1], depth + 1);
  const mod = await import(path.resolve(file).replace(/\\/g, '/').replace(/^/, 'file:///'));
  if (!mod.__iconNode) throw new Error(`아이콘 데이터를 못 읽음: ${name}`);
  return mod.__iconNode;
}

/** SVG 마크업으로 만든다 */
async function iconSvg(name) {
  const __iconNode = await iconNode(name);
  const body = __iconNode.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a} />`;
  }).join('');
  // 선으로만 그리면(fill=none) 굵힐 때 인접한 선끼리 붙어 속이 메워지고 형태가 덩어리가 된다.
  // 노노그램 그림은 실루엣이라야 낮은 해상도에서 한눈에 읽히므로 FILL 을 기본으로 둔다.
  const paint = FILL
    ? `fill="#000" stroke="#000" stroke-width="${STROKE}"`
    : `fill="none" stroke="#000" stroke-width="${STROKE}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"
    ${paint} stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
for (const name of names) {
  const svg = await iconSvg(name);
  // 안티앨리어싱된 회색은 뒤 파이프라인에서 절반 임계로 걸러지므로 그대로 둔다
  await page.setContent(`<style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg}`);
  const out = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: out });
  console.log(`${name} → ${out}  (stroke ${STROKE}, ${SIZE}px)`);
}
await browser.close();
