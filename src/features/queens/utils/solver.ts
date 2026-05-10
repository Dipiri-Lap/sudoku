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
