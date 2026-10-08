// 인덱싱 카드 규칙 시뮬레이터 (게임 코드와 독립). 사용법:
//   node scripts/sim-indexed.mjs [--trials 200] [--budget 20000] [--slots 4] [--seed 1]
// 레벨 데이터에서 슬롯 수가 같은 레벨을 무작위로 골라, 카테고리 하나를 "인덱싱" 카테고리로 지정하고
// 배치(랜덤/정렬) × 스택 규칙 조합마다 풀이 가능 비율을 측정한다.
// 풀이기는 휴리스틱 best-first 탐색이며, 덱 재활용은 셔플 없이 같은 순서로 되돌린다고 가정(낙관적 근사).
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const TRIALS = +(args.trials ?? 200);
let BUDGET = +(args.budget ?? 20000);
const SLOTS = +(args.slots ?? (args.level ? (JSON.parse(fs.readFileSync('src/features/word-sort/data/levels.json', 'utf8')).find((l) => l.id === +args.level)?.slots ?? 4) : 4));
let seed = +(args.seed ?? 1);
const PREFIX = (args.prefix ?? '1') === '1'; // 슬롯에 묶음을 끌 때 맞는 앞부분만 받기
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const raw = JSON.parse(fs.readFileSync('src/features/word-sort/data/levels.json', 'utf8'));
const allLevels = Array.isArray(raw) ? raw : raw.levels;
const levels = args.level ? allLevels.filter((l) => l.id === +args.level) : allLevels.filter((l) => l.slots === SLOTS);
const W = +(args.w ?? 0.6); // 이동 수 가중치(클수록 짧은 풀이 선호)

// ---- 배치 (START_LEVEL 복제) ----
// 카드: {id, type:'c'|'w', cat, idx}  idx: 인덱싱 카테고리의 단어 번호(1..n), 카테고리 카드는 0
function deal(level, indexedCatPos) {
    const cards = [];
    const cats = level.categories;
    const catCards = [], wordCards = [];
    cats.forEach((c, ci) => {
        const isIdx = ci === indexedCatPos;
        catCards.push({ id: cards.length, type: 'c', cat: ci, idx: 0, indexed: isIdx }); cards.push(catCards[catCards.length - 1]);
        c.words.forEach((w, wi) => { const card = { id: cards.length, type: 'w', cat: ci, idx: isIdx ? wi + 1 : 0, indexed: isIdx }; wordCards.push(card); cards.push(card); });
    });
    shuffle(catCards); shuffle(wordCards);
    const stackCounts = Array.from({ length: SLOTS }, (_, i) => i + 3);
    const totalStack = stackCounts.reduce((a, b) => a + b, 0);
    const maxCat = Math.floor((catCards.length - 1) / 2) + 1;
    const catInStack = 2 + Math.floor(rnd() * (maxCat - 2 + 1));
    const stackCat = catCards.splice(0, catInStack);
    const stackWord = wordCards.splice(0, totalStack - catInStack);
    const stackCards = shuffle([...stackCat, ...stackWord]);
    const deck = shuffle([...catCards, ...wordCards]);
    const stacks = stackCounts.map((n) => { const s = []; for (let i = 0; i < n; i++) s.push(stackCards.pop()); return s; });
    return { cards, stacks, deck };
}
// 같은 배치를 복제해서 인덱싱 카드만 더미 안에서 정렬
function sortedCopy(d) {
    const keyOf = (c) => (c.type === 'c' ? 0 : c.idx);
    const sortPile = (pile) => {
        const pos = []; pile.forEach((c, i) => { if (c.indexed) pos.push(i); });
        const sorted = pos.map((i) => pile[i]).sort((a, b) => keyOf(b) - keyOf(a)); // 아래→위(또는 먼저→나중) 큰 번호부터
        pos.forEach((p, i) => { pile[p] = sorted[i]; });
    };
    const stacks = d.stacks.map((x) => x.slice()); const deck = d.deck.slice();
    stacks.forEach(sortPile); sortPile(deck);
    return { cards: d.cards, stacks, deck };
}

// ---- 규칙 ----
function makeRules(stackRule) {
    // 위에 얹는 카드 m(아래쪽 카드)을 t 위에 쌓을 수 있는가 (같은 카테고리 전제)
    const pairOK = (upper, lower) => { // upper가 lower 바로 위
        if (!upper.indexed) return true;
        if (stackRule === 'none') return true;
        if (stackRule === 'desc_any') return upper.idx < lower.idx;
        if (stackRule === 'desc_consec') return upper.idx === lower.idx - 1;
        if (stackRule === 'asc_consec') return upper.idx === lower.idx + 1;
        return true;
    };
    return { pairOK };
}

