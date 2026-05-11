export type GeneratedLevel = {
  id: number;
  name: string;
  size: number;
  grid: number[][];
  colors: string[];
  solution: [number, number][]; // flat: [row,col] per slot; for double mode, [2i]/[2i+1] = color i
  queensPerColor?: number;
};

export const COLOR_PALETTE = [
  '#F97316', // orange
  '#60A5FA', // blue
  '#4ADE80', // green
  '#A855F7', // purple
  '#F472B6', // pink
  '#F87171', // red
  '#FDE047', // yellow
  '#2DD4BF', // teal
  '#FB923C', // amber
  '#818CF8', // indigo
];

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Backtracking: one queen per row, no same col, no adjacent (8-dir)
function findQueenPlacements(n: number): [number, number][] | null {
  const result: [number, number][] = [];
  const usedCols = new Set<number>();

  function isValid(row: number, col: number): boolean {
    if (usedCols.has(col)) return false;
    for (const [r, c] of result) {
      if (Math.abs(row - r) <= 1 && Math.abs(col - c) <= 1) return false;
    }
    return true;
  }

  function solve(row: number): boolean {
    if (row === n) return true;
    for (const col of shuffle(Array.from({ length: n }, (_, i) => i))) {
      if (isValid(row, col)) {
        result.push([row, col]);
        usedCols.add(col);
        if (solve(row + 1)) return true;
        result.pop();
        usedCols.delete(col);
      }
    }
    return false;
  }

  return solve(0) ? result : null;
}

// Randomized region growing: assign all cells to connected color regions
function generateRegions(n: number, queens: [number, number][]): number[][] {
  const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  queens.forEach(([r, c], i) => { grid[r][c] = i; });

  let unassigned = n * n - n;

  while (unassigned > 0) {
    // Collect frontier: unassigned cells adjacent to assigned cells
    const frontier: Array<{ row: number; col: number; adjColors: number[] }> = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== -1) continue;
        const adjColors: number[] = [];
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] !== -1) {
            adjColors.push(grid[nr][nc]);
          }
        }
        if (adjColors.length > 0) frontier.push({ row: r, col: c, adjColors });
      }
    }
    if (frontier.length === 0) break;

    const cell = frontier[Math.floor(Math.random() * frontier.length)];
    const color = cell.adjColors[Math.floor(Math.random() * cell.adjColors.length)];
    grid[cell.row][cell.col] = color;
    unassigned--;
  }

  return grid;
}

// Find up to `limit` solutions; returns array of placements ([row,col] per color)
function findSolutions(n: number, grid: number[][], limit = 2): [number, number][][] {
  const colorCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const ci = grid[r][c];
      if (ci >= 0 && ci < n) colorCells[ci].push([r, c]);
    }
  }

  const usedRow = new Array(n).fill(false);
  const usedCol = new Array(n).fill(false);
  const placed: ([number, number] | null)[] = Array(n).fill(null);
  const solutions: [number, number][][] = [];

  function canPlace(row: number, col: number): boolean {
    if (usedRow[row] || usedCol[col]) return false;
    for (const p of placed) {
      if (!p) continue;
      if (Math.abs(p[0] - row) <= 1 && Math.abs(p[1] - col) <= 1) return false;
    }
    return true;
  }

  function solve(ci: number): void {
    if (solutions.length >= limit) return;
    if (ci === n) {
      solutions.push(placed.map(p => [p![0], p![1]] as [number, number]));
      return;
    }
    for (const [r, c] of colorCells[ci]) {
      if (canPlace(r, c)) {
        usedRow[r] = true; usedCol[c] = true; placed[ci] = [r, c];
        solve(ci + 1);
        usedRow[r] = false; usedCol[c] = false; placed[ci] = null;
        if (solutions.length >= limit) return;
      }
    }
  }

  solve(0);
  return solutions;
}

