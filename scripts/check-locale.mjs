/**
 * 번역 JSON 검증 — 새 언어(de/es/fr/pt/zh 등)의 src/locales/<lang>/*.json 이 빠짐없이, 형식이 맞게 채워졌는지 본다.
 *
 *   node scripts/check-locale.mjs de            # 한 언어
 *   node scripts/check-locale.mjs de es fr      # 여러 언어
 *   node scripts/check-locale.mjs de --ns=sudoku,queens   # 네임스페이스만
 *
 * 기준(필수 키) = ko 와 en 의 키 합집합. 한국어 전용 기능(전자금융 약관, 환불 조항, PortOne 행 등 —
 * 해외판에서는 화면에 안 나온다)은 번역하지 않아도 된다(IGNORE). 못 채운 키는 영어로 보이므로 화면이 깨지진 않는다.
 * 오류가 있으면 종료 코드 1.
 */
import { readFileSync, existsSync } from 'fs';

const NAMESPACES = ['common', 'landing', 'sudoku', 'queens', 'jigsaw', 'snapspot', 'modals', 'daily'];
const ROOT = 'src/locales';

// 해외판에서 화면에 나오지 않는 키(접두사). 번역 생략 가능.
const IGNORE_PREFIXES = {
    common: ['language.enBanner', 'language.jaBanner', 'language.ko', 'language.en', 'language.ja'], // 새 언어 선택 UI 가 코드 상수를 써서 안 쓰이는 키
    modals: [
        'terms.title.finance',
        'terms.finance',
        'terms.service.refund',
        'terms.privacy.outsourcing.portone',
        'coinShop.starterDiscount',
        'coinShop.toast.paymentCancelled',
    ],
};

const PLURAL_RE = /_(zero|one|two|few|many|other)$/;
const hasPlurals = (lang) => !['zh', 'ja', 'ko'].includes(lang); // zh·ja·ko 는 복수형 없음(_other 만)

const read = (lang, ns) => {
    const f = `${ROOT}/${lang}/${ns}.json`;
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, 'utf8'));
};

function flat(o, p = '', out = {}) {
    for (const k of Object.keys(o)) {
        const v = o[k];
        const key = p ? `${p}.${k}` : k;
        if (v && typeof v === 'object') flat(v, key, out);
        else out[key] = v;
    }
    return out;
}

/** 복수형 접미사를 뗀 기본 키 → 변형 목록 */
function groupPlurals(flatObj) {
    const g = {};
    for (const k of Object.keys(flatObj)) {
        const base = k.replace(PLURAL_RE, '');
        (g[base] ??= {})[k === base ? '_' : k.slice(base.length + 1)] = flatObj[k];
    }
    return g;
}

const vars = (s) => new Set([...String(s).matchAll(/\{\{\s*([^}\s,]+)[^}]*\}\}/g)].map((m) => m[1]));
const tags = (s) => new Set([...String(s).matchAll(/<\/?\s*([a-zA-Z][\w-]*)\s*\/?>/g)].map((m) => m[1]));
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const pick = (variants) => variants.other ?? variants._ ?? variants.one ?? Object.values(variants)[0];

const HANGUL = /[가-힣]/;
const KANA = /[぀-ゟ゠-ヺー-ヿ]/; // ・(U+30FB, 가운뎃점)은 중국어에서도 쓰므로 가나로 안 센다
const CJK = /[一-鿿]/;
// 간체에만 있는 글자(번체 번역에 섞이면 오류) — 번체와 겹치는 글자는 뺐다.
const SIMPLIFIED = /[这们个说时间开关设点击录钱币买谜题戏认证还对给过动获请进选择区体验页须带显网络账号码联统计]/;

const args = process.argv.slice(2);
const nsArg = args.find((a) => a.startsWith('--ns='));
const nsList = nsArg ? nsArg.slice(5).split(',') : NAMESPACES;
const langs = args.filter((a) => !a.startsWith('--'));
if (!langs.length) { console.error('사용법: node scripts/check-locale.mjs <lang> [lang...] [--ns=a,b]'); process.exit(2); }

