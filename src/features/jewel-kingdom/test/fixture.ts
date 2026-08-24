import type { Board, GemColor, SpecialKind } from '../engine/types';
import { allocGemId, at, createBoard } from '../engine/board';

/**
 * 보드를 글자로 적는다. 규칙 명세를 테스트로 옮길 때 이게 없으면
 * 보드 하나 만드는 데 20줄이 들고, 실패 메시지를 읽을 수 없다.
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
    tokens.forEach((token, c) => {
      const cell = at(board, r, c);
      if (token === '.') return;
      if (token === '_') {
        cell.exists = false;
        return;
      }
      if (token[0] === '#') {
        const layers = token.length > 1 ? Number(token.slice(1)) : 1;
        if (!Number.isFinite(layers) || layers < 1) {
          throw new Error(`장애물 겹 수가 이상하다: "${token}" (${r},${c})`);
        }
        cell.blocker = { kind: 'box', layers };
        return;
      }

      let rest = token;
      if (rest[0] === '~') {
        const digits = rest.slice(1).match(/^\d+/);
        const layers = digits ? Number(digits[0]) : 1;
        cell.cover = { kind: 'ice', layers };
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
        tokens.push('#' + (cell.blocker.layers > 1 ? String(cell.blocker.layers) : ''));
        continue;
      }
      const prefix = cell.cover
        ? '~' + (cell.cover.layers > 1 ? String(cell.cover.layers) : '')
        : '';
      if (!cell.gem) tokens.push(prefix ? prefix + '.' : '.');
      else if (cell.gem.special === 'lightball') tokens.push(prefix + 'W');
      else {
        const ch = COLOR_CHARS[cell.gem.color as number];
        tokens.push(prefix + ch + (cell.gem.special ? KIND_TO_SUFFIX[cell.gem.special] : ''));
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
