/**
 * Queens level batch generator
 *
 * Usage:
 *   npm run generate-queens               # continue from where left off
 *   npm run generate-queens -- --reset    # clear game levels and start fresh
 *
 * Level plan (400 stages):
 *   1–3   : 4×4
 *   4–5   : 5×5
 *   6–100 : [5,5,6,6,7] repeating (95 levels)
 *   101–200: [5,6,7,7,8] repeating (100 levels)
 *   201–300: [6,7,8,8,9] repeating (100 levels)
 *   301–400: [7,8,9,9,10] repeating (100 levels)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLevel } from '../src/features/queens/utils/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVELS_PATH = path.join(__dirname, '../src/features/queens/data/levels.json');

// Larger grids need exponentially more attempts to find a unique-solution layout
const MAX_ATTEMPTS: Record<number, number> = {
  4: 100,
  5: 300,
  6: 500,
  7: 800,
  8: 1500,
  9: 3000,
  10: 5000,
};

interface Level {
  id: number;
  name: string;
  size: number;
  grid: number[][];
  colors: string[];
}

function buildSizePlan(): number[] {
  const plan: number[] = [];

  // 1–3: 4×4
  for (let i = 0; i < 3; i++) plan.push(4);

  // 4–5: 5×5
  for (let i = 0; i < 2; i++) plan.push(5);

  // 6–100: 95 levels
  const p1 = [5, 5, 6, 6, 7];
  for (let i = 0; i < 95; i++) plan.push(p1[i % p1.length]);

  // 101–200: 100 levels
  const p2 = [5, 6, 7, 7, 8];
  for (let i = 0; i < 100; i++) plan.push(p2[i % p2.length]);

  // 201–300: 100 levels
  const p3 = [6, 7, 8, 8, 9];
  for (let i = 0; i < 100; i++) plan.push(p3[i % p3.length]);

  // 301–400: 100 levels
  const p4 = [7, 8, 9, 9, 10];
  for (let i = 0; i < 100; i++) plan.push(p4[i % p4.length]);

  return plan; // 400 total
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

function main() {
  const reset = process.argv.includes('--reset');
  const plan = buildSizePlan();

  const existing: Level[] = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8'));
  const tutorial = existing.find(l => l.id === 0);
  let gameLevels: Level[] = reset ? [] : existing.filter(l => l.id !== 0);

  if (reset) console.log('Reset mode: clearing all game levels.\n');

  // Build dedup set from existing levels (keyed by flattened grid string)
  const seenGrids = new Set<string>(
    gameLevels.map(l => l.grid.flat().join(','))
  );

  const startSlot = gameLevels.length;
  const remaining = plan.length - startSlot;

  if (remaining <= 0) {
    console.log(`All ${plan.length} levels already generated.`);
    return;
  }

  console.log(`Plan: ${plan.length} total stages`);
  console.log(`Already done: ${startSlot}  Remaining: ${remaining}\n`);

  let failed = 0;
  let dupes = 0;
  const startTime = Date.now();

  for (let slot = startSlot; slot < plan.length; slot++) {
    const n = plan[slot];
    const maxAttempts = MAX_ATTEMPTS[n] ?? 500;
    const done = slot - startSlot + 1;
    const pct = Math.round((done / remaining) * 100);
    const elapsed = Date.now() - startTime;
    const avgMs = elapsed / done;
    const eta = Math.round(avgMs * (remaining - done));

    process.stdout.write(
      `  [${done}/${remaining}] slot ${slot + 1} (${n}×${n}) ${pct}%` +
      (eta > 0 ? ` ETA ${formatTime(eta)}` : '') +
      `... `
    );

    // Retry until we get a non-duplicate (up to 5 extra tries)
    let result = null;
    let dupRetries = 0;
    for (let retry = 0; retry <= 5; retry++) {
      result = generateLevel(n, maxAttempts);
      if (!result) break;
      const key = result.grid.flat().join(',');
      if (!seenGrids.has(key)) {
        seenGrids.add(key);
        break;
      }
      dupes++;
      result = null;
      dupRetries++;
    }

    if (!result) {
      console.log(`FAILED (${maxAttempts} attempts${dupRetries > 0 ? `, ${dupRetries} dupes` : ''})`);
      failed++;
      continue;
    }

    // Sequential ID = position in gameLevels array (1-based)
    gameLevels.push({
      id: gameLevels.length + 1,
      name: `레벨 ${gameLevels.length + 1}`,
      size: result.size,
      grid: result.grid,
      colors: result.colors,
    });
    console.log('OK');

    // Save checkpoint every 10 successful levels
    if (gameLevels.length % 10 === 0) {
      const out: Level[] = tutorial ? [tutorial, ...gameLevels] : gameLevels;
      fs.writeFileSync(LEVELS_PATH, JSON.stringify(out, null, 2));
    }
  }

  // Reassign sequential IDs in case of any gaps from previous runs
  gameLevels = gameLevels.map((l, i) => ({ ...l, id: i + 1, name: `레벨 ${i + 1}` }));

  const output: Level[] = tutorial ? [tutorial, ...gameLevels] : gameLevels;
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(output, null, 2));

  const totalTime = formatTime(Date.now() - startTime);
  console.log(`\nDone in ${totalTime}`);
  console.log(`  Generated this run: ${gameLevels.length - startSlot}  Failed: ${failed}  Dupes skipped: ${dupes}`);
  console.log(`  Total game levels: ${gameLevels.length} / ${plan.length}`);
  console.log(`  Total in file: ${output.length} (incl. tutorial)`);

  const dist: Record<number, number> = {};
  gameLevels.forEach(l => { dist[l.size] = (dist[l.size] || 0) + 1; });
  console.log('\nSize distribution:');
  Object.entries(dist).sort((a, b) => +a[0] - +b[0]).forEach(([s, c]) =>
    console.log(`  ${s}×${s}: ${c} levels`)
  );
}

main();
