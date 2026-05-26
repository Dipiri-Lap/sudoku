import type { PieceData, LevelData, Direction } from '../data/levels';

export type Difficulty = 'lv1' | 'lv2' | 'lv3' | 'lv4' | 'lv5' | 'lv6' | 'lv7' | 'lv8';

export interface DifficultyConfig {
  cols: number; rows: number;
  minPieces: number; maxPieces: number;
  variance: number;
  label: string;
  color: string;
  desc: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  lv1: { cols: 4,  rows: 4,  minPieces: 3,  maxPieces: 3,  variance: 0.00, label: '입문',   color: '#4ade80', desc: '첫 도전' },
  lv2: { cols: 5,  rows: 5,  minPieces: 4,  maxPieces: 5,  variance: 0.15, label: '쉬움',   color: '#34d399', desc: '기초 연습' },
  lv3: { cols: 6,  rows: 6,  minPieces: 6,  maxPieces: 7,  variance: 0.25, label: '초급',   color: '#38bdf8', desc: '약간의 전략' },
  lv4: { cols: 7,  rows: 7,  minPieces: 9,  maxPieces: 11, variance: 0.35, label: '중급',   color: '#60a5fa', desc: '순서 파악 필요' },
  lv5: { cols: 8,  rows: 8,  minPieces: 12, maxPieces: 14, variance: 0.45, label: '상급',   color: '#818cf8', desc: '복잡한 연결' },
  lv6: { cols: 9,  rows: 9,  minPieces: 15, maxPieces: 18, variance: 0.50, label: '고급',   color: '#fb923c', desc: '고도의 집중력' },
  lv7: { cols: 10, rows: 10, minPieces: 19, maxPieces: 23, variance: 0.55, label: '어려움', color: '#f87171', desc: '논리적 사고' },
  lv8: { cols: 11, rows: 11, minPieces: 24, maxPieces: 28, variance: 0.60, label: '전문가', color: '#e879f9', desc: '최고 난이도' },
};

const COLOR_PALETTES: string[][] = [
  ['#FFD600', '#EC407A', '#66BB6A', '#29B6F6', '#FF7043', '#AB47BC', '#26C6DA', '#FFA726', '#EF5350', '#8BC34A', '#F48FB1', '#80CBC4'],
  ['#F44336', '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#00BCD4', '#4CAF50', '#FF9800', '#FF5722', '#607D8B', '#CDDC39', '#00E5FF'],
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA'],
  ['#E74C3C', '#9B59B6', '#3498DB', '#27AE60', '#F39C12', '#16A085', '#E67E22', '#1ABC9C', '#D35400', '#2E86AB', '#A23B72', '#F18F01'],
];

const PIECE_COLORS = COLOR_PALETTES[0];

const ALL_DIRS: Direction[] = ['up', 'down', 'left', 'right'];

function isSelfBlockedCells(cells: [number, number][], exitDir: Direction): boolean {
  const n = cells.length;
  const [hc, hr] = cells[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const [bc, br] = cells[i];
    let dist = 0;
    switch (exitDir) {
      case 'right': if (br === hr && bc > hc) dist = bc - hc; break;
      case 'left':  if (br === hr && bc < hc) dist = hc - bc; break;
      case 'up':    if (bc === hc && br < hr) dist = hr - br; break;
      case 'down':  if (bc === hc && br > hr) dist = br - hr; break;
    }
    if (dist > 0 && i >= dist) return true;
  }
  return false;
}

// Check if a piece can escape given a set of cells still on the board (excluding the piece itself).
function canEscapeWithRemaining(
  cells: [number, number][],
  dir: Direction,
  remaining: Set<string>,
  cols: number,
  rows: number
): boolean {
  if (isSelfBlockedCells(cells, dir)) return false;
  const [hc, hr] = cells[cells.length - 1];
  switch (dir) {
    case 'right': for (let c = hc + 1; c < cols; c++) { if (remaining.has(`${c},${hr}`)) return false; } return true;
    case 'left':  for (let c = hc - 1; c >= 0; c--)  { if (remaining.has(`${c},${hr}`)) return false; } return true;
    case 'up':    for (let r = hr - 1; r >= 0; r--)   { if (remaining.has(`${hc},${r}`)) return false; } return true;
    case 'down':  for (let r = hr + 1; r < rows; r++) { if (remaining.has(`${hc},${r}`)) return false; } return true;
  }
}

