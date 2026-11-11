/**
 * Queens (크라운 퀘스트) difficulty rater + curve report.
 *
 * Solves each 1-crown board the way a person would, using the easiest technique
 * that makes progress, and records which techniques were needed:
 *   tier 1  a row / column / region has a single open cell
 *   tier 2  region confined to one line (or line to one region), or a cell that
 *           "sees" every open cell of another unit
 *   tier 3  k regions confined to k lines (or k lines to k regions), k >= 2
 *   tier 4  trial: assume a crown, propagate tiers 1-3, contradiction -> eliminate
 *   tier 5  needs more than one level of trial (none in the current set)
 *
 * score     = 0.2*t1 + 1*t2 + 4*t3 + 12*t4 + 60*t5   (logic effort)
 * perceived = score + SIZE_COST*(size-4)              (adds scanning cost of a big board)
 *
 * Usage:
 *   npx tsx scripts/queens-difficulty.ts            # curve report for levels.json
 *   npx tsx scripts/queens-difficulty.ts --csv out  # per-stage CSV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const LEVELS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/features/queens/data/levels.json');

export interface Level {
  id: number;
  name: string;
  size: number;
  grid: number[][];
  colors: string[];
  queensPerColor?: number;
}

export interface Rating {
  t1: number; t2: number; t3: number; t4: number; t5: number;
  maxTier: number;
  score: number;
  perceived: number;
}

export const SIZE_COST = 1.5;

// ---- curve design (shared by reorder + append) ----------------------------
/** Stages 1..RAMP_END rise; after that every 10-stage block repeats TEMPLATE. */
export const RAMP_END = 300;
/** Stage id % 10 -> band (0 = easiest … 7 = hardest). */
export const TEMPLATE: Record<number, number> = { 1: 0, 2: 2, 3: 3, 4: 1, 5: 4, 6: 3, 7: 5, 8: 2, 9: 6, 0: 7 };
export const BAND_NAME = ['휴식', '쉬움', '보통-', '보통', '보통+', '어려움-', '어려움', '고난도'];
/** Fixed stages that are never moved: tutorial and double (2-crown) stages. */
export const isFixed = (L: Level) => L.id === 0 || L.queensPerColor === 2;
/** Every 50th stage is a 2-crown stage (existing doubles: 100,200,300,400,450,500,550,600). */
export const isDoubleSlot = (id: number) => id > 400 ? id % 50 === 0 : id % 100 === 0;

// ---- solver -----------------------------------------------------------------
type Cell = [number, number];
interface Unit { kind: 'row' | 'col' | 'reg'; i: number; cells: Cell[] }
interface State { cand: boolean[][]; queen: boolean[][] }

function buildUnits(grid: number[][]): Unit[] {
  const n = grid.length;
  const U: Unit[] = [];
  for (let r = 0; r < n; r++) U.push({ kind: 'row', i: r, cells: [...Array(n).keys()].map(c => [r, c] as Cell) });
  for (let c = 0; c < n; c++) U.push({ kind: 'col', i: c, cells: [...Array(n).keys()].map(r => [r, c] as Cell) });
  const reg: Cell[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) reg[grid[r][c]].push([r, c]);
  reg.forEach((cells, i) => U.push({ kind: 'reg', i, cells }));
  return U;
}

class Rater {
  n: number;
  U: Unit[];
  constructor(public grid: number[][]) { this.n = grid.length; this.U = buildUnits(grid); }

  clone(st: State): State { return { cand: st.cand.map(r => r.slice()), queen: st.queen.map(r => r.slice()) }; }

