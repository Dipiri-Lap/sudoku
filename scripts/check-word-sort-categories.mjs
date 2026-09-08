#!/usr/bin/env node
// Word Sort 카테고리 중복 체크 도구
//
// 사용법:
//   node scripts/check-word-sort-categories.mjs                 → 중복 카테고리 요약 출력
//   node scripts/check-word-sort-categories.mjs --list          → 전체 카테고리 id 목록 (최근 등장 레벨 포함) 출력
//   node scripts/check-word-sort-categories.mjs id1 id2 id3     → 후보 id들이 이미 쓰였는지 체크
//   node scripts/check-word-sort-categories.mjs --recent 30 id1 id2  → 최근 30레벨 내 사용 여부만 체크

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEVELS_PATH = path.join(__dirname, '../src/features/word-sort/data/levels.json');

const levels = JSON.parse(readFileSync(LEVELS_PATH, 'utf8'));

// id -> { count, name, levelIds: [] } (levelIds는 등장 순서 = 파일 내 순서)
const catInfo = new Map();
levels.forEach((level, idx) => {
  (level.categories || []).forEach((cat) => {
    if (!catInfo.has(cat.id)) {
      catInfo.set(cat.id, { name: cat.name, count: 0, levelIds: [], levelIndexes: [] });
    }
    const info = catInfo.get(cat.id);
    info.count += 1;
    info.levelIds.push(level.id);
    info.levelIndexes.push(idx);
  });
});

const args = process.argv.slice(2);
const totalLevels = levels.length;

function lastSeenDistance(id) {
  const info = catInfo.get(id);
  if (!info) return Infinity;
  const lastIdx = info.levelIndexes[info.levelIndexes.length - 1];
  return totalLevels - 1 - lastIdx;
}

if (args.includes('--list')) {
  const rows = [...catInfo.entries()]
    .map(([id, info]) => ({ id, name: info.name, count: info.count, lastSeenLevel: info.levelIds[info.levelIds.length - 1] }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  rows.forEach((r) => {
    console.log(`${r.id.padEnd(28)} ${r.name.padEnd(10)} count=${r.count}  lastLevel=${r.lastSeenLevel}`);
  });
  console.log(`\ntotal unique categories: ${catInfo.size} / total levels: ${totalLevels}`);
  process.exit(0);
}

const recentFlagIdx = args.indexOf('--recent');
let recentWindow = null;
let candidates = args;
if (recentFlagIdx !== -1) {
  recentWindow = Number(args[recentFlagIdx + 1]);
  candidates = [...args.slice(0, recentFlagIdx), ...args.slice(recentFlagIdx + 2)];
}

if (candidates.length > 0) {
  console.log(`총 ${totalLevels}개 레벨 기준 체크${recentWindow ? ` (최근 ${recentWindow}레벨 이내만 경고)` : ''}\n`);
  candidates.forEach((id) => {
    const info = catInfo.get(id);
    if (!info) {
      console.log(`✅ "${id}" — 미사용 (새로 써도 됨)`);
      return;
    }
    const dist = lastSeenDistance(id);
    if (recentWindow !== null && dist >= recentWindow) {
      console.log(`⚠️  "${id}" — ${info.count}회 사용됨, 최근 ${dist}레벨 전이라 재사용 가능`);
    } else {
      console.log(`❌ "${id}" — ${info.count}회 사용됨 (마지막: 레벨 ${info.levelIds[info.levelIds.length - 1]}, ${dist}레벨 전) → 다른 카테고리 추천`);
    }
  });
  process.exit(0);
}

// 기본: 중복 요약
const dup = [...catInfo.entries()]
  .filter(([, info]) => info.count > 1)
  .sort((a, b) => b[1].count - a[1].count);

console.log(`총 레벨: ${totalLevels}, 고유 카테고리: ${catInfo.size}, 중복 카테고리: ${dup.length}\n`);
dup.forEach(([id, info]) => {
  console.log(`${id.padEnd(28)} ${info.name.padEnd(10)} x${info.count}  levels=[${info.levelIds.join(', ')}]`);
});
