// Finds the unique solution for a queens puzzle grid.
// Returns [row, col] per colorIndex, or null if unsolvable.
export function solveLevel(grid: number[][], n: number): ([number, number] | null)[] | null {
  const colorCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      colorCells[grid[r][c]].push([r, c]);

  const usedRow = new Array(n).fill(false);
  const usedCol = new Array(n).fill(false);
  const placed: ([number, number] | null)[] = Array(n).fill(null);

  function canPlace(row: number, col: number): boolean {
    if (usedRow[row] || usedCol[col]) return false;
    for (const p of placed) {
      if (!p) continue;
      if (Math.abs(p[0] - row) <= 1 && Math.abs(p[1] - col) <= 1) return false;
    }
    return true;
  }

  function solve(ci: number): boolean {
    if (ci === n) return true;
    for (const [r, c] of colorCells[ci]) {
      if (canPlace(r, c)) {
        usedRow[r] = true; usedCol[c] = true; placed[ci] = [r, c];
        if (solve(ci + 1)) return true;
        usedRow[r] = false; usedCol[c] = false; placed[ci] = null;
      }
    }
    return false;
  }

  return solve(0) ? placed : null;
}

// Solves double mode: 2 queens per color, 2 per row, 2 per column, no adjacent.
// Returns flat array of length 2n: indices [2i] and [2i+1] are color i's two queens.
export function solveDoubleLevel(grid: number[][], n: number): ([number, number] | null)[] | null {
  const colorCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      colorCells[grid[r][c]].push([r, c]);

  const rowCount = new Array(n).fill(0);
  const colCount = new Array(n).fill(0);
  const placed: ([number, number] | null)[] = Array(n * 2).fill(null);

  function canPlace(row: number, col: number): boolean {
    if (rowCount[row] >= 2 || colCount[col] >= 2) return false;
    for (const p of placed) {
      if (p && Math.abs(p[0] - row) <= 1 && Math.abs(p[1] - col) <= 1) return false;
    }
    return true;
  }

  function solve(ci: number): boolean {
    if (ci === n) return true;
    const cells = colorCells[ci];
    for (let i = 0; i < cells.length; i++) {
      const [r1, c1] = cells[i];
      if (!canPlace(r1, c1)) continue;
      rowCount[r1]++; colCount[c1]++;
      placed[ci * 2] = [r1, c1];
      for (let j = i + 1; j < cells.length; j++) {
        const [r2, c2] = cells[j];
        if (!canPlace(r2, c2)) continue;
        rowCount[r2]++; colCount[c2]++;
        placed[ci * 2 + 1] = [r2, c2];
        if (solve(ci + 1)) return true;
        rowCount[r2]--; colCount[c2]--;
        placed[ci * 2 + 1] = null;
      }
      rowCount[r1]--; colCount[c1]--;
      placed[ci * 2] = null;
    }
    return false;
  }

  return solve(0) ? placed : null;
}
