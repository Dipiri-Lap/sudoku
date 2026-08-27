import type { Blocker, Board, GemColor, SpecialKind } from './types';
import { allocGemId, at, createBoard } from './board';
import { elementById } from '../data/elements';

/**
 * 보드를 글자로 적는다.
 *
 * 테스트 픽스처이자 레벨 데이터 형식이다. 둘을 같은 표기로 두는 이유는
 * 레벨을 그대로 테스트에 붙여넣을 수 있어야 하기 때문이다 - 표기가 갈리면
 * "레벨에서만 재현되는 버그"가 생긴다.
 *
 *   R G B Y P O   보석 색 (빨강 초록 파랑 노랑 보라 주황)
 *   R-            가로 로켓 (그 색의)
 *   R|            세로 로켓
 *   R*            TNT
 *   W             라이트볼 (색 없음)
 *   #             칸을 막는 장애물
 *   .             빈 칸
 *
 * 예)
 *   parseBoard(`
 *     R R R G
 *     B G B Y
 *   `)
 */
const COLOR_CHARS = ['R', 'G', 'B', 'Y', 'P', 'O'] as const;

const SUFFIX_TO_KIND: Record<string, SpecialKind> = {
  '-': 'rocket-h',
  '|': 'rocket-v',
  '*': 'tnt',
  '@': 'propeller',
};

/** 장애물 표기 -> 축 조합. 종류를 늘려도 표기 한 줄만 추가하면 된다. */
const BLOCKER_TOKENS: Record<string, Omit<Blocker, 'layers'>> = {
  '#': { kind: 'box' },
  $: { kind: 'crate', fallsOut: true },
  '%': { kind: 'golem', moving: true },
  '+': { kind: 'mailbox', produces: 'letter' },
  '?': { kind: 'vault', hidden: true },
};

const BLOCKER_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(BLOCKER_TOKENS).map(([ch, b]) => [b.kind, ch]),
);

const KIND_TO_SUFFIX: Record<SpecialKind, string> = {
  'rocket-h': '-',
  'rocket-v': '|',
  tnt: '*',
  lightball: '',
  propeller: '@',
};

export function parseBoard(text: string): Board {
  const rows = text
    .trim()
    .split('\n')
    .map(line => line.trim().split(/\s+/))
    .filter(tokens => tokens.length > 0 && tokens[0] !== '');

  const width = rows[0].length;
  rows.forEach((tokens, r) => {
    if (tokens.length !== width) {
      throw new Error(`${r}번 행의 칸 수가 ${tokens.length}개다. 첫 행(${width}개)과 맞춰라.`);
    }
  });

  const board = createBoard(width, rows.length);
  rows.forEach((tokens, r) => {
    tokens.forEach((raw, c) => {
      const cell = at(board, r, c);
      let token = raw;

      // [이름] / [이름:겹] / [이름:색겹] - 카탈로그를 그대로 읽는다.
      // 뒤에 보석 표기를 붙일 수 있다: [chain]R = 사슬에 묶인 빨강 보석
      while (token[0] === '[') {
        const close = token.indexOf(']');
        if (close < 0) throw new Error(`대괄호가 안 닫혔다: "${raw}" (${r},${c})`);
        const body = token.slice(1, close);
        const [id, arg = ''] = body.split(':');
        const def = elementById(id);
        if (!def) throw new Error(`카탈로그에 없는 요소다: "${id}" (${r},${c})`);

        const colorIdx = arg ? COLOR_CHARS.indexOf(arg[0] as (typeof COLOR_CHARS)[number]) : -1;
        const numText = colorIdx >= 0 ? arg.slice(1) : arg;
        const layers = numText ? Number(numText) : (def.layers ?? 1);
        if (!Number.isFinite(layers) || layers < 1) {
          throw new Error(`겹 수가 이상하다: "${raw}" (${r},${c})`);
        }
        def.apply(cell, layers, colorIdx >= 0 ? (colorIdx as GemColor) : null);
        token = token.slice(close + 1);
      }
      if (token === '' || token === '.') return;

      if (token === '_') {
        cell.exists = false;
        return;
      }
      // 그릇: = 또는 =색 또는 =색개수
      if (token[0] === '=') {
        const rest = token.slice(1);
        const colorIdx = rest ? COLOR_CHARS.indexOf(rest[0] as (typeof COLOR_CHARS)[number]) : -1;
        const numText = colorIdx >= 0 ? rest.slice(1) : rest;
        cell.collector = {
          kind: 'shelf',
          color: colorIdx >= 0 ? (colorIdx as GemColor) : null,
          need: numText ? Number(numText) : 1,
          got: 0,
        };
        return;
      }
      // 투입구: >색
      if (token[0] === '>') {
        const colorIdx = COLOR_CHARS.indexOf(token[1] as (typeof COLOR_CHARS)[number]);
        if (colorIdx < 0) throw new Error(`투입구 색 표기가 이상하다: "${token}" (${r},${c})`);
        cell.spawner = { color: colorIdx as GemColor };
        return;
      }

      const blockerChar = BLOCKER_TOKENS[token[0]];
      if (blockerChar) {
        const layers = token.length > 1 ? Number(token.slice(1)) : 1;
        if (!Number.isFinite(layers) || layers < 1) {
          throw new Error(`장애물 겹 수가 이상하다: "${token}" (${r},${c})`);
        }
        cell.blocker = { ...blockerChar, layers };
        return;
      }

      let rest = token;
      // 바닥(하단 레이어)은 뒤에 붙는다. 덮개(~)는 앞에 붙어서 위아래가 표기로도 구분된다.
      const groundAt = rest.indexOf('^');
      if (groundAt >= 0) {
        const digits = rest.slice(groundAt + 1).match(/^\d+/);
        cell.ground = { kind: 'grass', layers: digits ? Number(digits[0]) : 1 };
        rest = rest.slice(0, groundAt) + rest.slice(groundAt + 1 + (digits ? digits[0].length : 0));
        if (rest === '' || rest === '.') return;
      }
      if (rest[0] === '~') {
        const digits = rest.slice(1).match(/^\d+/);
        const layers = digits ? Number(digits[0]) : 1;
        // `~`는 "덮개 씌운 보석"의 기본형이다. 얼음은 덮개가 아니라 칸을 막는
        // 장애물이라 여기 기본값이 될 수 없다.
        cell.cover = { kind: 'roof', layers };
        rest = rest.slice(1 + (digits ? digits[0].length : 0));
      }

      if (rest === 'W') {
        cell.gem = { id: allocGemId(board), color: null, special: 'lightball' };
        return;
      }
      const colorIndex = COLOR_CHARS.indexOf(rest[0] as (typeof COLOR_CHARS)[number]);
      if (colorIndex < 0) throw new Error(`알 수 없는 칸 표기: "${token}" (${r},${c})`);
      const suffix = rest.slice(1);
      if (suffix && !SUFFIX_TO_KIND[suffix]) {
        throw new Error(`알 수 없는 아이템 표기: "${suffix}" (${r},${c})`);
      }
      cell.gem = {
        id: allocGemId(board),
        color: colorIndex as GemColor,
        ...(suffix ? { special: SUFFIX_TO_KIND[suffix] } : {}),
      };
    });
  });
  return board;
}