function weightedPickDir(cells: [number, number][], dirs: Direction[], cols: number, rows: number): Direction {
  const [c, r] = cells[cells.length - 1];
  const weights: [Direction, number][] = dirs.map(dir => {
    switch (dir) {
      case 'right': return [dir, 1 / (cols - c)];
      case 'left':  return [dir, 1 / (c + 1)];
      case 'down':  return [dir, 1 / (rows - r)];
      case 'up':    return [dir, 1 / (r + 1)];
    }
  });
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let rnd = Math.random() * total;
  for (const [dir, w] of weights) { rnd -= w; if (rnd <= 0) return dir; }
  return dirs[0];
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Constructive exit-direction assignment.
// Picks a random escape order, then assigns each piece an exit direction that is
// guaranteed clear given all pieces escaping after it. This is O(attempts × N)
// and works reliably even for high piece counts where random sampling would fail.
function assignExitDirsConstructive(
  layout: [number, number][][],
  cols: number,
  rows: number,
  attempts = 300
): Direction[] | null {
  const N = layout.length;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const escapeOrder = shuffleIndices(N);
    const dirs: Direction[] = new Array(N);

    // Start with every cell occupied; remove each piece as it escapes.
    const remaining = new Set<string>(layout.flat().map(([c, r]) => `${c},${r}`));

    let ok = true;
    for (let k = 0; k < N; k++) {
      const idx = escapeOrder[k];
      const cells = layout[idx];

      // Remove this piece — it's "escaping" now, so its cells are no longer obstacles.
      for (const [c, r] of cells) remaining.delete(`${c},${r}`);

      // remaining now = cells of pieces that escape after k → they block the exit path.
      const validDirs = ALL_DIRS.filter(d => canEscapeWithRemaining(cells, d, remaining, cols, rows));

      if (validDirs.length === 0) { ok = false; break; }

      dirs[idx] = weightedPickDir(cells, validDirs, cols, rows);
    }

    if (ok) return dirs;
  }
  return null;
}

function freeNeighborCount(c: number, r: number, cols: number, rows: number, visited: Set<string>): number {
  return ([[c+1,r],[c-1,r],[c,r+1],[c,r-1]] as [number,number][])
    .filter(([nc, nr]) => nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited.has(`${nc},${nr}`)).length;
}

function findHamiltonianPath(cols: number, rows: number): [number, number][] | null {
  const total = cols * rows;
  for (let attempt = 0; attempt < 300; attempt++) {
    const path: [number, number][] = [];
    const visited = new Set<string>();
    const sc = Math.floor(Math.random() * cols);
    const sr = Math.floor(Math.random() * rows);
    path.push([sc, sr]);
    visited.add(`${sc},${sr}`);
    let [c, r] = [sc, sr];
    while (path.length < total) {
      const nbrs = ([[c+1,r],[c-1,r],[c,r+1],[c,r-1]] as [number,number][])
        .filter(([nc, nr]) => nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited.has(`${nc},${nr}`));
      if (nbrs.length === 0) break;
      const scored = nbrs.map(([nc, nr]) => ({ nc, nr, deg: freeNeighborCount(nc, nr, cols, rows, visited) }));
      scored.sort((a, b) => a.deg - b.deg);
      const minDeg = scored[0].deg;
      const tied = scored.filter(s => s.deg === minDeg);
      const { nc, nr } = tied[Math.floor(Math.random() * tied.length)];
      path.push([nc, nr]);
      visited.add(`${nc},${nr}`);
      [c, r] = [nc, nr];
    }
    if (path.length === total) return path;
  }
  return null;
}

