#!/usr/bin/env node
/**
 * 레벨을 여러 프로세스로 나눠 동시에 굽고 하나로 합친다.
 *
 *   node scripts/bake-jewel-levels.mjs 1 1000        1~1000판, 기본 동시 실행 수
 *   node scripts/bake-jewel-levels.mjs 1 1000 12     12개씩 동시에
 *   node scripts/bake-jewel-levels.mjs 27,40,157 - 12  그 판들만 다시(쉼표 목록)
 *
 * 한 판에 봇을 수백 번 돌려서 1000판을 한 줄로 구우면 몇 시간이 걸린다. 10판씩
 * 묶어 따로 띄우면(generate-jewel-levels.ts에 OUT을 줘서 각자 다른 파일에 쓴다)
 * 코어 수만큼 빨라진다.
 *
 * 묶음마다 프로세스를 새로 띄우는 데는 이유가 하나 더 있다: 한 프로세스에서 수십 판을
 * 이어 구우면 node가 세그폴트로 죽는 일이 있었다(원인 미상). 죽은 묶음은 한 번 더
 * 돌리고, 그래도 빠진 판은 마지막에 목록으로 알려 준다. 이미 구운 묶음 파일은 남아
 * 있어서 다시 실행하면 빠진 묶음만 굽는다.
 *
 * 합칠 때는 기존 generated-levels.json에서 이번 구간 밖의 판은 그대로 둔다.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'src/features/jewel-kingdom/data/generated-levels.json');
const PARTS = path.join(ROOT, '.cache/jewel-levels');
const CHUNK = 10;

const list = process.argv[2]?.includes(',') ? process.argv[2].split(',').map(Number) : null;
const from = list ? Math.min(...list) : Number(process.argv[2] ?? 1);
const to = list ? Math.max(...list) : Number(process.argv[3] ?? from);
const workers = Number(process.argv[4] ?? Math.max(1, Math.min(12, os.cpus().length - 2)));
const wanted = list ?? Array.from({ length: to - from + 1 }, (_, i) => from + i);

fs.mkdirSync(PARTS, { recursive: true });

// 묶음 = 레벨 번호 최대 10개
const chunks = [];
for (let i = 0; i < wanted.length; i += CHUNK) chunks.push(wanted.slice(i, i + CHUNK));
const partOf = ids => path.join(PARTS, `part-${ids[0]}-${ids[ids.length - 1]}-${ids.length}.json`);

function bake(ids) {
  const args = ids.length === 1 ? [String(ids[0]), String(ids[0])] : [ids.join(',')];
  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/generate-jewel-levels.ts', ...args], {
      cwd: ROOT,
      env: { ...process.env, OUT: partOf(ids) },
      shell: process.platform === 'win32',
    });
    let log = '';
    child.stdout.on('data', d => (log += d));
    child.stderr.on('data', d => (log += d));
    child.on('close', code => resolve({ code, log }));
  });
}

const started = Date.now();
let done = 0;

async function run(chunkList) {
  const list = chunkList;
  const queue = list.filter(c => !fs.existsSync(partOf(c)));
  const failed = [];
  const next = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const { code, log } = await bake(c);
      done++;
      const lines = log.split('\n').filter(l => /^ +\d+ /.test(l));
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`[${secs}s] ${c[0]}~${c[c.length - 1]} ${code === 0 ? '완료' : `종료코드 ${code}`} (${done}/${list.length})`);
      lines.filter(l => l.includes('실패')).forEach(l => console.log(l));
      // 종료코드 1은 "일부 판 실패"다. 파일은 써졌으니 성공한 판은 남는다.
      if (!fs.existsSync(partOf(c))) failed.push(c);
    }
  };
  await Promise.all(Array.from({ length: workers }, next));
  return failed;
}

let failed = await run(chunks);
if (failed.length > 0) {
  console.log(`\n죽은 묶음 ${failed.length}개를 한 번 더 굽는다`);
  done = 0;
  failed = await run(failed);
}

// 합치기: 이번에 구운 판만 바꾸고 나머지는 그대로 둔다
const byId = new Map();
const wantedSet = new Set(wanted);
if (fs.existsSync(OUT_JSON)) {
  JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')).levels.forEach(l => {
    if (!wantedSet.has(l.id)) byId.set(l.id, l);
  });
}
let runs = 30;
chunks.forEach(c => {
  if (!fs.existsSync(partOf(c))) return;
  const part = JSON.parse(fs.readFileSync(partOf(c), 'utf8'));
  runs = part.runs;
  part.levels.forEach(l => byId.set(l.id, l));
});
const levels = [...byId.values()].sort((a, b) => a.id - b.id);
fs.writeFileSync(OUT_JSON, JSON.stringify({ runs, levels }, null, 1), 'utf8');

const missing = [];
wanted.forEach(n => {
  if (!byId.has(n)) missing.push(n);
});
console.log(
  `\n${levels.length}판 → ${path.relative(ROOT, OUT_JSON)} (${((Date.now() - started) / 60000).toFixed(1)}분)` +
    (missing.length ? `\n빠진 판 ${missing.length}개: ${missing.join(', ')}` : ''),
);
if (missing.length === 0) fs.rmSync(PARTS, { recursive: true, force: true });
