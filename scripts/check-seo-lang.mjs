/**
 * SEO 언어 모듈 검증기
 *   node scripts/check-seo-lang.mjs [lang...]     (기본: scripts/seo-lang/ 에 존재하는 모든 언어)
 *
 * 문제가 있으면 exit 1. 형식은 scripts/seo-lang/README.md 참고.
 */

import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const langDir = join(here, 'seo-lang');
const ALL = ['de', 'es', 'fr', 'pt', 'zh'];
const SLUGS = ['sudoku', 'queens', 'jigsaw', 'snapspot'];
const SITE_NAME = { de: 'Puzzle Garden', es: 'Puzzle Garden', fr: 'Puzzle Garden', pt: 'Puzzle Garden', zh: '益智花園' };

const args = process.argv.slice(2);
const wanted = args.length ? args : ALL;
let errors = 0;
let warnings = 0;
const err = (lang, msg) => { errors++; console.error(`❌ [${lang}] ${msg}`); };
const warn = (lang, msg) => { warnings++; console.warn(`⚠️  [${lang}] ${msg}`); };

// 길이 범위 (문자 수, 코드포인트 기준). [하드 최소, 하드 최대, 권장 최소, 권장 최대]
const RANGES = {
  latin: { title: [35, 75, 55, 65], description: [100, 180, 120, 160] },
  zh: { title: [15, 40, 30, 35], description: [45, 100, 60, 90] },
};

const KOREAN = /[ᄀ-ᇿ㄰-㆏가-힣]/;
const KANA = /[぀-ヿ]/;
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const len = (s) => [...s].length;

/** 모듈 안의 모든 문자열 [경로, 값] */
const collect = (node, path = '', out = []) => {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) collect(v, path ? `${path}.${k}` : k, out);
  return out;
};

const load = async (file) => (await import(pathToFileURL(file).href + `?t=${Date.now()}`)).default;

const templateFile = join(langDir, '_template.mjs');
const template = existsSync(templateFile) ? await load(templateFile) : null;
const templateStrings = template ? new Set(collect(template).map(([, v]) => v.trim()).filter(v => v.length > 3)) : new Set();

