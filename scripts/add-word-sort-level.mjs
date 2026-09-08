#!/usr/bin/env node
// Word Sort 레벨 추가 도구 (터미널 전용, 브라우저 불필요)
//
// 1) 레벨 초안을 JSON 파일로 준비한다 (id 없이, slots + categories만):
//    {
//      "maxMoves": 100,
//      "slots": 4,
//      "categories": [
//        { "id": "space", "name": "우주", "target": 7, "words": ["별","행성", ...] },
//        ...
//      ]
//    }
// 2) 실행: node scripts/add-word-sort-level.mjs <draft.json>
// 3) 검증 결과 + 미리보기 + 카테고리 중복 여부를 보여주고, y 입력 시 levels.json에 실제로 append 한다.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEVELS_PATH = path.join(__dirname, '../src/features/word-sort/data/levels.json');

const draftPath = process.argv[2];
if (!draftPath) {
  console.error('사용법: node scripts/add-word-sort-level.mjs <draft.json>');
  process.exit(1);
}

const levels = JSON.parse(readFileSync(LEVELS_PATH, 'utf8'));
const draft = JSON.parse(readFileSync(draftPath, 'utf8'));

// ── 검증 ─────────────────────────────────────────────────────────────
const errors = [];

if (typeof draft.maxMoves !== 'number') errors.push('maxMoves가 숫자가 아닙니다.');
if (typeof draft.slots !== 'number') errors.push('slots가 숫자가 아닙니다.');
if (!Array.isArray(draft.categories) || draft.categories.length === 0) {
  errors.push('categories가 비어있거나 배열이 아닙니다.');
}

const seenIdsInDraft = new Set();
(draft.categories || []).forEach((cat, i) => {
  const label = `categories[${i}]`;
  if (!cat.id) errors.push(`${label}.id 누락`);
  if (!cat.name) errors.push(`${label}.name 누락`);
  if (typeof cat.target !== 'number') errors.push(`${label}.target이 숫자가 아닙니다.`);
  if (!Array.isArray(cat.words)) errors.push(`${label}.words가 배열이 아닙니다.`);
  else if (cat.words.length !== cat.target) {
    errors.push(`${label}: words 개수(${cat.words.length})가 target(${cat.target})과 다릅니다.`);
  }
  if (typeof cat.target === 'number' && (cat.target < 3 || cat.target > 8)) {
    errors.push(`${label}: target(${cat.target})이 허용 범위(3~8)를 벗어났습니다.`);
  }
  if (cat.id) {
    if (seenIdsInDraft.has(cat.id)) errors.push(`${label}: 초안 내부에서 id "${cat.id}"가 중복됩니다.`);
    seenIdsInDraft.add(cat.id);
  }
});

if (errors.length > 0) {
  console.error('❌ 검증 실패:\n');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}

// ── 기존 levels.json 대비 카테고리 중복 체크 ────────────────────────────
const catInfo = new Map();
levels.forEach((level, idx) => {
  (level.categories || []).forEach((cat) => {
    if (!catInfo.has(cat.id)) catInfo.set(cat.id, { count: 0, lastIdx: -1, lastLevelId: null });
    const info = catInfo.get(cat.id);
    info.count += 1;
    info.lastIdx = idx;
    info.lastLevelId = level.id;
  });
});

const RECENT_WINDOW = 40; // 최근 몇 레벨 이내 재사용을 경고할지

// ── 단어 구성 기준 내용 중복 체크 (id/name이 달라도 단어가 겹치면 경고) ──
const existingCatWordSets = []; // [{ levelId, catId, catName, words: Set }]
levels.forEach((level) => {
  (level.categories || []).forEach((cat) => {
    existingCatWordSets.push({ levelId: level.id, catId: cat.id, catName: cat.name, words: new Set(cat.words) });
  });
});

function findWordOverlaps(draftCat) {
  const draftWords = new Set(draftCat.words);
  const matches = [];
  for (const existing of existingCatWordSets) {
    const common = [...draftWords].filter((w) => existing.words.has(w));
    if (common.length === 0) continue;
    const overlapRatio = common.length / Math.min(draftWords.size, existing.words.size);
    if (overlapRatio >= 0.5) {
      matches.push({ ...existing, common, overlapRatio });
    }
  }
  return matches.sort((a, b) => b.overlapRatio - a.overlapRatio);
}

// ── 미리보기 ─────────────────────────────────────────────────────────
const nextId = Math.max(...levels.map((l) => l.id)) + 1;
const newLevel = { id: nextId, maxMoves: draft.maxMoves, slots: draft.slots, categories: draft.categories };

const wordCardTotal = newLevel.categories.reduce((s, c) => s + c.words.length, 0);
const totalCards = wordCardTotal + newLevel.categories.length; // 카테고리 카드 1장 + 단어 카드 n장

console.log(`\n=== 새 레벨 미리보기 (id: ${nextId}) ===`);
console.log(`maxMoves: ${newLevel.maxMoves}, slots: ${newLevel.slots}, 카테고리 수: ${newLevel.categories.length}, 단어 카드 수: ${wordCardTotal}, 총 카드 수: ${totalCards} (카테고리 ${newLevel.categories.length} + 단어 ${wordCardTotal})\n`);

const table = newLevel.categories.map((c) => {
  const info = catInfo.get(c.id);
  const overlaps = findWordOverlaps(c);
  const parts = [];
  if (info) {
    const dist = levels.length - 1 - info.lastIdx;
    parts.push(`id 동일 ${info.count}회 (최근: 레벨 ${info.lastLevelId}, ${dist}레벨 전)`);
  }
  if (overlaps.length > 0) {
    const top = overlaps[0];
    parts.push(`단어 유사 ${overlaps.length}건 (최고 ${Math.round(top.overlapRatio * 100)}%, "${top.catName}"@레벨${top.levelId})`);
  }
  return {
    id: c.id,
    name: c.name,
    단어수: c.words.length,
    중복여부: parts.length > 0 ? parts.join(' / ') : '신규',
    단어: c.words.join(', '),
  };
});
console.table(table);

const dupCount = newLevel.categories.filter((c) => catInfo.has(c.id) || findWordOverlaps(c).length > 0).length;
console.log(dupCount > 0 ? `⚠️  ${dupCount}개 카테고리가 기존 레벨과 겹칩니다 (id 동일 또는 단어 절반 이상 유사, 위 표 참고). 중복 자체는 허용되니 확인용입니다.` : `✅ 기존 레벨과 겹치는 카테고리 없음.`);

// ── 확인 후 저장 ─────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nlevels.json에 추가할까요? (y/N) ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('취소했습니다. 파일은 변경되지 않았습니다.');
    process.exit(0);
  }
  levels.push(newLevel);
  // 기존 파일 포맷(4-space indent, CRLF, 끝에 개행 없음)을 그대로 유지해서 불필요한 diff를 만들지 않는다.
  const json = JSON.stringify(levels, null, 4).replace(/\n/g, '\r\n');
  writeFileSync(LEVELS_PATH, json, 'utf8');
  console.log(`✅ 레벨 ${nextId}을(를) levels.json에 추가했습니다.`);
});
