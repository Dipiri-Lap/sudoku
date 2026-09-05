// 노노그램 레벨 검증: 모든 레벨이 힌트만으로 유일하게 풀리는지 확인
//   npx tsx scripts/check-nonogram.ts
import { levels, solutionGrid, buildClues } from '../src/features/nonogram/data/levels';
import { solveNonogram } from '../src/features/nonogram/utils/solver';

let failed = false;
for (const level of levels) {
  const grid = solutionGrid(level);
  const widths = new Set(level.art.map(r => r.length));
  if (widths.size !== 1) {
    console.log(`✗ ${level.id}: 행 길이가 일정하지 않음 (${[...widths].join(', ')})`);
    failed = true;
    continue;
  }
  const { rows, cols } = buildClues(grid);
  const t0 = Date.now();
  const res = solveNonogram(rows, cols);
  const ms = Date.now() - t0;
  const size = `${grid.length}×${grid[0].length}`;
  const matches = res.grid && res.grid.every((row, r) => row.every((v, c) => v === grid[r][c]));
  if (res.solutions === 1 && matches) {
    const want = res.logicOnly ? 'normal' : 'hard';
    const have = level.difficulty ?? 'normal';
    const warn = want === have ? '' : `  ⚠ difficulty: '${have}' → '${want}' 로 고치세요`;
    console.log(`✓ ${level.id} (${size}) 유일해 · ${res.logicOnly ? '줄 전파만으로 풀림' : `추측 필요(가정 ${res.branches}회)`} · ${ms}ms${warn}`);
  } else {
    failed = true;
    const why = res.exhausted ? '판정불가(탐색한도 초과)' : `해 개수: ${res.solutions}${res.solutions === 1 && !matches ? ' (정답과 불일치)' : ''}`;
    console.log(`✗ ${level.id} (${size}) ${why} · ${ms}ms`);
    if (res.solutions >= 2 && res.grid) {
      console.log('  다른 해 예시:');
      res.grid.forEach((row, r) => {
        const diff = row.map((v, c) => (v === grid[r][c] ? (v ? '#' : '.') : v ? '+' : '-')).join('');
        console.log('  ' + diff);
      });
      console.log('  (+ = 정답엔 빈 칸인데 채움, - = 정답엔 채움인데 빈 칸)');
    }
  }
}
process.exit(failed ? 1 : 0);