// Check if all cells of `color` in `grid` are reachable from (startR, startC)
function isRegionConnected(
  n: number, grid: number[][], color: number, startR: number, startC: number
): boolean {
  let total = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === color) total++;

  const visited = new Set<number>();
  const stack = [startR * n + startC];
  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (visited.has(idx)) continue;
    const r = (idx / n) | 0, c = idx % n;
    if (grid[r][c] !== color) continue;
    visited.add(idx);
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) stack.push(nr * n + nc);
    }
  }
  return visited.size === total;
}

// Repair a non-unique grid by moving boundary cells to eliminate alternative solutions.
// Returns the repaired grid (unique) or null if unable to fix within maxRepairs steps.
function repairGrid(
  n: number,
  grid: number[][],
  queens: [number, number][],
  maxRepairs = 40
): number[][] | null {
  let current = grid.map(r => [...r]);

  for (let rep = 0; rep < maxRepairs; rep++) {
    const solutions = findSolutions(n, current, 2);
    if (solutions.length === 1) return current;
    if (solutions.length === 0) return null;

    const sol1 = solutions[0], sol2 = solutions[1];

    // Collect "ambiguous" cells: cells where the two solutions disagree about which
    // region's queen sits here. We want to move one such cell to a neighbor region.
    const ambiguous: Array<[number, number, number]> = []; // [r, c, colorToRemove]

    for (let ci = 0; ci < n; ci++) {
      const [r1, c1] = sol1[ci], [r2, c2] = sol2[ci];
      if (r1 === r2 && c1 === c2) continue;
      // sol2 places region ci's queen at (r2,c2) instead of (r1,c1)
      // Moving (r2,c2) out of region ci would block that alternative
      // Only if (r2,c2) is NOT the intended queen position for ci
      const [qr, qc] = queens[ci];
      if (r2 !== qr || c2 !== qc) {
        ambiguous.push([r2, c2, ci]);
      }
      if (r1 !== qr || c1 !== qc) {
        ambiguous.push([r1, c1, ci]);
      }
    }

    if (ambiguous.length === 0) return null;

    // Try each ambiguous cell in random order
    let repaired = false;
    for (const [ar, ac, srcColor] of shuffle(ambiguous)) {
      // Find all adjacent regions (different from srcColor)
      const adjSet = new Set<number>();
      for (const [dr, dc] of DIRS) {
        const nr = ar + dr, nc = ac + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && current[nr][nc] !== srcColor) {
          adjSet.add(current[nr][nc]);
        }
      }
      if (adjSet.size === 0) continue;

      for (const dstColor of shuffle([...adjSet])) {
        // Try reassigning (ar, ac) from srcColor → dstColor
        const g2 = current.map(r => [...r]);
        g2[ar][ac] = dstColor;

        // Both regions must stay connected and include their queens
        const [sqr, sqc] = queens[srcColor];
        const [dqr, dqc] = queens[dstColor];
        if (!isRegionConnected(n, g2, srcColor, sqr, sqc)) continue;
        if (!isRegionConnected(n, g2, dstColor, dqr, dqc)) continue;

        current = g2;
        repaired = true;
        break;
      }
      if (repaired) break;
    }

    if (!repaired) return null; // stuck
  }

  return findSolutions(n, current, 2).length === 1 ? current : null;
}

// Count valid solutions (stops early at limit) - kept for fast uniqueness check
function countSolutions(n: number, grid: number[][], limit = 2): number {
  const colorCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const ci = grid[r][c];
      if (ci >= 0 && ci < n) colorCells[ci].push([r, c]);
    }
  }

  const usedRow = new Array(n).fill(false);
  const usedCol = new Array(n).fill(false);
  const placed: Array<[number, number] | null> = Array(n).fill(null);
  let count = 0;

  function canPlace(row: number, col: number): boolean {
    if (usedRow[row] || usedCol[col]) return false;
    for (const p of placed) {
      if (!p) continue;
      if (Math.abs(p[0] - row) <= 1 && Math.abs(p[1] - col) <= 1) return false;
    }
    return true;
  }

  function solve(ci: number): void {
    if (count >= limit) return;
    if (ci === n) { count++; return; }
    for (const [r, c] of colorCells[ci]) {
      if (canPlace(r, c)) {
        usedRow[r] = true;
        usedCol[c] = true;
        placed[ci] = [r, c];
        solve(ci + 1);
        usedRow[r] = false;
        usedCol[c] = false;
        placed[ci] = null;
        if (count >= limit) return;
      }
    }
  }

  solve(0);
  return count;
}