const checkLang = async (lang) => {
  const file = join(langDir, `${lang}.mjs`);
  if (!existsSync(file)) {
    if (args.length) err(lang, `scripts/seo-lang/${lang}.mjs 가 없습니다`);
    return false;
  }
  let m;
  try { m = await load(file); } catch (e) { err(lang, `모듈을 불러오지 못했습니다: ${e.message}`); return true; }
  const before = errors;
  const zh = lang === 'zh';
  const R = zh ? RANGES.zh : RANGES.latin;

  if (!m || typeof m !== 'object') { err(lang, 'default export 가 객체가 아닙니다'); return true; }
  if (m.lang !== lang) err(lang, `lang 필드가 '${m.lang}' (파일명과 같은 '${lang}' 이어야 함)`);
  if (m.brand !== SITE_NAME[lang]) err(lang, `brand 는 '${SITE_NAME[lang]}' 이어야 합니다 (현재 '${m.brand}')`);
  if (!isStr(m.ui?.moreGames) || !isStr(m.ui?.homeLink)) err(lang, 'ui.moreGames / ui.homeLink 가 필요합니다');

  const checkMeta = (where, o) => {
    for (const f of ['title', 'description', 'keywords']) {
      if (!isStr(o?.[f])) { err(lang, `${where}.${f} 누락`); continue; }
      if (f === 'keywords') {
        if (o[f].split(',').filter(k => k.trim()).length < 4) warn(lang, `${where}.keywords 는 쉼표 구분 4개 이상 권장`);
        continue;
      }
      const n = len(o[f]);
      const [lo, hi, rlo, rhi] = R[f];
      if (n < lo || n > hi) err(lang, `${where}.${f} 길이 ${n} (허용 ${lo}–${hi}, 권장 ${rlo}–${rhi})`);
      else if (n < rlo || n > rhi) warn(lang, `${where}.${f} 길이 ${n} (권장 ${rlo}–${rhi})`);
    }
  };

  // --- 홈 ---
  const h = m.home;
  if (!h) err(lang, 'home 누락');
  else {
    checkMeta('home', h);
    for (const f of ['siteDescription', 'itemListName', 'h2', 'lead']) if (!isStr(h[f])) err(lang, `home.${f} 누락`);
    for (const s of SLUGS) if (!isStr(h.games?.[s])) err(lang, `home.games.${s} 누락`);
    if (!Array.isArray(h.blocks) || h.blocks.length < 2) err(lang, 'home.blocks 는 2개 이상');
    else h.blocks.forEach((b, i) => { if (!isStr(b?.h3) || !isStr(b?.p)) err(lang, `home.blocks[${i}] h3/p 누락`); });
    const linked = new Set([...(h.blocks ?? []).map(b => b?.p ?? '').join(' ').matchAll(/\[\[([a-z]+)\|/g)].map(x => x[1]));
    for (const s of SLUGS) if (!linked.has(s)) warn(lang, `home 본문에 [[${s}|…]] 링크가 없습니다`);
    for (const s of linked) if (!SLUGS.includes(s)) err(lang, `home 본문의 [[${s}|…]] 는 알 수 없는 슬러그`);
  }

  // --- 게임 페이지 ---
  const pages = m.pages ?? {};
  for (const extra of Object.keys(pages)) if (!SLUGS.includes(extra)) warn(lang, `알 수 없는 페이지 '${extra}' 는 무시됩니다`);
  for (const slug of SLUGS) {
    const p = pages[slug];
    if (!p) { err(lang, `pages.${slug} 누락 (5페이지 = 홈 + 4게임 필요)`); continue; }
    const where = `pages.${slug}`;
    if (!isStr(p.name)) err(lang, `${where}.name 누락`);
    checkMeta(where, p);
    if (!Array.isArray(p.faq) || p.faq.length < 4) err(lang, `${where}.faq 는 4쌍 이상 (현재 ${p.faq?.length ?? 0})`);
    else {
      if (p.faq.length > 8) warn(lang, `${where}.faq ${p.faq.length}쌍 — 4~6쌍 권장`);
      p.faq.forEach((pair, i) => {
        if (!Array.isArray(pair) || pair.length !== 2 || !isStr(pair[0]) || !isStr(pair[1])) err(lang, `${where}.faq[${i}] 는 [질문, 답변] 문자열 쌍이어야 함`);
      });
    }
    if (!Array.isArray(p.sections) || p.sections.length < 1) err(lang, `${where}.sections 누락`);
    else {
      let blocks = 0;
      p.sections.forEach((s, i) => {
        if (!isStr(s?.h2) || !isStr(s?.lead)) err(lang, `${where}.sections[${i}] h2/lead 누락`);
        (s?.blocks ?? []).forEach((b, j) => {
          blocks++;
          if (!isStr(b?.h3) || !isStr(b?.p)) err(lang, `${where}.sections[${i}].blocks[${j}] h3/p 누락`);
        });
      });
      if (blocks < 2) err(lang, `${where} 본문 블록(h3+p)은 2개 이상 (현재 ${blocks})`);
      if (blocks > 4) warn(lang, `${where} 본문 블록 ${blocks}개 — 2~3개 권장`);
    }
  }

  // --- 문자열 단위 검사 ---
  const strings = collect(m);
  for (const [path, v] of strings) {
    if (KOREAN.test(v)) err(lang, `${path}: 한글이 들어 있습니다 → ${v.slice(0, 40)}`);
    if (KANA.test(v)) err(lang, `${path}: 일본어 가나가 들어 있습니다 → ${v.slice(0, 40)}`);
    if (/<\s*\/?\s*script/i.test(v) || /javascript:/i.test(v) || /\son\w+\s*=/i.test(v)) err(lang, `${path}: <script>/이벤트 핸들러 주입 의심`);
    if (/�/.test(v)) err(lang, `${path}: 깨진 문자(�)`);
    if (/\b(TODO|TRANSLATE|FIXME)\b/.test(v)) err(lang, `${path}: 번역 표식(TODO/TRANSLATE) 남아 있음`);
    if (/&(amp|quot|lt|gt|#\d+|#x[0-9a-f]+);/i.test(v)) err(lang, `${path}: 이미 이스케이프된 엔티티가 있습니다 — 평문으로 쓰세요(빌더가 이스케이프)`);
    // 본문(lead/p)은 <strong> 만 허용, 그 외 필드는 태그 불가
    const isBody = /\.(lead|p)$/.test(path);
    const stripped = isBody ? v.replace(/<\/?strong>/g, '') : v;
    if (/[<>]/.test(stripped)) err(lang, `${path}: 허용되지 않는 '<' '>' (본문은 <strong> 만 가능)`);
    if (isBody) {
      const open = (v.match(/<strong>/g) ?? []).length;
      const close = (v.match(/<\/strong>/g) ?? []).length;
      if (open !== close) err(lang, `${path}: <strong> 여닫기 불일치`);
    }
    if (/^\s|\s$/.test(v)) warn(lang, `${path}: 앞뒤 공백`);
  }

  // --- 템플릿(영어) 잔존 검사 ---
  const checkable = strings.filter(([path, v]) => path !== 'lang' && v.trim().length > 3 && !/^(brand)$/.test(path));
  const same = checkable.filter(([, v]) => templateStrings.has(v.trim()));
  const ratio = checkable.length ? same.length / checkable.length : 0;
  if (ratio > 0.4) err(lang, `템플릿(영어)과 동일한 문자열이 ${(ratio * 100).toFixed(0)}% (${same.length}/${checkable.length}) — 번역이 덜 됐습니다`);
  else if (same.length) warn(lang, `템플릿과 동일한 문자열 ${same.length}개 (${same.slice(0, 3).map(([p]) => p).join(', ')} …)`);

  // --- 빌드 결과 검사 (속성 이스케이프, JSON-LD) — 구조 오류가 없을 때만 ---
  if (errors === before) {
    try {
      const { routes } = await import(pathToFileURL(join(here, 'seo-routes.mjs')).href);
      const mine = routes.filter(r => r.lang === lang);
      if (mine.length !== 5) err(lang, `빌드된 라우트가 ${mine.length}개 (5개여야 함)`);
      for (const r of mine) {
        for (const f of ['title', 'description', 'keywords']) {
          if (r[f] != null && (/"/.test(r[f]) || /[<>]/.test(r[f]))) err(lang, `${r.path}.${f}: 속성 안에 이스케이프되지 않은 따옴표/꺾쇠`);
        }
        for (const s of [r.breadcrumbSchema, r.softwareSchema, r.faqSchema, ...(r.extraSchemas ?? [])]) {
          if (!s) continue;
          try { JSON.parse(s); } catch { err(lang, `${r.path}: JSON-LD 파싱 실패`); }
          if (/<\/?script/i.test(s)) err(lang, `${r.path}: JSON-LD 에 <script 포함`);
        }
        if (/<script/i.test(r.seoContent ?? '')) err(lang, `${r.path}: noscript 본문에 <script 포함`);
      }
    } catch (e) {
      err(lang, `seo-routes.mjs 빌드 실패: ${e.message}`);
    }
  }

  console.log(errors === before ? `✅ [${lang}] OK` : `✖ [${lang}] ${errors - before} error(s)`);
  return true;
};

let checked = 0;
for (const lang of wanted) {
  if (!ALL.includes(lang)) { err(lang, `알 수 없는 언어 (${ALL.join('|')})`); continue; }
  if (await checkLang(lang)) checked++;
}
if (!checked && !errors) console.log('검사할 언어 모듈이 없습니다 (scripts/seo-lang/<lang>.mjs)');
console.log(`\n${checked} module(s) checked, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