function pickSliceSizes(total: number, numPieces: number, variance: number): number[] {
  if (variance === 0) {
    const base = Math.floor(total / numPieces);
    const extras = total % numPieces;
    return Array.from({ length: numPieces }, (_, i) => i < extras ? base + 1 : base);
  }
  const base = total / numPieces;
  const minLen = Math.max(2, Math.floor(base * (1 - variance)));
  const maxLen = Math.max(minLen + 1, Math.ceil(base * (1 + variance)));
  const sizes: number[] = [];
  let remaining = total;
  for (let i = 0; i < numPieces - 1; i++) {
    const left = numPieces - i - 1;
    const lo = Math.max(minLen, remaining - maxLen * left);
    const hi = Math.min(maxLen, remaining - minLen * left);
    const sz = lo > hi
      ? Math.floor(remaining / (left + 1))
      : lo + Math.floor(Math.random() * (hi - lo + 1));
    sizes.push(sz);
    remaining -= sz;
  }
  sizes.push(remaining);
  return sizes;
}

// Try multiple Hamiltonian paths; for each, attempt the constructive direction assignment.
export function generateLevel(cols: number, rows: number, numPieces: number, variance = 0, palette = PIECE_COLORS): LevelData | null {
  const total = cols * rows;
  for (let pathTry = 0; pathTry < 5; pathTry++) {
    const fullPath = findHamiltonianPath(cols, rows);
    if (!fullPath) continue;

    const sliceSizes = pickSliceSizes(total, numPieces, variance);
    const layout: [number, number][][] = [];
    let pos = 0;
    for (let i = 0; i < numPieces; i++) {
      layout.push(fullPath.slice(pos, pos + sliceSizes[i]));
      pos += sliceSizes[i];
    }

    const dirs = assignExitDirsConstructive(layout, cols, rows);
    if (!dirs) continue;

    const pieces: PieceData[] = layout.map((cells, i) => ({
      id: String(i + 1),
      cells,
      exitDir: dirs[i],
      color: palette[i % palette.length],
    }));
    return { gridCols: cols, gridRows: rows, pieces };
  }
  return null;
}

export function generateLevelForDifficulty(difficulty: Difficulty): LevelData | null {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const numPieces = cfg.minPieces + Math.floor(Math.random() * (cfg.maxPieces - cfg.minPieces + 1));
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
  return generateLevel(cfg.cols, cfg.rows, numPieces, cfg.variance, palette);
}

export function formatLevelTs(level: LevelData): string {
  const pieces = level.pieces
    .map(p => {
      const cells = p.cells.map(([c, r]) => `[${c},${r}]`).join(', ');
      return `      { id: '${p.id}', cells: [${cells}], exitDir: '${p.exitDir}', color: '${p.color}' }`;
    })
    .join(',\n');
  return `  {\n    gridCols: ${level.gridCols},\n    gridRows: ${level.gridRows},\n    pieces: [\n${pieces},\n    ],\n  }`;
}

const EXTRACTION_PROMPT = `This is a screenshot from an Arrow Puzzle game.

The game has a grid where every cell belongs to exactly one colored snake-like path. Each path goes from its tail to its head. The head end has a filled triangle arrowhead showing the exit direction.

Please analyze and extract:
1. Grid dimensions: count columns (left→right) and rows (top→bottom)
2. For each colored path:
   - List ALL cells in tail→head order
   - Cell coordinates [col, row] where [0,0] is top-left corner
   - exitDir: direction the arrowhead points ("up", "down", "left", "right")
   - color: approximate hex color

Every cell must belong to exactly one piece with no gaps.

Respond ONLY with valid JSON:
{
  "gridCols": number,
  "gridRows": number,
  "pieces": [
    {
      "id": "1",
      "cells": [[col, row], ...],
      "exitDir": "up" | "down" | "left" | "right",
      "color": "#hexcolor"
    }
  ]
}`;

export async function extractLevelFromImage(
  base64: string,
  mediaType: string,
  apiKey: string
): Promise<LevelData> {
  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json() as { content: { text: string }[] };
  const text = data.content[0].text;
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) ?? text.match(/(\{[\s\S]+\})/);
  if (!match) throw new Error('응답에서 JSON을 찾을 수 없습니다');
  return JSON.parse(match[1]) as LevelData;
}