// ─── Double mode helpers ──────────────────────────────────────────────────────

// Place 2n queens: exactly 2 per row, 2 per column, no two adjacent (8-dir).
function findDoubleQueenPlacements(n: number): [number, number][] | null {
  const result: [number, number][] = [];
  const colCount = new Array(n).fill(0);

  function solve(row: number): boolean {
    if (row === n) return true;
    const prevQueens = result.slice(-2).filter(([r]) => r === row - 1);
    const cols = shuffle(Array.from({ length: n }, (_, i) => i));
    for (let i = 0; i < cols.length - 1; i++) {
      const c1 = cols[i];
      if (colCount[c1] >= 2 || prevQueens.some(([, c]) => Math.abs(c - c1) <= 1)) continue;
      for (let j = i + 1; j < cols.length; j++) {
        const c2 = cols[j];
        if (colCount[c2] >= 2 || prevQueens.some(([, c]) => Math.abs(c - c2) <= 1)) continue;
        if (Math.abs(c1 - c2) <= 1) continue;
        result.push([row, c1], [row, c2]);
        colCount[c1]++; colCount[c2]++;
        if (solve(row + 1)) return true;
        result.pop(); result.pop();
        colCount[c1]--; colCount[c2]--;
      }
    }
    return false;
  }
  return solve(0) ? result : null;
}

// Pair 2n queens into n cross-row pairs (different rows preferred, nearest distance).
// Same-row pairing creates boring same-row regions, so we avoid it.
function pairQueensCrossRow(queens: [number, number][]): [number, number][][] {
  const shuffled = shuffle([...queens]);
  const used = new Array(shuffled.length).fill(false);
  const pairs: [number, number][][] = [];

  for (let i = 0; i < shuffled.length; i++) {
    if (used[i]) continue;
    used[i] = true;

    // Prefer a queen in a different row, closest Manhattan distance
    let bestJ = -1, bestDist = Infinity;
    for (let j = 0; j < shuffled.length; j++) {
      if (used[j] || shuffled[i][0] === shuffled[j][0]) continue;
      const d = Math.abs(shuffled[i][0] - shuffled[j][0]) + Math.abs(shuffled[i][1] - shuffled[j][1]);
      if (d < bestDist) { bestDist = d; bestJ = j; }
    }
    // Fallback: any unpaired queen
    if (bestJ === -1) {
      for (let j = 0; j < shuffled.length; j++) {
        if (!used[j]) { bestJ = j; break; }
      }
    }
    if (bestJ === -1) return [];
    used[bestJ] = true;
    pairs.push([shuffled[i], shuffled[bestJ]]);
  }
  return pairs;
}

// Grow connected regions starting from 2 seed cells per color.
// Preferentially expands the smallest region to keep sizes balanced.
// Returns null if any region ends up smaller than minSize.
function generateDoubleRegions(n: number, pairs: [number, number][][], minSize = 4): number[][] | null {
  const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const regionSizes = new Array(pairs.length).fill(2);
  for (let i = 0; i < pairs.length; i++) {
    const [[r1, c1], [r2, c2]] = pairs[i];
    grid[r1][c1] = i;
    grid[r2][c2] = i;
  }
  let unassigned = n * n - 2 * n;
  while (unassigned > 0) {
    const frontier: Array<{ row: number; col: number; adjColors: number[] }> = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== -1) continue;
        const adjColors: number[] = [];
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] !== -1)
            adjColors.push(grid[nr][nc]);
        }
        if (adjColors.length > 0) frontier.push({ row: r, col: c, adjColors });
      }
    }
    if (frontier.length === 0) break;
    const cell = frontier[Math.floor(Math.random() * frontier.length)];
    // 70% chance: pick the adjacent color with the smallest region
    const uniq = [...new Set(cell.adjColors)].sort((a, b) => regionSizes[a] - regionSizes[b]);
    const color = Math.random() < 0.7 ? uniq[0] : uniq[Math.floor(Math.random() * uniq.length)];
    grid[cell.row][cell.col] = color;
    regionSizes[color]++;
    unassigned--;
  }
  if (regionSizes.some(s => s < minSize)) return null;
  return grid;
}