/** 보드를 다시 글자로. 테스트가 깨졌을 때 무엇이 달라졌는지 눈으로 읽으라고 있는 것. */
export function renderBoard(board: Board): string {
  const grid: string[][] = [];
  for (let r = 0; r < board.height; r++) {
    const tokens: string[] = [];
    for (let c = 0; c < board.width; c++) {
      const cell = at(board, r, c);
      if (!cell.exists) {
        tokens.push('_');
        continue;
      }
      if (cell.blocker) {
        const ch = BLOCKER_CHAR[cell.blocker.kind] ?? '#';
        tokens.push(ch + (cell.blocker.layers > 1 ? String(cell.blocker.layers) : ''));
        continue;
      }
      if (cell.collector) {
        const color = cell.collector.color !== null ? COLOR_CHARS[cell.collector.color] : '';
        tokens.push('=' + color + (cell.collector.need > 1 ? String(cell.collector.need) : ''));
        continue;
      }
      if (cell.spawner) {
        tokens.push('>' + COLOR_CHARS[cell.spawner.color]);
        continue;
      }
      const prefix = cell.cover
        ? '~' + (cell.cover.layers > 1 ? String(cell.cover.layers) : '')
        : '';
      const groundSuffix = cell.ground
        ? '^' + (cell.ground.layers > 1 ? String(cell.ground.layers) : '')
        : '';
      if (!cell.gem) tokens.push((prefix ? prefix + '.' : '.') + groundSuffix);
      else if (cell.gem.special === 'lightball') tokens.push(prefix + 'W' + groundSuffix);
      else {
        const ch = COLOR_CHARS[cell.gem.color as number];
        tokens.push(
          prefix + ch + (cell.gem.special ? KIND_TO_SUFFIX[cell.gem.special] : '') + groundSuffix,
        );
      }
    }
    grid.push(tokens);
  }
  // 열 너비는 보드 전체에서 가장 긴 표기에 맞춘다. 행마다 다르게 하면
  // 두 보드를 나란히 놓고 비교할 때 열이 어긋나 읽을 수가 없다.
  const width = Math.max(2, ...grid.flat().map(t => t.length));
  return grid.map(tokens => tokens.map(t => t.padEnd(width)).join(' ').trimEnd()).join('\n');
}

/** 좌표 집합을 보드 위에 X로 찍어 보여준다. "어디가 터졌나"를 눈으로 확인용. */
export function renderCells(board: Board, cells: Iterable<string>): string {
  const marked = new Set(cells);
  const lines: string[] = [];
  for (let r = 0; r < board.height; r++) {
    const tokens: string[] = [];
    for (let c = 0; c < board.width; c++) tokens.push(marked.has(`${r},${c}`) ? 'X' : '.');
    lines.push(tokens.join(' '));
  }
  return lines.join('\n');
}

/** 테스트에서 기대 좌표를 적기 편하도록 */
export function cells(...keys: string[]): string[] {
  return [...keys].sort();
}
