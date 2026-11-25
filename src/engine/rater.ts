/**
 * 9×9 스도쿠 기법 난이도 채점기.
 *
 * 사람이 쓰는 기법을 쉬운 것부터 순서대로 적용해 끝까지 풀어 보고,
 * 그 과정에서 "반드시 써야 했던" 가장 어려운 기법 단계를 돌려준다.
 *
 *   1 = 싱글(히든/네이키드)만
 *   2 = 교차 후보 제거(Locked Candidates) 필요
 *   3 = 페어/트리플(Naked·Hidden Subset) 필요
 *   4 = X-wing 필요
 *   5 = 그 이상(이 채점기로는 못 풂 — 체인·찍기 등)
 */
type Cell = number | null;

export type TechniqueTier = 1 | 2 | 3 | 4 | 5;

export interface RateResult {
    tier: TechniqueTier;
    /** 각 기법을 적용한 횟수 */
    steps: { single: number; locked: number; subset: number; xwing: number };
}

const UNITS: number[][] = [];
for (let i = 0; i < 9; i++) {
    UNITS.push(Array.from({ length: 9 }, (_, j) => i * 9 + j));
    UNITS.push(Array.from({ length: 9 }, (_, j) => j * 9 + i));
    const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
    UNITS.push(Array.from({ length: 9 }, (_, j) => (br + Math.floor(j / 3)) * 9 + bc + (j % 3)));
}
const PEERS: number[][] = Array.from({ length: 81 }, (_, c) => {
    const p = new Set<number>();
    for (const u of UNITS) if (u.includes(c)) for (const x of u) if (x !== c) p.add(x);
    return [...p];
});

const popcount = (x: number) => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

function combos<T>(arr: T[], k: number): T[][] {
    const out: T[][] = [];
    const cur: T[] = [];
    const rec = (start: number) => {
        if (cur.length === k) { out.push([...cur]); return; }
        for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1); cur.pop(); }
    };
    rec(0);
    return out;
}
const DIGIT_COMBOS = { 2: combos([0, 1, 2, 3, 4, 5, 6, 7, 8], 2), 3: combos([0, 1, 2, 3, 4, 5, 6, 7, 8], 3) };

export function rateSudoku(board: Cell[][]): RateResult {
    const v = board.flat().map(x => x ?? 0);
    const cand = v.map(x => (x ? 0 : 511));
    for (let c = 0; c < 81; c++) if (v[c]) for (const p of PEERS[c]) cand[p] &= ~(1 << (v[c] - 1));

    const place = (c: number, d: number) => {
        v[c] = d; cand[c] = 0;
        for (const p of PEERS[c]) cand[p] &= ~(1 << (d - 1));
    };

    const steps = { single: 0, locked: 0, subset: 0, xwing: 0 };
    let tier: TechniqueTier = 1;

    const singles = (): boolean => {
        for (const u of UNITS) {
            for (let d = 0; d < 9; d++) {
                const b = 1 << d;
                let only = -1, n = 0;
                for (const c of u) if (cand[c] & b) { only = c; if (++n > 1) break; }
                if (n === 1) { place(only, d + 1); return true; }
            }
        }
        for (let c = 0; c < 81; c++) {
            if (!v[c] && popcount(cand[c]) === 1) { place(c, Math.log2(cand[c]) + 1); return true; }
        }
        return false;
    };

    const locked = (): boolean => {
        let changed = false;
        for (const u of UNITS) {
            for (let d = 0; d < 9; d++) {
                const b = 1 << d;
                const cs = u.filter(c => cand[c] & b);
                if (cs.length < 2) continue;
                for (const u2 of UNITS) {
                    if (u2 === u || !cs.every(c => u2.includes(c))) continue;
                    for (const c of u2) if (!cs.includes(c) && cand[c] & b) { cand[c] &= ~b; changed = true; }
                }
            }
        }
        return changed;
    };

    const subsets = (): boolean => {
        for (const u of UNITS) {
            const empty = u.filter(c => !v[c]);
            for (const k of [2, 3] as const) {
                let changed = false;
                for (const cs of combos(empty, k)) {
                    const m = cs.reduce((a, c) => a | cand[c], 0);
                    if (popcount(m) !== k) continue;
                    for (const c of empty) if (!cs.includes(c) && cand[c] & m) { cand[c] &= ~m; changed = true; }
                }
                for (const ds of DIGIT_COMBOS[k]) {
                    const m = ds.reduce((a, d) => a | (1 << d), 0);
                    const cs = empty.filter(c => cand[c] & m);
                    if (cs.length !== k || !ds.every(d => cs.some(c => cand[c] & (1 << d)))) continue;
                    for (const c of cs) if (cand[c] & ~m) { cand[c] &= m; changed = true; }
                }
                if (changed) return true;
            }
        }
        return false;
    };

    const xwing = (): boolean => {
        let changed = false;
        for (let d = 0; d < 9; d++) {
            const b = 1 << d;
            for (const byCol of [false, true]) {
                const at = (line: number, pos: number) => (byCol ? pos * 9 + line : line * 9 + pos);
                const lines: [number, number[]][] = [];
                for (let i = 0; i < 9; i++) {
                    const ps: number[] = [];
                    for (let j = 0; j < 9; j++) if (cand[at(i, j)] & b) ps.push(j);
                    if (ps.length === 2) lines.push([i, ps]);
                }
                for (let a = 0; a < lines.length; a++) {
                    for (let z = a + 1; z < lines.length; z++) {
                        const [la, pa] = lines[a], [lz, pz] = lines[z];
                        if (pa[0] !== pz[0] || pa[1] !== pz[1]) continue;
                        for (const j of pa) for (let i = 0; i < 9; i++) {
                            if (i === la || i === lz) continue;
                            const c = at(i, j);
                            if (cand[c] & b) { cand[c] &= ~b; changed = true; }
                        }
                    }
                }
            }
        }
        return changed;
    };

    while (v.includes(0)) {
        if (singles()) { steps.single++; continue; }
        if (locked()) { steps.locked++; if (tier < 2) tier = 2; continue; }
        if (subsets()) { steps.subset++; if (tier < 3) tier = 3; continue; }
        if (xwing()) { steps.xwing++; if (tier < 4) tier = 4; continue; }
        return { tier: 5, steps };
    }
    return { tier, steps };
}
