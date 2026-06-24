#!/usr/bin/env node
/**
 * 실패 레벨만 재생성
 * 실행: node src/features/crossword/scripts/fix-failed-levels.cjs
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../data');
const WORD_FILE = path.join(DATA_DIR, 'korean_words_all_2000.json');
const OUT_FILE  = path.join(DATA_DIR, 'levels.json');

const wordData = JSON.parse(fs.readFileSync(WORD_FILE, 'utf8'));
const byLen    = n => wordData.filter(w => [...w.word].length === n);
const words2   = byLen(2);
const words3   = byLen(3);
const words4   = byLen(4);
const words5   = byLen(5);

const levels   = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));

// ── 난이도 곡선 (generate-levels.cjs와 동일) ────────────────────
function getDifficulty(level) {
  const t        = (level - 1) / 499;
  const tileBase = Math.round(10 + 25 * Math.sqrt(t));
  const hintBase = 0.35 - Math.floor((level - 1) / 100) * 0.02;
  const wave     = Math.sin(((level - 1) % 10) / 10 * 2 * Math.PI);
  const tiles    = Math.max(6, tileBase + Math.round(wave * 2));
  const hint     = Math.max(0.20, Math.min(0.42, hintBase + wave * 0.03));
  return { tiles, hint };
}

// ── 실패 레벨 탐지 ──────────────────────────────────────────────
const failed = levels.filter(lv => {
  const { tiles, hint } = getDifficulty(lv.id);
  const targetTiles     = Math.round(tiles / (1 - hint)) * (1 - hint) * 0.75;
  return lv.tilePool.length < Math.floor(targetTiles * 0.75);
});

console.log(`실패 레벨: ${failed.map(l => l.id).join(', ')}`);
console.log(`총 ${failed.length}개 재생성 시작...\n`);

// ── 유틸 / 생성기 (generate-levels.cjs와 동일) ──────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildIndex(words) {
  const idx = {};
  for (const w of words) {
    const syls = [...w.word];
    syls.forEach((s, i) => {
      if (!idx[s]) idx[s] = [];
      idx[s].push({ word: w.word, syls, hint: w.hint, pos: i });
    });
  }
  return idx;
}

function canPlace(grid, syls, row, col, dir) {
  const preR = dir === 'h' ? row      : row - 1;
  const preC = dir === 'h' ? col - 1  : col;
  if (grid[`${preR},${preC}`]) return false;
  const postR = dir === 'h' ? row              : row + syls.length;
  const postC = dir === 'h' ? col + syls.length : col;
  if (grid[`${postR},${postC}`]) return false;
  for (let i = 0; i < syls.length; i++) {
    const r = dir === 'h' ? row      : row + i;
    const c = dir === 'h' ? col + i  : col;
    const existing = grid[`${r},${c}`];
    if (existing) {
      if (existing !== syls[i]) return false;
    } else {
      const a1r = dir === 'h' ? r - 1 : r;
      const a1c = dir === 'h' ? c     : c - 1;
      const a2r = dir === 'h' ? r + 1 : r;
      const a2c = dir === 'h' ? c     : c + 1;
      if (grid[`${a1r},${a1c}`] || grid[`${a2r},${a2c}`]) return false;
    }
  }
  return true;
}

function generateCrossword(pool, targetCells) {
  const index      = buildIndex(pool);
  const grid       = {};
  const cellDirMap = {};
  const placed     = [];
  const used       = new Set();

  const seed     = shuffle(pool.filter(w => [...w.word].length === 3))[0];
  if (!seed) return null;
  const seedSyls = [...seed.word];
  seedSyls.forEach((s, i) => {
    grid[`0,${i}`] = s;
    if (!cellDirMap[`0,${i}`]) cellDirMap[`0,${i}`] = new Set();
    cellDirMap[`0,${i}`].add('h');
  });
  placed.push({ syls: seedSyls, row: 0, col: 0, dir: 'h', word: seed.word, hint: seed.hint });
  used.add(seed.word);

  let failStreak = 0;
  while (Object.keys(grid).length < targetCells && failStreak < 500) {
    const cells    = shuffle(Object.entries(grid));
    let   didPlace = false;
    for (const [key, syl] of cells) {
      const [r, c]   = key.split(',').map(Number);
      const usedDirs = cellDirMap[key] || new Set();
      const tryDirs  = ['h', 'v'].filter(d => !usedDirs.has(d));
      if (!tryDirs.length) continue;
      for (const cand of shuffle(index[syl] || [])) {
        if (used.has(cand.word)) continue;
        for (const dir of tryDirs) {
          const sr = dir === 'h' ? r : r - cand.pos;
          const sc = dir === 'h' ? c - cand.pos : c;
          if (sr < -14 || sc < -14) continue;
          if (sr + (dir === 'v' ? cand.syls.length - 1 : 0) > 14) continue;
          if (sc + (dir === 'h' ? cand.syls.length - 1 : 0) > 14) continue;
          if (Object.keys(grid).length >= 3) {
            const er = Object.keys(grid).map(k => +k.split(',')[0]);
            const ec = Object.keys(grid).map(k => +k.split(',')[1]);
            const maxSpan = Math.ceil(Math.sqrt(targetCells)) + 2;
            const newR = cand.syls.map((_, i) => dir === 'h' ? sr : sr + i);
            const newC = cand.syls.map((_, i) => dir === 'h' ? sc + i : sc);
            const minER = er.reduce((a,b)=>a<b?a:b), maxER = er.reduce((a,b)=>a>b?a:b);
            const minEC = ec.reduce((a,b)=>a<b?a:b), maxEC = ec.reduce((a,b)=>a>b?a:b);
            const spanR = Math.max(maxER, ...newR) - Math.min(minER, ...newR);
            const spanC = Math.max(maxEC, ...newC) - Math.min(minEC, ...newC);
            if (spanR > maxSpan || spanC > maxSpan) continue;
          }
          if (canPlace(grid, cand.syls, sr, sc, dir)) {
            cand.syls.forEach((s, i) => {
              const k = `${dir === 'h' ? sr : sr + i},${dir === 'h' ? sc + i : sc}`;
              grid[k] = s;
              if (!cellDirMap[k]) cellDirMap[k] = new Set();
              cellDirMap[k].add(dir);
            });
            placed.push({ syls: cand.syls, row: sr, col: sc, dir, word: cand.word, hint: cand.hint });
            used.add(cand.word);
            didPlace = true;
            break;
          }
        }
        if (didPlace) break;
      }
      if (didPlace) break;
    }
    failStreak = didPlace ? 0 : failStreak + 1;
  }
  return { grid, placed };
}

function buildLevel(id, grid, placed, hintRatio) {
  const keys = Object.keys(grid);
  const rows = keys.map(k => +k.split(',')[0]);
  const cols = keys.map(k => +k.split(',')[1]);
  const minR = Math.min(...rows), maxR = Math.max(...rows);
  const minC = Math.min(...cols), maxC = Math.max(...cols);
  const nk   = (r, c) => `${r - minR},${c - minC}`;

  const words = placed.map((pw, i) => ({
    id: i, dir: pw.dir,
    row: pw.row - minR, col: pw.col - minC,
    syllables: pw.syls, label: pw.word,
  }));

  const cellWordCount = {};
  for (const w of words) {
    for (let i = 0; i < w.syllables.length; i++) {
      const r = w.dir === 'h' ? w.row : w.row + i;
      const c = w.dir === 'h' ? w.col + i : w.col;
      const k = `${r},${c}`;
      cellWordCount[k] = (cellWordCount[k] || 0) + 1;
    }
  }

  const allCells = keys.map(key => {
    const [r, c] = key.split(',').map(Number);
    return { r: r - minR, c: c - minC, key: nk(r, c), letter: grid[key] };
  });

  const intersections    = allCells.filter(c => (cellWordCount[c.key] || 0) >= 2);
  const nonIntersections = allCells.filter(c => (cellWordCount[c.key] || 0) <  2);
  const targetHints      = Math.round(allCells.length * hintRatio);
  const extraHints       = shuffle(nonIntersections).slice(0, Math.max(0, targetHints - intersections.length));
  const hintKeys         = new Set([...intersections, ...extraHints].map(c => c.key));

  return {
    id,
    gridRows: maxR - minR + 1,
    gridCols: maxC - minC + 1,
    words,
    fixedCells: allCells.filter(c => hintKeys.has(c.key)).map(({ r, c, letter }) => ({ row: r, col: c, letter })),
    tilePool:   shuffle(allCells.filter(c => !hintKeys.has(c.key)).map(c => c.letter)),
  };
}

function getPool(level) {
  if (level <= 200) return [...words3, ...words4];
  if (level <= 400) return [...words3, ...words4, ...words5.slice(0, 60)];
  return [...words3, ...words4, ...words5];
}

// ── 재생성 ───────────────────────────────────────────────────────
let fixed = 0;
for (const lv of failed) {
  const { tiles, hint } = getDifficulty(lv.id);
  const targetCells     = Math.round(tiles / (1 - hint));
  const minAccept       = Math.floor(targetCells * 0.75);
  const pool            = getPool(lv.id);

  let newLevel = null;
  for (let attempt = 0; attempt < 20 && !newLevel; attempt++) {
    const result = generateCrossword(pool, targetCells);
    if (result && Object.keys(result.grid).length >= minAccept) {
      newLevel = buildLevel(lv.id, result.grid, result.placed, hint);
    }
  }

  if (newLevel) {
    levels[lv.id - 1] = newLevel;
    fixed++;
    console.log(`✓ 레벨 ${lv.id} 재생성 완료 (타일 ${newLevel.tilePool.length}개)`);
  } else {
    console.log(`✗ 레벨 ${lv.id} 재생성 실패 (유지)`);
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(levels, null, 2));
console.log(`\n완료: ${fixed}/${failed.length}개 수정 → levels.json 저장`);
