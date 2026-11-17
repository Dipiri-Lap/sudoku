// 배치 설계(catDepth)로 레벨 클리어율을 목표에 잘게 맞춘다.
// 사용법: node scripts/calibrate-catdepth.mjs --ids 514,518 --targets 50,42 [--trials 400] [--apply 1]
//
// maxMoves 는 한 칸에 클리어율이 15~20%p씩 뛰는 구간이 있어 그것만으로는 목표에 못 맞춘다.
// catDepth(0~1)를 올리면 카테고리 카드가 스택 깊숙이·덱 뒤쪽으로 가서 클리어율이 연속적으로 내려간다.
// 그래서 지금 maxMoves 와 한 칸 위(m, m+1)에서 catDepth 0~0.6을 훑어, 목표에 가장 가까운 (maxMoves, catDepth)를 고른다.
// (음수 쪽은 카테고리 카드가 위로 몰려 슬롯이 막히면서 오히려 어려워지므로 쓰지 않는다.)
// --apply 1 이면 levels.json 의 maxMoves·catDepth 를 고친다(파일 포맷 유지). 기본은 결과만 보여준다.
import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const IDS = args.ids.split(',').map(Number);
const TARGETS = args.targets.split(',').map(Number);
const TRIALS = +(args.trials ?? 400);
const DEPTHS = (args.depths ?? '0,0.1,0.2,0.3,0.4,0.5,0.6').split(',').map(Number);
const FILE = 'src/features/word-sort/data/levels.json';

const raw = fs.readFileSync(FILE, 'utf8');
const levels = JSON.parse(raw);

const jobs = [];
for (const id of IDS) {
    const lv = levels.find((l) => l.id === id);
    if (!lv) { console.error('레벨 없음', id); process.exit(1); }
    for (const d of DEPTHS) jobs.push({ id, d, sweep: [lv.maxMoves, lv.maxMoves + 1] });
}

const results = [];
let next = 0;
const run = (job) => new Promise((resolve) => {
    const p = spawn('node', ['scripts/sim-indexed.mjs', '--level', String(job.id), '--catdepth', String(job.d), '--trials', String(TRIALS),
        '--budget', '80000', '--w', '1.0', '--json', '1', '--seed', String(1000 + job.id), '--sweep', job.sweep.join(',')]);
    let out = '';
    p.stdout.on('data', (b) => (out += b));
    p.on('close', () => {
        const line = out.split('\n').find((l) => l.startsWith('JSON:'));
        if (line) {
            const r = JSON.parse(line.slice(5));
            for (const [m, v] of Object.entries(r.curve)) results.push({ id: job.id, d: job.d, m: +m, pct: v });
        }
        resolve();
    });
});
const worker = async () => { while (next < jobs.length) await run(jobs[next++]); };
await Promise.all(Array.from({ length: Math.max(1, Math.min(os.cpus().length - 1, jobs.length)) }, worker));

const picks = IDS.map((id, i) => {
    const target = TARGETS[i] ?? TARGETS[0];
    const lv = levels.find((l) => l.id === id);
    const rows = results.filter((r) => r.id === id);
    const before = rows.find((r) => r.d === 0 && r.m === lv.maxMoves);
    // 목표에 가장 가깝고, 같으면 catDepth 가 작은(=무작위에 가까운) 쪽
    const best = rows.slice().sort((a, b) => Math.abs(a.pct - target) - Math.abs(b.pct - target) || a.d - b.d || a.m - b.m)[0];
    return { id, target, before: before?.pct, maxMoves: best.m, catDepth: best.d, pct: best.pct, table: rows };
});

for (const p of picks) {
    console.log(`\n레벨 ${p.id} (목표 ${p.target}%) 현재 ${p.before}% → maxMoves ${p.maxMoves}, catDepth ${p.catDepth}: ${p.pct}%`);
    const ms = [...new Set(p.table.map((r) => r.m))].sort((a, b) => a - b);
    for (const m of ms) console.log(`  maxMoves ${m}: ` + DEPTHS.map((d) => `${d}=${p.table.find((r) => r.m === m && r.d === d)?.pct}`).join('  '));
}

if (args.apply === '1') {
    if (JSON.stringify(levels, null, 4).replace(/\n/g, '\r\n') !== raw) { console.error('levels.json 포맷이 예상과 달라 저장하지 않음'); process.exit(1); }
    for (const p of picks) {
        const lv = levels.find((l) => l.id === p.id);
        lv.maxMoves = p.maxMoves;
        if (p.catDepth > 0) lv.catDepth = p.catDepth; else delete lv.catDepth;
    }
    fs.writeFileSync(FILE, JSON.stringify(levels, null, 4).replace(/\n/g, '\r\n'));
    console.log('\nlevels.json 반영 완료');
}