// ---- 상태 / 풀이 ----
// 상태: stacks: number[][] (id*2+revealed), deck:number[], waste:number[], slots:number[] (-1 | cat*64+count/next)
function solve(level, d, stackRule, extraStack, slotOrdered) {
    const { cards } = d;
    const cats = level.categories;
    const { pairOK } = makeRules(stackRule);
    const C = (e) => cards[e >> 1];
    const mk = (stacks, deck, waste, slots, steps, placed) => ({ stacks, deck, waste, slots, steps, placed });
    const init = mk(d.stacks.map((s) => s.map((c, i) => c.id * 2 + (i === s.length - 1 ? 1 : 0))).concat(extraStack ? [[]] : []),
        d.deck.map((c) => c.id * 2 + 1), [], Array(SLOTS).fill(-1), 0, 0);
    const keyOf = (s) => s.stacks.map((x) => x.join(',')).join('|') + '/' + s.deck.join(',') + '/' + s.waste.join(',') + '/' + s.slots.join(',');
    const isWin = (s) => s.stacks.every((x) => x.length === 0) && s.deck.length === 0 && s.waste.length === 0;
    const score = (s) => s.steps * W - s.placed * 8 - s.stacks.reduce((a, x) => a + (x.length && x[x.length - 1] & 1 ? 0 : 0), 0);

    const groupsOf = (st) => { // 스택 꼭대기에서 같은 카테고리·앞면·규칙 만족하는 접미 그룹들
        const res = []; const n = st.length; if (!n) return res;
        for (let k = 1; k <= n; k++) {
            const e = st[n - k]; if (!(e & 1)) break;
            const card = C(e);
            if (k > 1) { const above = C(st[n - k + 1]); if (above.cat !== card.cat || card.type === 'c' || !pairOK(above, card)) break; }
            res.push(k);
        }
        return res;
    };
    const applyRemove = (st, k) => { const ns = st.slice(0, st.length - k); if (ns.length && !(ns[ns.length - 1] & 1)) ns[ns.length - 1] |= 1; return ns; };

    function moves(s) {
        const out = [];
        // 출발지: 각 스택 그룹 / 뽑은 더미 꼭대기
        const sources = [];
        s.stacks.forEach((st, si) => groupsOf(st).forEach((k) => sources.push({ kind: 's', si, k, cs: st.slice(st.length - k).map(C) })));
        if (s.waste.length) sources.push({ kind: 'w', k: 1, cs: [C(s.waste[s.waste.length - 1])] });
        const emptySlot = s.slots.indexOf(-1);
        for (const src of sources) {
            const bottom = src.cs[0];
            // → 슬롯
            if (bottom.type === 'c') {
                if (src.k === 1 && emptySlot !== -1) { const slots = s.slots.slice(); slots[emptySlot] = bottom.cat * 64; out.push({ src, slots, placed: 1 }); }
            } else {
                const si2 = s.slots.findIndex((v) => v !== -1 && (v >> 6) === bottom.cat);
                if (si2 !== -1) {
                    const have = s.slots[si2] & 63;
                    let take = src.k;
                    if (bottom.indexed && slotOrdered) {
                        let p = 0; while (p < src.k && src.cs[p].idx === have + 1 + p) p++;
                        take = PREFIX ? p : (p === src.k ? p : 0);
                    }
                    if (take > 0) {
                        const slots = s.slots.slice(); const nc = have + take;
                        slots[si2] = nc >= cats[bottom.cat].words.length ? -1 : bottom.cat * 64 + nc;
                        out.push({ src, slots, placed: take, take });
                    }
                }
            }
            // → 스택
            let emptyDone = false;
            s.stacks.forEach((t, ti) => {
                if (src.kind === 's' && src.si === ti) return;
                if (t.length === 0) {
                    if (emptyDone) return; emptyDone = true;
                    if (src.kind === 's' && src.k === s.stacks[src.si].length) return; // 의미 없는 이동
                    out.push({ src, to: ti, placed: 0 });
                } else {
                    const top = C(t[t.length - 1]);
                    if (top.type === 'c' || top.cat !== bottom.cat) return;
                    if (bottom.type === 'c') return;
                    if (!pairOK(bottom, top)) return;
                    out.push({ src, to: ti, placed: 0 });
                }
            });
        }
        return out;
    }
    function apply(s, m) {
        const stacks = s.stacks.slice(); let waste = s.waste;
        const moved = m.src.kind === 's' ? s.stacks[m.src.si].slice(s.stacks[m.src.si].length - m.src.k) : [s.waste[s.waste.length - 1]];
        if (m.src.kind === 's') {
            const st = s.stacks[m.src.si]; const take = m.take ?? m.src.k;
            if (take < m.src.k) { const cut = st.length - m.src.k; stacks[m.src.si] = st.slice(0, cut).concat(st.slice(cut + take)); } // 아래쪽 take장만 빠지고 위쪽은 남음
            else stacks[m.src.si] = applyRemove(st, m.src.k);
        } else waste = s.waste.slice(0, -1);
        let slots = s.slots;
        if (m.slots) slots = m.slots; else stacks[m.to] = stacks[m.to].concat(moved.map((e) => e | 1));
        return mk(stacks, s.deck, waste, slots, s.steps + 1, s.placed + m.placed);
    }
    function draws(s) {
        if (s.deck.length) return mk(s.stacks, s.deck.slice(1), s.waste.concat([s.deck[0]]), s.slots, s.steps + 1, s.placed);
        if (s.waste.length) {
            let deck = s.waste.slice();
            if (d.sortPile && d.cardsIndexedOnly) { /* 재활용 시 재정렬은 옵션 (미사용) */ }
            return mk(s.stacks, deck, [], s.slots, s.steps + 1, s.placed);
        }
        return null;
    }

    // best-first (이진 힙)
    const heap = []; const push = (n) => { n.p = score(n); heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].p <= heap[i].p) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0]; const l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a].p < heap[m].p) m = a; if (b < heap.length && heap[b].p < heap[m].p) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    const seen = new Map(); push(init); seen.set(keyOf(init), 0);
    let nodes = 0, bestSteps = null;
    while (heap.length && nodes < BUDGET) {
        const s = pop(); nodes++;
        if (isWin(s)) { bestSteps = s.steps; break; }
        const next = [];
        for (const m of moves(s)) next.push(apply(s, m));
        const dr = draws(s); if (dr) next.push(dr);
        for (const n of next) {
            const k = keyOf(n); const prev = seen.get(k);
            if (prev !== undefined && prev <= n.steps) continue;
            seen.set(k, n.steps); push(n);
        }
    }
    const exhausted = heap.length === 0 && bestSteps === null; // 모든 상태 탐색 완료 → 확정 불가능(근사 모델 기준)
    return { solved: bestSteps !== null, steps: bestSteps, exhausted, nodes };
}

