/**
 * Reorder existing Queens stages onto the appendable difficulty curve.
 * Boards themselves are unchanged; only which stage number holds which board.
 * Tutorial (id 0) and 2-crown stages stay where they are.
 *
 *   stages 1..RAMP_END : rising curve, with the 10-stage template fading in
 *   stages > RAMP_END  : every 10-stage block repeats TEMPLATE, no long-term drift
 *
 * Usage: npx tsx scripts/queens-reorder.ts [--dry]
 */

import fs from 'fs';
import { LEVELS_PATH, RAMP_END, TEMPLATE, isFixed, rateGrid, report, type Level, type Rating } from './queens-difficulty.js';

const OFFSET = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 1.0]; // band -> relative difficulty inside a block
const tierCap = (id: number) => (id < 40 ? 2 : id < 150 ? 3 : 4); // no 3-tier logic before 40, no trial before 150
const sizeCap = (id: number) => (id <= 10 ? 6 : id <= 30 ? 7 : 99);

let seed = 20261112;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function keyOf(id: number) {
  if (id <= 20) return (0.6 * id) / RAMP_END; // first stages: plain ascending
  const prog = Math.min(1, id / RAMP_END);
  const amp = 0.3 + 0.7 * prog;
  return 0.6 * prog + 0.4 * amp * OFFSET[TEMPLATE[id % 10]];
}

const raw = fs.readFileSync(LEVELS_PATH, 'utf-8');
const levels: Level[] = JSON.parse(raw);

type Board = { L: Level; r: Rating };
const boards: Board[] = levels.filter(L => !isFixed(L)).map(L => ({ L, r: rateGrid(L.grid) }));
boards.sort((a, b) => a.r.perceived - b.r.perceived || a.L.id - b.L.id);
const slots = levels.filter(L => !isFixed(L)).map(L => L.id);

const keyed = slots.map(id => ({ id, key: keyOf(id), t: rnd() }));
keyed.sort((a, b) => a.key - b.key || a.t - b.t);
const assign = new Map<number, Board>();
keyed.forEach((k, i) => assign.set(k.id, boards[i]));

const ok = (id: number, b: Board) => b.r.maxTier <= tierCap(id) && b.L.size <= sizeCap(id);
for (const id of slots.filter(x => x <= RAMP_END)) {
  if (ok(id, assign.get(id)!)) continue;
  const other = slots.find(x => x > id && x <= RAMP_END && ok(id, assign.get(x)!) && ok(x, assign.get(id)!));
  if (other) { const t = assign.get(id)!; assign.set(id, assign.get(other)!); assign.set(other, t); }
}

const out: Level[] = levels.map(L => {
  if (isFixed(L)) return L;
  const b = assign.get(L.id)!.L;
  return { id: L.id, name: `레벨 ${L.id}`, size: b.size, grid: b.grid, colors: b.colors };
});

report(out);
if (!process.argv.includes('--dry')) {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(out, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
  console.log(`\nWrote ${LEVELS_PATH}`);
}