  place(st: State, r: number, c: number): boolean {
    if (!st.cand[r][c]) return false;
    const { n, grid } = this;
    st.queen[r][c] = true;
    const g = grid[r][c];
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
      if (rr === r && cc === c) continue;
      if (rr === r || cc === c || grid[rr][cc] === g || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)) {
        if (st.queen[rr][cc]) return false;
        st.cand[rr][cc] = false;
      }
    }
    return true;
  }

  status(st: State): 'contra' | 'solved' | 'open' {
    let solved = true;
    for (const u of this.U) {
      let q = 0, open = 0;
      for (const [r, c] of u.cells) { if (st.queen[r][c]) q++; else if (st.cand[r][c]) open++; }
      if (q > 1 || (q === 0 && open === 0)) return 'contra';
      if (q === 0) solved = false;
    }
    return solved ? 'solved' : 'open';
  }

  open(u: Unit, st: State) { return u.cells.filter(([r, c]) => st.cand[r][c] && !st.queen[r][c]); }
  hasQueen(u: Unit, st: State) { return u.cells.some(([r, c]) => st.queen[r][c]); }

  single(st: State): 'prog' | 'contra' | 'none' {
    for (const u of this.U) {
      if (this.hasQueen(u, st)) continue;
      const o = this.open(u, st);
      if (o.length === 1) return this.place(st, o[0][0], o[0][1]) ? 'prog' : 'contra';
    }
    return 'none';
  }

  subset(st: State, kMin: number, kMax: number): 'prog' | 'none' {
    const { n, grid } = this;
    for (const kind of ['row', 'col'] as const) {
      const lineOf = ([r, c]: Cell) => (kind === 'row' ? r : c);
      const regs = this.U.filter(u => u.kind === 'reg' && !this.hasQueen(u, st));
      const lines = this.U.filter(u => u.kind === kind && !this.hasQueen(u, st));
      const regLines = regs.map(u => new Set(this.open(u, st).map(lineOf)));
      const lineRegs = lines.map(u => new Set(this.open(u, st).map(([r, c]) => grid[r][c])));
      for (let k = kMin; k <= kMax && k < regs.length; k++) {
        for (const combo of combos(regs.length, k)) {
          const ls = new Set<number>(); combo.forEach(i => regLines[i].forEach(x => ls.add(x)));
          if (ls.size !== k) continue;
          const keep = new Set(combo.map(i => regs[i].i));
          let changed = false;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (st.cand[r][c] && !st.queen[r][c] && ls.has(lineOf([r, c])) && !keep.has(grid[r][c])) { st.cand[r][c] = false; changed = true; }
          }
          if (changed) return 'prog';
        }
        for (const combo of combos(lines.length, k)) {
          const rs = new Set<number>(); combo.forEach(i => lineRegs[i].forEach(x => rs.add(x)));
          if (rs.size !== k) continue;
          const ls = new Set(combo.map(i => lines[i].i));
          let changed = false;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (st.cand[r][c] && !st.queen[r][c] && rs.has(grid[r][c]) && !ls.has(lineOf([r, c]))) { st.cand[r][c] = false; changed = true; }
          }
          if (changed) return 'prog';
        }
      }
    }
    return 'none';
  }

  attack(st: State): 'prog' | 'none' {
    const { n, grid } = this;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!st.cand[r][c] || st.queen[r][c]) continue;
      const g = grid[r][c];
      const sees = ([rr, cc]: Cell) => rr === r || cc === c || grid[rr][cc] === g || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1);
      for (const u of this.U) {
        if (this.hasQueen(u, st) || u.cells.some(([rr, cc]) => rr === r && cc === c)) continue;
        if (this.open(u, st).every(sees)) { st.cand[r][c] = false; return 'prog'; }
      }
    }
    return 'none';
  }

  tier(st: State, t: number): 'prog' | 'contra' | 'none' {
    if (t === 1) return this.single(st);
    if (t === 2) { const a = this.subset(st, 1, 1); return a !== 'none' ? a : this.attack(st); }
    if (t === 3) return this.subset(st, 2, Math.floor(this.n / 2));
    return 'none';
  }

  propagate(st: State): 'contra' | 'solved' | 'open' {
    for (;;) {
      const s = this.status(st); if (s !== 'open') return s;
      let prog = false;
      for (let t = 1; t <= 3; t++) {
        const res = this.tier(st, t);
        if (res === 'contra') return 'contra';
        if (res === 'prog') { prog = true; break; }
      }
      if (!prog) return 'open';
    }
  }

  trial(st: State): 'prog' | 'none' {
    const { n } = this;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!st.cand[r][c] || st.queen[r][c]) continue;
      const t = this.clone(st);
      if (!this.place(t, r, c) || this.propagate(t) === 'contra') { st.cand[r][c] = false; return 'prog'; }
    }
    return 'none';
  }

  run(): Omit<Rating, 'score' | 'perceived'> {
    const st: State = { cand: this.grid.map(r => r.map(() => true)), queen: this.grid.map(r => r.map(() => false)) };
    const s = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, maxTier: 0 };
    for (;;) {
      const status = this.status(st);
      if (status === 'solved') return s;
      if (status === 'contra') break;
      let prog = false;
      for (let t = 1; t <= 4; t++) {
        const res = t === 4 ? this.trial(st) : this.tier(st, t);
        if (res === 'contra') break;
        if (res === 'prog') { (s as any)['t' + t]++; s.maxTier = Math.max(s.maxTier, t); prog = true; break; }
      }
      if (!prog) break;
    }
    s.t5 = 1; s.maxTier = 5;
    return s;
  }
}

