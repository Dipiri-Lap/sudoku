// 지정한 레벨들의 maxMoves를 "목표 클리어율(시뮬 기준)"에 가장 가깝게 맞춘다.
// 사용법: node scripts/calibrate-maxmoves.mjs --ids 8,18,28 --target 42 [--trials 200] [--budget 80000] [--out docs/x.json]
// 레벨마다 시뮬레이터를 한 번 돌려 maxMoves 후보별 클리어율 곡선을 얻고, 목표에 가장 가까운 값을 고른다. 파일은 수정하지 않는다.
import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const IDS = args.ids.split(',').map(Number);
const TARGET = +args.target, TRIALS = +(args.trials ?? 200), BUDGET = +(args.budget ?? 80000);
const OUT = args.out ?? 'docs/calibration.json';
const meas = new Map(fs.readFileSync('docs/word-sort-level-difficulty-100.csv', 'utf8').replace(/^﻿/, '').trim().split('\n').slice(1).map((l) => { const c = l.split(','); return [+c[0], { p10: +c[8], p50: +c[9] }]; }));

const results = new Map();
let next = 0;
const run = (id) => new Promise((resolve) => {
    const m = meas.get(id);
    const sweep = []; for (let v = m.p10 - 12; v <= m.p50 + 12; v++) sweep.push(v);
    const p = spawn('node', ['scripts/sim-indexed.mjs', '--level', String(id), '--trials', String(TRIALS), '--budget', String(BUDGET), '--w', '1.0', '--json', '1', '--seed', String(1000 + id), '--sweep', sweep.join(',')]);
    let out = ''; p.stdout.on('data', (d) => (out += d));
    p.on('close', () => { const line = out.split('\n').find((l) => l.startsWith('JSON:')); if (line) results.set(id, JSON.parse(line.slice(5))); resolve(); });
});
const worker = async () => { while (next < IDS.length) await run(IDS[next++]); };
await Promise.all(Array.from({ length: Math.max(1, Math.min(os.cpus().length - 1, IDS.length)) }, worker));

const picks = IDS.map((id) => {
    const d = results.get(id); if (!d) return { id, error: 'no result' };
    let best = null;
    for (const [k, v] of Object.entries(d.curve)) { const diff = Math.abs(v - TARGET); if (best === null || diff < best.diff || (diff === best.diff && +k < best.mm)) best = { mm: +k, pct: v, diff }; }
    return { id, slots: d.slots, cards: d.cards, old: d.maxMoves, new: best.mm, pct: best.pct, solvedPct: +(d.solved / d.trials * 100).toFixed(1) };
});
fs.writeFileSync(OUT, JSON.stringify(picks, null, 1));
console.log(JSON.stringify(picks.map((p) => [p.id, p.old, p.new, p.pct, p.solvedPct]).slice(0, 60)));
