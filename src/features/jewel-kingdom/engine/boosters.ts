import type { Board, Position, SpecialKind } from './types';
import { at, cloneBoard, key } from './board';

/**
 * 부스터 — 플레이어가 들고 있다가 판에서 쓰는 소모품.
 *
 * 매치로 만드는 아이템과 다른 점:
 *  - 개수가 정해져 있고 쓰면 줄어든다
 *  - 원하는 칸을 직접 지목한다 (매치는 어디에 생길지 고를 수 없다)
 *  - **이동 횟수를 소모하지 않는다** — 그래서 값어치가 있다 (SPEC 11.3)
 */
export type BoosterKind =
  /** 지목한 칸 하나를 부순다. 장애물도 한 겹 깎는다 */
  | 'hammer'
  /** 지목한 칸을 그 아이템으로 바꿔 즉시 터뜨린다 */
  | 'rocket'
  | 'tnt'
  | 'propeller'
  | 'lightball'
  /** 판 전체를 다시 섞는다. 칸을 지목하지 않는다 */
  | 'shuffle';

export interface BoosterDef {
  kind: BoosterKind;
  label: string;
  /** 칸을 지목해야 하는가. false면 누르는 즉시 발동한다 */
  needsTarget: boolean;
  /** 이 레벨 이상부터 열린다 */
  unlockLevel: number;
}

export const BOOSTERS: BoosterDef[] = [
  { kind: 'hammer', label: '망치', needsTarget: true, unlockLevel: 1 },
  { kind: 'rocket', label: '로켓', needsTarget: true, unlockLevel: 1 },
  { kind: 'tnt', label: 'TNT', needsTarget: true, unlockLevel: 2 },
  { kind: 'propeller', label: '프로펠러', needsTarget: true, unlockLevel: 3 },
  { kind: 'lightball', label: '라이트볼', needsTarget: true, unlockLevel: 4 },
  { kind: 'shuffle', label: '섞기', needsTarget: false, unlockLevel: 5 },
];

export type Inventory = Record<BoosterKind, number>;

export function startingInventory(): Inventory {
  return { hammer: 3, rocket: 2, tnt: 2, propeller: 1, lightball: 1, shuffle: 1 };
}

export function boosterDef(kind: BoosterKind): BoosterDef {
  return BOOSTERS.find(b => b.kind === kind) as BoosterDef;
}

/** 부스터가 심을 아이템. 망치·섞기는 아이템을 심지 않는다. */
export function specialFor(kind: BoosterKind, pos: Position): SpecialKind | null {
  switch (kind) {
    case 'rocket':
      // 방향은 지목한 칸에 따라 갈린다. 늘 같은 방향이면 한 축으로만 쓸린다.
      return (pos.row + pos.col) % 2 === 0 ? 'rocket-h' : 'rocket-v';
    case 'tnt':
      return 'tnt';
    case 'propeller':
      return 'propeller';
    case 'lightball':
      return 'lightball';
    default:
      return null;
  }
}

/** 그 칸에 이 부스터를 쓸 수 있는가 */
export function canUseAt(board: Board, pos: Position, kind: BoosterKind): boolean {
  const cell = at(board, pos.row, pos.col);
  if (!cell.exists) return false;
  // 수집물은 부스터로도 못 없앤다 - 폭발 면역과 같은 이유다(SPEC 6.24).
  if (cell.gem?.inert) return false;
  if (kind === 'hammer') return cell.gem !== null || cell.blocker !== null;
  // 아이템을 심는 부스터는 보석이 있어야 한다. 덮개가 씌워져 있으면 못 쓴다.
  return cell.gem !== null && cell.cover === null && cell.blocker === null;
}

/**
 * 지목한 칸에 부스터 아이템을 심는다. 심은 뒤 그 칸을 씨앗으로 연쇄를 돌리면
 * 매치로 만든 아이템과 똑같이 동작한다 - 발동 규칙을 두 벌 만들 필요가 없다.
 */
export function plantBooster(board: Board, pos: Position, kind: BoosterKind): Board {
  const special = specialFor(kind, pos);
  if (!special) return board;
  const next = cloneBoard(board);
  const cell = at(next, pos.row, pos.col);
  if (!cell.gem) return board;
  cell.gem = {
    ...cell.gem,
    special,
    color: special === 'lightball' ? null : cell.gem.color,
  };
  return next;
}

export function targetKey(pos: Position): string {
  return key(pos.row, pos.col);
}
