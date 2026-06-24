#!/usr/bin/env node
/**
 * 크로스워드 레벨 자동 생성기 (v2)
 * 실행: node src/features/crossword/scripts/generate-levels.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const WORD_FILE = path.join(DATA_DIR, 'korean_words_all_2000.json');
const OUT_FILE  = path.join(DATA_DIR, 'levels.json');
const TOTAL_LEVELS = 500;

// ── 단어 데이터 ─────────────────────────────────────────────────
const wordData = JSON.parse(fs.readFileSync(WORD_FILE, 'utf8'));
const byLen = n => wordData.filter(w => [...w.word].length === n);
const words2 = byLen(2);
const words3 = byLen(3);
const words4 = byLen(4);
const words5 = byLen(5);

// ── 난이도 곡선 (물결 계단) ─────────────────────────────────────
function getDifficulty(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1);

  // 기준 타일 수: 10→35 (sqrt 곡선)
  const tileBase = Math.round(10 + 25 * Math.sqrt(t));

  // 기준 힌트 비율: 35% → 27% (100레벨마다 2% 감소)
  const hintBase = 0.35 - Math.floor((level - 1) / 100) * 0.02;

  // 물결 (10레벨 주기, sin 파동)
  const wave = Math.sin(((level - 1) % 10) / 10 * 2 * Math.PI);

  const tiles = Math.max(6, tileBase + Math.round(wave * 2));
  const hint  = Math.max(0.20, Math.min(0.42, hintBase + wave * 0.03));

  return { tiles, hint };
}

// ── 유틸 ────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 음절 인덱스: syl → [{word, syls, hint, pos}]
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

// ── 크로스워드 배치 ──────────────────────────────────────────────
// 규칙:
//   1. 경계: 단어 앞/뒤 방향에 어떤 셀이든 있으면 거부 (시각적 오연결 방지)
//   2. 수직 인접: 새 셀(교차점 제외)의 양옆에 그리드 셀이 있으면 거부
//   → 이 두 규칙으로 전통적인 낱말 퍼즐 레이아웃 보장

function canPlace(grid, syls, row, col, dir) {
  // 1. 경계 체크: 단어 앞/뒤 셀이 있으면 거부
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
      if (existing !== syls[i]) return false; // 음절 충돌
      // 교차점(기존 셀)은 수직 인접 체크 스킵
    } else {
      // 2. 수직 인접 체크: 새 셀 양쪽(수직 방향)에 셀 있으면 거부
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
  const maxSpan    = Math.ceil(Math.sqrt(targetCells)) + 2;

  // 시드: 3음절 단어를 수평으로 (0,0) 배치
  const seeds = shuffle(pool.filter(w => [...w.word].length === 3));
  if (!seeds.length) return null;
  const seed     = seeds[0];
  const seedSyls = [...seed.word];
  seedSyls.forEach((s, i) => {
    grid[`0,${i}`] = s;
    if (!cellDirMap[`0,${i}`]) cellDirMap[`0,${i}`] = new Set();
    cellDirMap[`0,${i}`].add('h');
  });
  placed.push({ syls: seedSyls, row: 0, col: 0, dir: 'h', word: seed.word, hint: seed.hint });
  used.add(seed.word);

  // grid 범위 캐싱 (내부 루프에서 매번 재계산 방지)
  let gMinR = 0, gMaxR = 0, gMinC = 0, gMaxC = seedSyls.length - 1;

  let failStreak = 0;

  while (Object.keys(grid).length < targetCells && failStreak < 80) {
    const cells    = shuffle(Object.entries(grid));
    let   didPlace = false;

    for (const [key, syl] of cells) {
      const [r, c] = key.split(',').map(Number);
      const usedDirs = cellDirMap[key] || new Set();
      const tryDirs  = ['h', 'v'].filter(d => !usedDirs.has(d));
      if (!tryDirs.length) continue;

      const candidates = shuffle(index[syl] || []);

      for (const cand of candidates) {
        if (used.has(cand.word)) continue;

        for (const dir of tryDirs) {
          const startRow = dir === 'h' ? r            : r - cand.pos;
          const startCol = dir === 'h' ? c - cand.pos : c;
          const endRow   = dir === 'h' ? startRow                    : startRow + cand.syls.length - 1;
          const endCol   = dir === 'h' ? startCol + cand.syls.length - 1 : startCol;

          // 스팬 제약: 캐싱된 범위 사용
          if (Math.max(gMaxR, endRow) - Math.min(gMinR, startRow) > maxSpan) continue;
          if (Math.max(gMaxC, endCol) - Math.min(gMinC, startCol) > maxSpan) continue;

          if (canPlace(grid, cand.syls, startRow, startCol, dir)) {
            cand.syls.forEach((s, i) => {
              const pr = dir === 'h' ? startRow      : startRow + i;
              const pc = dir === 'h' ? startCol + i  : startCol;
              const k  = `${pr},${pc}`;
              grid[k]  = s;
              if (!cellDirMap[k]) cellDirMap[k] = new Set();
              cellDirMap[k].add(dir);
            });
            placed.push({ syls: cand.syls, row: startRow, col: startCol, dir, word: cand.word, hint: cand.hint });
            used.add(cand.word);
            // 범위 업데이트
            gMinR = Math.min(gMinR, startRow); gMaxR = Math.max(gMaxR, endRow);
            gMinC = Math.min(gMinC, startCol); gMaxC = Math.max(gMaxC, endCol);
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

// ── 레벨 JSON 빌드 ───────────────────────────────────────────────
function buildLevel(id, grid, placed, hintRatio) {
  const keys = Object.keys(grid);
  const rows = keys.map(k => +k.split(',')[0]);
  const cols = keys.map(k => +k.split(',')[1]);
  const minR = Math.min(...rows), maxR = Math.max(...rows);
  const minC = Math.min(...cols), maxC = Math.max(...cols);
  const nk = (r, c) => `${r - minR},${c - minC}`;

  const words = placed.map((pw, i) => ({
    id: i,
    dir: pw.dir,
    row: pw.row - minR,
    col: pw.col - minC,
    syllables: pw.syls,
    label: pw.word,
  }));

  const cellWordCount = {};
  for (const w of words) {
    for (let i = 0; i < w.syllables.length; i++) {
      const r = w.dir === 'h' ? w.row      : w.row + i;
      const c = w.dir === 'h' ? w.col + i  : w.col;
      const k = `${r},${c}`;
      cellWordCount[k] = (cellWordCount[k] || 0) + 1;
    }
  }

  const allCells = keys.map(key => {
    const [r, c] = key.split(',').map(Number);
    return { r: r - minR, c: c - minC, key: nk(r, c), letter: grid[key] };
  });

  const intersections    = allCells.filter(cell => (cellWordCount[cell.key] || 0) >= 2);
  const nonIntersections = allCells.filter(cell => (cellWordCount[cell.key] || 0) <  2);

  const targetHints = Math.round(allCells.length * hintRatio);
  const extraNeeded = Math.max(0, targetHints - intersections.length);
  const extraHints  = shuffle(nonIntersections).slice(0, extraNeeded);
  const hintKeys    = new Set([...intersections, ...extraHints].map(c => c.key));

  const fixedCells = allCells
    .filter(c => hintKeys.has(c.key))
    .map(({ r, c, letter }) => ({ row: r, col: c, letter }));

  const tilePool = shuffle(
    allCells.filter(c => !hintKeys.has(c.key)).map(c => c.letter)
  );

  return {
    id,
    gridRows: maxR - minR + 1,
    gridCols: maxC - minC + 1,
    words,
    fixedCells,
    tilePool,
  };
}

// ── 레벨별 단어 풀 ───────────────────────────────────────────────
// 2음절 단어 제외: 교차점만 남아 유저가 채울 게 없어지는 계단형 격자 방지
// 3음절 위주 → 교차점 1개 + 비교차점 2개로 균형 잡힌 격자 생성
function getPool(level) {
  if (level <= 200) return [...words3, ...words4];
  if (level <= 400) return [...words3, ...words4, ...words5.slice(0, 60)];
  return [...words3, ...words4, ...words5];
}

// ── 메인 ────────────────────────────────────────────────────────
function main() {
  console.log(`단어: 2음절 ${words2.length}, 3음절 ${words3.length}, 4음절 ${words4.length}, 5음절 ${words5.length}`);
  console.log(`레벨 ${TOTAL_LEVELS}개 생성 시작...\n`);

  const levels  = [];
  let fallbacks = 0;

  for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
    const { tiles, hint } = getDifficulty(lv);
    const targetCells     = Math.round(tiles / (1 - hint));
    const pool            = getPool(lv);
    const minAccept       = Math.floor(targetCells * 0.75);

    let level = null;

    for (let attempt = 0; attempt < 12 && !level; attempt++) {
      const result = generateCrossword(pool, targetCells);
      if (result && Object.keys(result.grid).length >= minAccept) {
        level = buildLevel(lv, result.grid, result.placed, hint);
      }
    }

    if (!level) {
      fallbacks++;
      const fb = generateCrossword(words2, 10);
      level = fb
        ? buildLevel(lv, fb.grid, fb.placed, 0.35)
        : { id: lv, gridRows: 3, gridCols: 3, words: [], fixedCells: [], tilePool: [] };
      level.id = lv;
    }

    levels.push(level);

    if (lv % 10 === 0) {
      const { tiles: t, hint: h } = getDifficulty(lv);
      process.stdout.write(
        `\r레벨 ${String(lv).padStart(3)}/500  타일 ${String(t).padStart(2)}개  힌트 ${Math.round(h*100)}%  폴백 ${fallbacks}`
      );
    }
  }

  console.log('\n');
  const tileCounts = levels.map(l => l.tilePool.length);
  console.log(`결과: 성공 ${TOTAL_LEVELS - fallbacks} / 폴백 ${fallbacks}`);
  console.log(`타일 범위: ${Math.min(...tileCounts)}~${Math.max(...tileCounts)}개`);
  fs.writeFileSync(OUT_FILE, JSON.stringify(levels, null, 2));
  console.log(`\n✓ levels.json 저장 → ${OUT_FILE}`);
}

main();
