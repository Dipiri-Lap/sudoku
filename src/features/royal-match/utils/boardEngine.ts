import type { Board, GemType, Position, SpecialKind, Tile } from '../types';

export const BOARD_SIZE = 8;
export const GEM_TYPE_COUNT = 6;
export const GEM_ICONS = ['🍎', '🍇', '🍋', '🍊', '🍉', '🍓'];

let tileIdCounter = 0;
function nextTileId(): number {
  tileIdCounter += 1;
  return tileIdCounter;
}

function randomGemType(): GemType {
  return Math.floor(Math.random() * GEM_TYPE_COUNT) as GemType;
}

function makeTile(type: GemType): Tile {
  return { id: nextTileId(), type };
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(tile => ({ ...tile })));
}

export function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

export function isSamePosition(a: Position | null, b: Position | null): boolean {
  if (!a || !b) return a === b;
  return a.row === b.row && a.col === b.col;
}

// 같은 타일 객체(id 포함)를 통째로 맞바꾼다 - id가 위치를 따라가야
// 화면에서 같은 DOM 요소가 자연스럽게 이동하는 애니메이션이 만들어진다.
export function swapCells(board: Board, a: Position, b: Position): Board {
  const next = cloneBoard(board);
  const tmp = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = tmp;
  return next;
}

// 초기 보드는 3연속(매치) 없이 생성한다.
export function createBoard(): Board {
  const types: GemType[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: GemType[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let gem: GemType;
      let attempts = 0;
      do {
        gem = randomGemType();
        attempts++;
      } while (
        attempts < 20 &&
        ((c >= 2 && row[c - 1] === gem && row[c - 2] === gem) ||
          (r >= 2 && types[r - 1][c] === gem && types[r - 2][c] === gem) ||
          // 2x2 정사각형도 매치이므로 초기 보드에서는 만들지 않는다.
          (r >= 1 &&
            c >= 1 &&
            row[c - 1] === gem &&
            types[r - 1][c - 1] === gem &&
            types[r - 1][c] === gem))
      );
      row.push(gem);
    }
    types.push(row);
  }
  return types.map(row => row.map(makeTile));
}

export type MatchOrientation = 'row' | 'col' | 'square';

