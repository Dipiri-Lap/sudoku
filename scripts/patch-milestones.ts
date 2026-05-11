/**
 * Replaces milestone positions (25, 50, 75 within each 100-level block)
 * with a level one grid size larger than the block's normal maximum.
 *
 * Block 1 (1–100):  max 7×7 → milestones become 8×8
 * Block 2 (101–200): max 8×8 → milestones become 9×9
 * Block 3 (201–300): max 9×9 → milestones become 10×10
 * Block 4 (301–400): max is already 10×10 → no change
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLevel } from '../src/features/queens/utils/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEVELS_PATH = path.join(__dirname, '../src/features/queens/data/levels.json');

const MAX_ATTEMPTS: Record<number, number> = {
  8: 2000,
  9: 4000,
  10: 6000,
  11: 8000,
};

const MILESTONES: { id: number; size: number }[] = [
  { id: 25,  size: 8  },
  { id: 50,  size: 8  },
  { id: 75,  size: 8  },
  { id: 125, size: 9  },
  { id: 150, size: 9  },
  { id: 175, size: 9  },
  { id: 225, size: 10 },
  { id: 250, size: 10 },
  { id: 275, size: 10 },
  { id: 325, size: 11 },
  { id: 350, size: 11 },
  { id: 375, size: 11 },
];

function main() {
  const levels: any[] = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8'));

  for (const { id, size } of MILESTONES) {
    const idx = levels.findIndex(l => l.id === id);
    if (idx === -1) {
      console.log(`Level id=${id} not found, skipping`);
      continue;
    }

    const current = levels[idx];
    if (current.size === size) {
      console.log(`Level ${id}: already ${size}×${size}, skipping`);
      continue;
    }

    process.stdout.write(`Generating level ${id}: ${current.size}×${current.size} → ${size}×${size}... `);
    const result = generateLevel(size, MAX_ATTEMPTS[size] ?? 3000);
    if (!result) {
      console.log(`FAILED`);
      continue;
    }

    levels[idx] = {
      id: current.id,
      name: current.name,
      size: result.size,
      grid: result.grid,
      colors: result.colors,
    };
    console.log(`OK`);

    fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2));
  }

  console.log('\nDone. levels.json updated.');
}

main();