function* combos(m: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= m - (k - acc.length); i++) { acc.push(i); yield* combos(m, k, i + 1, acc); acc.pop(); }
}

export function rateGrid(grid: number[][]): Rating {
  const s = new Rater(grid).run();
  const score = +(s.t1 * 0.2 + s.t2 + s.t3 * 4 + s.t4 * 12 + s.t5 * 60).toFixed(1);
  return { ...s, score, perceived: +(score + SIZE_COST * (grid.length - 4)).toFixed(1) };
}

// ---- report -----------------------------------------------------------------
export function report(levels: Level[]) {
  const rows = levels.filter(L => !isFixed(L)).map(L => ({ L, r: rateGrid(L.grid) }));
  const byId = new Map(rows.map(x => [x.L.id, x]));
  const maxId = Math.max(...levels.map(l => l.id));
  const avg = (v: number[]) => (v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-');
  console.log('구간       일반판 평균  10번째 평균  t3  t4  크기 분포');
  for (let s = 1; s <= maxId; s += 50) {
    const b = [...Array(50).keys()].map(i => s + i).filter(i => byId.has(i)).map(i => ({ i, ...byId.get(i)! }));
    if (!b.length) continue;
    const sizes: Record<number, number> = {};
    b.forEach(x => (sizes[x.L.size] = (sizes[x.L.size] || 0) + 1));
    console.log(
      `${String(s).padStart(4)}-${String(s + 49).padEnd(4)}  ${avg(b.filter(x => x.i % 10).map(x => x.r.perceived)).padStart(9)}  ${avg(b.filter(x => !(x.i % 10)).map(x => x.r.perceived)).padStart(10)}` +
      `  ${String(b.filter(x => x.r.maxTier === 3).length).padStart(2)}  ${String(b.filter(x => x.r.maxTier === 4).length).padStart(2)}  ${JSON.stringify(sizes)}`,
    );
  }
  const steady = rows.filter(x => x.L.id > RAMP_END);
  if (steady.length) {
    console.log(`\n정상 구간(${RAMP_END + 1}~) 10판 틀별 체감 난이도`);
    for (const p of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
      const v = steady.filter(x => x.L.id % 10 === p).map(x => x.r.perceived).sort((a, b) => a - b);
      if (!v.length) continue;
      console.log(`  x${p}  ${BAND_NAME[TEMPLATE[p]].padEnd(5)} ${v[0]} ~ ${v[v.length - 1]}  (중앙 ${v[v.length >> 1]}, ${v.length}판)`);
    }
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const levels: Level[] = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8'));
  const rows = report(levels);
  const csvIdx = process.argv.indexOf('--csv');
  if (csvIdx > 0) {
    const out = process.argv[csvIdx + 1];
    const lines = ['id,size,t1,t2,t3,t4,maxTier,score,perceived'];
    rows.forEach(({ L, r }) => lines.push([L.id, L.size, r.t1, r.t2, r.t3, r.t4, r.maxTier, r.score, r.perceived].join(',')));
    fs.writeFileSync(out, lines.join('\n') + '\n');
    console.log(`\nCSV -> ${out}`);
  }
}