export interface MatchGroup {
  cells: string[];
  orientation: MatchOrientation;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): Position {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

// 매치를 "덩어리" 단위로 돌려준다. 몇 칸짜리 어떤 방향의 매치인지 알아야
// 아이템(로켓) 생성 여부와 방향을 정할 수 있기 때문에, 평평한 Set이 아니라
// 그룹 목록이 1차 결과다. Set이 필요한 곳은 findMatches()를 쓴다.
export function findMatchGroups(board: Board): MatchGroup[] {
  const groups: MatchGroup[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= BOARD_SIZE; c++) {
      const prev = board[r][c - 1].type;
      const cur = c < BOARD_SIZE ? board[r][c].type : undefined;
      if (cur === undefined || cur !== prev) {
        if (c - runStart >= 3) {
          const cells: string[] = [];
          for (let k = runStart; k < c; k++) cells.push(cellKey(r, k));
          groups.push({ cells, orientation: 'row' });
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= BOARD_SIZE; r++) {
      const prev = board[r - 1][c].type;
      const cur = r < BOARD_SIZE ? board[r][c].type : undefined;
      if (cur === undefined || cur !== prev) {
        if (r - runStart >= 3) {
          const cells: string[] = [];
          for (let k = runStart; k < r; k++) cells.push(cellKey(k, c));
          groups.push({ cells, orientation: 'col' });
        }
        runStart = r;
      }
    }
  }

  // 2x2 정사각형: 같은 종류 4개가 네모로 모여도 매치로 친다.
  for (let r = 0; r < BOARD_SIZE - 1; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const type = board[r][c].type;
      if (
        board[r][c + 1].type === type &&
        board[r + 1][c].type === type &&
        board[r + 1][c + 1].type === type
      ) {
        groups.push({
          cells: [cellKey(r, c), cellKey(r, c + 1), cellKey(r + 1, c), cellKey(r + 1, c + 1)],
          orientation: 'square',
        });
      }
    }
  }

  return groups;
}

export function findMatches(board: Board): Set<string> {
  const matched = new Set<string>();
  findMatchGroups(board).forEach(g => g.cells.forEach(key => matched.add(key)));
  return matched;
}

export interface SpecialSpawn {
  key: string;
  kind: SpecialKind;
}

// 4칸 이상 일자 매치 하나당 로켓 하나. 방향은 매치 방향과 같다
// (가로 4매치 -> 그 행을 쓸어버리는 가로 로켓).
// 플레이어가 직접 움직인 칸이 그 매치에 포함돼 있으면 손가락이 있던 자리에
// 생기게 해서, 왜 거기 생겼는지가 바로 읽히게 한다.
export function planSpecials(groups: MatchGroup[], preferred: Position[] = []): SpecialSpawn[] {
  const preferredKeys = preferred.map(p => cellKey(p.row, p.col));
  const spawns: SpecialSpawn[] = [];
  const used = new Set<string>();

  groups.forEach(group => {
    if (group.orientation === 'square' || group.cells.length < 4) return;
    const key =
      group.cells.find(c => preferredKeys.includes(c) && !used.has(c)) ??
      group.cells[Math.floor(group.cells.length / 2)];
    if (used.has(key)) return;
    used.add(key);
    spawns.push({ key, kind: group.orientation === 'row' ? 'rocket-h' : 'rocket-v' });
  });

  return spawns;
}

// 삭제 대상에 로켓이 포함돼 있으면 그 행/열을 통째로 삭제 대상에 더한다.
// 새로 딸려 들어온 칸에 또 로켓이 있으면 그것도 터진다(연쇄 발사).
export function expandSpecials(board: Board, cells: Set<string>): Set<string> {
  const out = new Set(cells);
  const queue = [...cells];

  while (queue.length > 0) {
    const { row, col } = parseCellKey(queue.pop() as string);
    const kind = board[row][col].special;
    if (!kind) continue;

    const blast: string[] = [];
    if (kind === 'rocket-h') {
      for (let c = 0; c < BOARD_SIZE; c++) blast.push(cellKey(row, c));
    } else {
      for (let r = 0; r < BOARD_SIZE; r++) blast.push(cellKey(r, col));
    }

    blast.forEach(key => {
      if (out.has(key)) return;
      out.add(key);
      queue.push(key);
    });
  }

  return out;
}

// 아이템이 생길 칸의 타일을 그 자리에서 로켓으로 바꾼다. id를 그대로 두어야
// 그 칸이 "사라졌다 새로 생긴" 게 아니라 "변신한" 것으로 렌더링된다.
export function markSpecials(board: Board, spawns: SpecialSpawn[]): Board {
  if (spawns.length === 0) return board;
  const next = cloneBoard(board);
  spawns.forEach(({ key, kind }) => {
    const { row, col } = parseCellKey(key);
    next[row][col] = { ...next[row][col], special: kind };
  });
  return next;
}

// 매치된 칸을 비우고, 남은 타일은 그대로(같은 id) 아래로 내려앉힌 뒤
// 빈 윗자리만 새 타일로 채운다. 새 타일에는 보드 위쪽 가상 행(spawnRow, 음수)을
// 기록해 두어, 화면에서 "천장 위에서 줄지어 떨어져 들어오는" 낙하 애니메이션의
// 시작점으로 쓴다. 살아남은 타일은 id가 유지되므로 자연스럽게 이어서 떨어진다.
export function applyGravity(board: Board, cleared: Set<string>): Board {
  // spawnRow는 "이번에 위에서 떨어져 들어왔다"는 일회성 표시라 반드시 털어내고,
  // special(로켓)은 타일에 붙어 다니는 속성이므로 유지한다.
  const next: (Tile | null)[][] = board.map(row =>
    row.map(tile =>
      tile.special ? { id: tile.id, type: tile.type, special: tile.special } : { id: tile.id, type: tile.type },
    ),
  );
  cleared.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    next[r][c] = null;
  });

  for (let c = 0; c < BOARD_SIZE; c++) {
    // 아래에서 위로 훑어 살아남은 타일을 순서대로 모은다.
    const remaining: Tile[] = [];
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      const tile = next[r][c];
      if (tile !== null) remaining.push(tile);
    }

    // 부족한 만큼 새 타일을 만든다. 컬럼에서 위로 갈수록 더 높은 곳(-1, -2, ...)에서
    // 출발하도록 spawnRow를 매겨 한 줄로 늘어선 채 내려오게 한다.
    const missing = BOARD_SIZE - remaining.length;
    for (let i = 0; i < missing; i++) {
      const tile = makeTile(randomGemType());
      // remaining은 아래→위 순서이므로, i번째 새 타일이 놓일 최종 행은 missing-1-i
      tile.spawnRow = -1 - i;
      remaining.push(tile);
    }

    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      next[r][c] = remaining[BOARD_SIZE - 1 - r];
    }
  }

  return next as Board;
}

export function scoreForMatch(matchedCount: number, combo: number): number {
  return matchedCount * 10 * combo;
}

export function hasAnyValidMove(board: Board): boolean {
  // 로켓은 아무 방향으로나 스왑하면 발사되므로, 보드에 로켓이 하나라도 있으면
  // 항상 둘 수 있는 수가 있다. (리셔플로 플레이어의 로켓을 날려버리지 않기 위함)
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].special) return true;
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c < BOARD_SIZE - 1) {
        const swapped = swapCells(board, { row: r, col: c }, { row: r, col: c + 1 });
        if (findMatches(swapped).size > 0) return true;
      }
      if (r < BOARD_SIZE - 1) {
        const swapped = swapCells(board, { row: r, col: c }, { row: r + 1, col: c });
        if (findMatches(swapped).size > 0) return true;
      }
    }
  }
  return false;
}

export function createPlayableBoard(): Board {
  let board = createBoard();
  let attempts = 0;
  while (!hasAnyValidMove(board) && attempts < 50) {
    board = createBoard();
    attempts++;
  }
  return board;
}

// 보드 전체를 위에서 쏟아붓듯 등장시키고 싶을 때(첫 시작/리셔플) 쓰는 헬퍼.
export function withSpawnFromAbove(board: Board): Board {
  return board.map((row, r) =>
    row.map(tile => ({ ...tile, spawnRow: r - BOARD_SIZE })),
  );
}