let totalErr = 0, totalWarn = 0;
for (const lang of langs) {
    for (const ns of nsList) {
        const ko = read('ko', ns), en = read('en', ns), tg = read(lang, ns);
        const jaG = lang === 'ja' ? {} : groupPlurals(flat(read('ja', ns) ?? {}));
        const errs = [], warns = [];
        if (!tg) { console.log(`❌ [${lang}/${ns}] 파일 없음`); totalErr++; continue; }
        const koG = groupPlurals(flat(ko)), enG = groupPlurals(flat(en)), tgG = groupPlurals(flat(tg));
        const ignored = (IGNORE_PREFIXES[ns] ?? []);
        const isIgnored = (k) => ignored.some((p) => k === p || k.startsWith(p + '.') || k.startsWith(p));
        const required = [...new Set([...Object.keys(koG), ...Object.keys(enG)])].filter((k) => !isIgnored(k));

        let sameAsEn = 0, comparable = 0;
        for (const base of required) {
            const t = tgG[base];
            if (!t) { errs.push(`누락: ${base}`); continue; }
            const ref = enG[base] ?? koG[base];
            const refStr = pick(ref);
            // 변수·태그는 ko / en / ja 중 어느 한 쪽과 같으면 통과(코드가 변수를 여럿 넘기는 문구가 있어서)
            const refs = [koG[base], enG[base], jaG[base]].filter(Boolean).map(pick);
            // 복수형 요구사항: en 이 _one 을 가지면 대상(비 zh)도 _one + _other
            if (enG[base] && enG[base].one !== undefined) {
                if (!(t.other ?? t._)) errs.push(`복수형 _other 누락: ${base}`);
                else if (hasPlurals(lang) && t.one === undefined) errs.push(`복수형 _one 누락: ${base}`);
            }
            for (const [form, val] of Object.entries(t)) {
                const k = form === '_' ? base : `${base}_${form}`;
                if (typeof val !== 'string') { errs.push(`문자열 아님: ${k}`); continue; }
                if (val.trim() === '') { if (![koG[base], enG[base], jaG[base]].filter(Boolean).map(pick).includes('')) errs.push(`빈 문자열: ${k}`); continue; }
                if (/^[a-z]+(\.[A-Za-z0-9_]+)+$/.test(val)) errs.push(`키 이름 그대로: ${k} = ${val}`);
                if (HANGUL.test(val) && lang !== 'ko') errs.push(`한글 포함: ${k} = ${val.slice(0, 40)}`);
                if (lang === 'zh') {
                    if (KANA.test(val)) errs.push(`가나 포함: ${k}`);
                    if (SIMPLIFIED.test(val)) errs.push(`간체 글자 의심: ${k} = ${val.slice(0, 40)}`);
                } else if (lang !== 'ja' && (CJK.test(val) || KANA.test(val))) {
                    errs.push(`한자/가나 포함: ${k} = ${val.slice(0, 40)}`);
                }
                if (!refs.some((r) => setEq(vars(val), vars(r)))) errs.push(`{{변수}} 불일치: ${k} (원문 ${refs.map((r) => '[' + [...vars(r)] + ']').join(' ')} / 번역 [${[...vars(val)]}])`);
                if (!refs.some((r) => setEq(tags(val), tags(r)))) errs.push(`<태그> 불일치: ${k} (원문 ${refs.map((r) => '[' + [...tags(r)] + ']').join(' ')} / 번역 [${[...tags(val)]}])`);
            }
            const enStr = enG[base] ? pick(enG[base]) : null;
            if (enStr && /[A-Za-z]{4,}/.test(enStr) && !/^(brand$|games.)/.test(base)) { // 브랜드·게임 이름은 원래 영어 그대로라 비교에서 뺀다
                comparable++;
                if (pick(t) === enStr) sameAsEn++;
            }
        }
        for (const base of Object.keys(tgG)) {
            if (!koG[base] && !enG[base]) warns.push(`기준에 없는 키: ${base}`);
        }
        if (comparable >= 8 && sameAsEn / comparable > 0.35) {
            errs.push(`영어와 같은 문자열이 ${sameAsEn}/${comparable}개 (${Math.round((100 * sameAsEn) / comparable)}%) — 번역 안 한 게 많아 보임`);
        } else if (comparable >= 8 && sameAsEn / comparable > 0.15) {
            warns.push(`영어와 같은 문자열 ${sameAsEn}/${comparable}개`);
        }

        const n = required.length;
        if (errs.length) {
            console.log(`❌ [${lang}/${ns}] 오류 ${errs.length}개 (필수 키 ${n})`);
            errs.slice(0, 25).forEach((e) => console.log('   -', e));
            if (errs.length > 25) console.log(`   … 외 ${errs.length - 25}개`);
        } else {
            console.log(`✅ [${lang}/${ns}] OK (필수 키 ${n})`);
        }
        warns.slice(0, 8).forEach((w) => console.log('   ⚠', w));
        totalErr += errs.length; totalWarn += warns.length;
    }
}
console.log(`\n${langs.length}개 언어 × ${nsList.length}개 네임스페이스 검사: 오류 ${totalErr}개, 경고 ${totalWarn}개`);
process.exit(totalErr ? 1 : 0);