// Find up to `limit` double-mode solutions (2 queens per color/row/col, no adjacent).
function findDoubleSolutions(n: number, grid: number[][], limit = 2): [number, number][][] {
  const colorCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      colorCells[grid[r][c]].push([r, c]);

  const rowCount = new Array(n).fill(0);
  const colCount = new Array(n).fill(0);
  const placed: ([number, number] | null)[] = Array(n * 2).fill(null);
  const solutions: [number, number][][] = [];

  function canPlace(row: number, col: number): boolean {
    if (rowCount[row] >= 2 || colCount[col] >= 2) return false;
    for (const p of placed) {
      if (p && Math.abs(p[0] - row) <= 1 && Math.abs(p[1] - col) <= 1) return false;
    }
    return true;
  }

  function solve(ci: number): void {
    if (solutions.length >= limit) return;
    if (ci === n) {
      solutions.push(placed.map(p => [p![0], p![1]] as [number, number]));
      return;
    }
    const cells = colorCells[ci];
    for (let i = 0; i < cells.length; i++) {
      if (solutions.length >= limit) return;
      const [r1, c1] = cells[i];
      if (!canPlace(r1, c1)) continue;
      rowCount[r1]++; colCount[c1]++;
      placed[ci * 2] = [r1, c1];
      for (let j = i + 1; j < cells.length; j++) {
        if (solutions.length >= limit) break;
        const [r2, c2] = cells[j];
        if (!canPlace(r2, c2)) continue;
        rowCount[r2]++; colCount[c2]++;
        placed[ci * 2 + 1] = [r2, c2];
        solve(ci + 1);
        rowCount[r2]--; colCount[c2]--;
        placed[ci * 2 + 1] = null;
      }
      rowCount[r1]--; colCount[c1]--;
      placed[ci * 2] = null;
    }
  }

  solve(0);
  return solutions;
}

export function generateDoubleLevel(n: number, maxAttempts = 600): GeneratedLevel | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const allQueens = findDoubleQueenPlacements(n);
    if (!allQueens || allQueens.length !== 2 * n) continue;

    const pairs = pairQueensCrossRow(allQueens);
    if (pairs.length !== n) continue;
    // Reject if any pair ended up in the same row (fallback path)
    if (pairs.some(([q1, q2]) => q1[0] === q2[0])) continue;

    const grid = generateDoubleRegions(n, pairs);
    if (!grid) continue;

    const solutions = findDoubleSolutions(n, grid, 2);
    if (solutions.length === 1) {
      return {
        id: Date.now(),
        name: `레벨 ? - 더블`,
        size: n,
        grid,
        colors: COLOR_PALETTE.slice(0, n),
        solution: solutions[0],
        queensPerColor: 2,
      };
    }
  }
  return null;
}

// ─── Single mode (original) ───────────────────────────────────────────────────

export function generateLevel(n: number, maxAttempts = 300): GeneratedLevel | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const queens = findQueenPlacements(n);
    if (!queens) continue;

    const grid = generateRegions(n, queens);
    if (grid.some(row => row.some(v => v === -1))) continue;

    // Fast uniqueness check first
    if (countSolutions(n, grid) === 1) {
      return {
        id: Date.now(),
        name: `레벨 ?`,
        size: n,
        grid,
        colors: COLOR_PALETTE.slice(0, n),
        solution: queens,
      };
    }

    // For larger grids, attempt to repair the non-unique grid before discarding
    if (n >= 7) {
      const repaired = repairGrid(n, grid, queens);
      if (repaired) {
        return {
          id: Date.now(),
          name: `레벨 ?`,
          size: n,
          grid: repaired,
          colors: COLOR_PALETTE.slice(0, n),
          solution: queens,
        };
      }
    }
  }
  return null;
}
