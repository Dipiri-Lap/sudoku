import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDoubleLevel, COLOR_PALETTE } from '../src/features/queens/utils/generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEVELS_PATH = path.join(__dirname, '../src/features/queens/data/levels.json');

const levels: any[] = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8'));

const existingDouble = levels.find((l: any) => l.queensPerColor === 2);
const tutorial = levels.find((l: any) => l.id === 0);
const normal = levels.filter((l: any) => !l.queensPerColor && l.id !== 0);
const byId: Record<number, any> = Object.fromEntries(normal.map((l: any) => [l.id, l]));

const palette8 = COLOR_PALETTE.slice(0, 8);

function makeDouble(id: number, data: any) {
  return { id, name: `레벨 ${id}`, size: 8, grid: data.grid, colors: palette8, queensPerColor: 2 };
}

// id=100: 기존 double 활용
const double100 = makeDouble(100, existingDouble);

// id=200, 300, 400: 새로 생성
const doubles: Record<number, any> = { 100: double100 };

for (const id of [200, 300, 400]) {
  process.stdout.write(`Generating double ${id}... `);
  const d = generateDoubleLevel(8, 600);
  if (!d) { console.log('FAIL'); process.exit(1); }
  console.log('OK');
  doubles[id] = makeDouble(id, d);
}

// 배열 재구성: tutorial + id 1~400 (100,200,300,400은 double)
const result: any[] = [tutorial];
for (let id = 1; id <= 400; id++) {
  if (doubles[id]) result.push(doubles[id]);
  else if (byId[id]) result.push(byId[id]);
}

fs.writeFileSync(LEVELS_PATH, JSON.stringify(result, null, 2));
console.log(`Done. Total: ${result.length}`);
