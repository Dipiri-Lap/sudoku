import { generateLevel } from '../src/features/queens/utils/generator.ts';
const sizes = [8, 9, 10];
for (const n of sizes) {
  let ok = 0;
  const trials = 30;
  for (let i = 0; i < trials; i++) {
    if (generateLevel(n, 500)) ok++;
  }
  console.log(`${n}×${n}: ${ok}/${trials} (${Math.round(ok/trials*100)}%)`);
}