// ---- 실행 (같은 배치를 기준/규칙/정렬로 짝지어 비교) ----
const configs = args.level ? [{ name: `레벨 ${args.level} 실제 규칙(정렬배치+스택자유+부분배치)`, sorted: true, rule: 'none' }] : [
    { name: '랜덤배치 + 스택규칙 없음', sorted: false, rule: 'none' },
    { name: '정렬배치 + 스택규칙 없음', sorted: true, rule: 'none' },
    { name: '랜덤배치 + 내림차순(아무거나)', sorted: false, rule: 'desc_any' },
    { name: '정렬배치 + 내림차순(아무거나)', sorted: true, rule: 'desc_any' },
    { name: '랜덤배치 + 오름차순 연속(원안)', sorted: false, rule: 'asc_consec' },
    { name: '정렬배치 + 오름차순 연속(원안)', sorted: true, rule: 'asc_consec' },
    { name: '랜덤배치 + 내림차순 연속', sorted: false, rule: 'desc_consec' },
    { name: '정렬배치 + 내림차순 연속', sorted: true, rule: 'desc_consec' },
];
const extra = args.extra === '1';
console.log(`슬롯 ${SLOTS} | 레벨 후보 ${levels.length}개 | 시행 ${TRIALS} | 탐색 예산 ${BUDGET} | 빈 스택 추가 ${extra ? 'O' : 'X'}`);
const t0 = Date.now();
const stat = configs.map(() => ({ solved: 0, induced: 0, rescued: 0, steps: 0 }));
const bySize = {}; let baseSolved = 0; const baseSteps = [], cfgSteps = [];
for (let t = 0; t < TRIALS; t++) {
    const level = levels[Math.floor(rnd() * levels.length)];
    const cand = args.level ? [level.categories.findIndex((c) => c.ordered)] : level.categories.map((c, i) => [c, i]).filter(([c]) => c.words.length >= 3 && c.words.length <= (args.maxsize ? +args.maxsize : 6)).map(([, i]) => i);
    const d = deal(level, cand[Math.floor(rnd() * cand.length)]);
    const ds = sortedCopy(d);
    const base = solve(level, d, 'none', extra, false); // 인덱싱 규칙이 전혀 없는 같은 배치
    if (base.solved) { baseSolved++; baseSteps.push(base.steps); }
    const szKey = level.categories.find((c, ci) => d.cards.some((cd) => cd.indexed && cd.cat === ci))?.words.length;
    configs.forEach((cfg, i) => {
        const r = solve(level, cfg.sorted ? ds : d, cfg.rule, extra, true);
        if (args.bysize && i === 1) { const b = (bySize[szKey] ??= { n: 0, solved: 0, induced: 0, steps: 0, bsteps: 0, bn: 0 }); b.n++; if (r.solved) { b.solved++; b.steps += r.steps; } if (base.solved) { b.bn++; b.bsteps += base.steps; } if (base.solved && !r.solved) b.induced++; }
        const st = stat[i];
        if (r.solved) { st.solved++; st.steps += r.steps; cfgSteps.push(r.steps); }
        if (base.solved && !r.solved) {
            st.induced++;
            if (args.recheck) { // 유발 실패로 분류된 판을 큰 예산으로 재탐색 → 예산 부족이었는지 확인
                const keep = BUDGET; BUDGET = keep * +args.recheck;
                const r2 = solve(level, cfg.sorted ? ds : d, cfg.rule, extra, true);
                BUDGET = keep; if (r2.solved) st.recovered = (st.recovered || 0) + 1;
            }
        }
        if (!base.solved && r.solved) st.rescued++;
    });
}
const pct = (n) => +(n / TRIALS * 100).toFixed(1);
console.log(`기준(인덱싱 규칙 없음) 풀림: ${pct(baseSolved)}% — 이 값이 100에 못 미치는 건 솔버 한계/원래 막힌 판`);
console.table(configs.map((c, i) => ({ 구성: c.name, '풀림%': pct(stat[i].solved), '규칙유발실패%': pct(stat[i].induced), '반대로구제%': pct(stat[i].rescued), '재탐색복구%': pct(stat[i].recovered || 0), 평균이동: stat[i].solved ? +(stat[i].steps / stat[i].solved).toFixed(1) : null })));
if (args.level) { const q = (a, p) => { const x = a.slice().sort((m, n) => m - n); return x[Math.min(x.length - 1, Math.floor(x.length * p))]; }; const av = (a) => (a.reduce((m, n) => m + n, 0) / a.length).toFixed(1); const lv = levels[0]; console.log(`maxMoves=${lv.maxMoves}`); console.table([{ 구분: '순서 규칙 없음(기준)', n: baseSteps.length, 평균: av(baseSteps), 중앙: q(baseSteps, 0.5), 하위10: q(baseSteps, 0.1), 상위90: q(baseSteps, 0.9), 'maxMoves이내%': +(baseSteps.filter((v) => v <= lv.maxMoves).length / TRIALS * 100).toFixed(1) }, { 구분: '순서 규칙 적용(실제)', n: cfgSteps.length, 평균: av(cfgSteps), 중앙: q(cfgSteps, 0.5), 하위10: q(cfgSteps, 0.1), 상위90: q(cfgSteps, 0.9), 'maxMoves이내%': +(cfgSteps.filter((v) => v <= lv.maxMoves).length / TRIALS * 100).toFixed(1) }]); }
if (args.bysize) console.table(Object.entries(bySize).sort((a, b) => a[0] - b[0]).map(([k, b]) => ({ 순서카테고리_단어수: +k, 판수: b.n, '풀림%': +(b.solved / b.n * 100).toFixed(1), '규칙유발실패%': +(b.induced / b.n * 100).toFixed(1), 평균이동: +(b.steps / b.solved).toFixed(1), 기준평균이동: +(b.bsteps / b.bn).toFixed(1) })));
console.log(`소요 ${(Date.now() - t0) / 1000}s | 규칙유발실패=기준은 풀렸는데 해당 구성에서는 못 푼 판, 반대로구제=그 반대(솔버 노이즈 지표)`);
