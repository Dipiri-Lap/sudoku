// 워드소트 레벨별 클리어 난이도 측정 (시뮬레이터 기반).
// 사용법: node scripts/level-difficulty.mjs [--from 2] [--to 410] [--trials 30] [--budget 40000] [--out docs/word-sort-level-difficulty.csv]
// 각 레벨을 무작위 배치로 여러 번 풀어 보고, 풀이 이동 수 분포와 maxMoves 안에 끝나는 비율을 CSV로 낸다.
import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FROM = +(args.from ?? 2), TO = +(args.to ?? 410), TRIALS = +(args.trials ?? 30), BUDGET = +(args.budget ?? 40000);
const OUT = args.out ?? 'docs/word-sort-level-difficulty.csv';
const WORKERS = Math.max(1, (os.cpus().length || 4) - 1);

const ids = []; for (let i = FROM; i <= TO; i++) ids.push(i);
const results = new Map();
let next = 0, done = 0;

function runOne(id) {
    return new Promise((resolve) => {
        const p = spawn('node', ['scripts/sim-indexed.mjs', '--level', String(id), '--trials', String(TRIALS), '--budget', String(BUDGET), '--w', '1.0', '--json', '1', '--seed', String(id)]);
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.on('close', () => {
            const line = out.split('\n').find((l) => l.startsWith('JSON:'));
            if (line) results.set(id, JSON.parse(line.slice(5)));
            done++;
            if (done % 25 === 0) console.error(`진행 ${done}/${ids.length}`);
            resolve();
        });
    });
}
async function worker() { while (next < ids.length) { const id = ids[next++]; await runOne(id); } }

await Promise.all(Array.from({ length: WORKERS }, worker));

const rows = ids.map((id) => results.get(id)).filter(Boolean).map((r) => ({
    ...r,
    solvedPct: +(r.solved / r.trials * 100).toFixed(1),
    withinPct: +(r.within / r.trials * 100).toFixed(1),
    margin: r.p50 == null ? null : r.maxMoves - r.p50,
}));
const header = 'level,slots,categories,cards,maxMoves,ordered,solved%,avgMoves,p10,median,p90,within_maxMoves%,margin(maxMoves-median)';
const csv = [header, ...rows.map((r) => [r.id, r.slots, r.cats, r.cards, r.maxMoves, r.ordered ? 'Y' : '', r.solvedPct, r.avg, r.p10, r.p50, r.p90, r.withinPct, r.margin].join(','))].join('\n');
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(OUT, '﻿' + csv);
console.log(`저장: ${OUT} (${rows.length}개 레벨, 레벨당 ${TRIALS}판)`);
