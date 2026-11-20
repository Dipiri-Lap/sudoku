import type { Board, Position, SpecialKind } from './types';
import { at, cloneBoard } from './board';
import { isColorless } from './specials';

/**
 * 스킬 — 장착해 두고 게이지가 차면 쓰는 아이템.
 *
 * 매치로 나오는 기본 아이템(삽·거름포대·참새·무지개꽃)과 개수제 부스터는 그대로 두고,
 * 그 밖의 다양한 능력은 전부 스킬로 쓴다. 스킬마다 게이지가 따로 있어서 칸을 지울
 * 때마다 함께 차고, 비용(=게이지 크기)이 꽉 차면 원하는 칸에 써서 바로 터뜨린다.
 *
 * 세기는 비용으로 맞춘다. 쟁기처럼 센 것은 비싸서 드물게, 제비처럼 약한 것은 싸서
 * 자주 쓴다 - 그래서 아이템 종류를 계속 늘려도 판이 망가지지 않는다.
 * 비용의 기준은 7×7 판에서 평균 몇 칸을 지우는가(blastArea 측정값)다.
 */
export interface SkillDef {
  kind: SpecialKind;
  label: string;
  desc: string;
  /** 게이지 크기. 지운 칸 하나가 1이다 */
  cost: number;
}

export const SKILLS: SkillDef[] = [
  { kind: 'butterfly', label: '제비', desc: '두 마리가 목표 두 곳을 콕', cost: 20 },
  { kind: 'sickle', label: '낫', desc: '대각선 X자 두 줄', cost: 25 },
  { kind: 'ladybug', label: '개구리', desc: '목표로 폴짝 뛰어 3×3', cost: 25 },
  { kind: 'dandelion', label: '민들레', desc: '홀씨가 목표 열 곳을 콕콕', cost: 30 },
  { kind: 'watermelon', label: '수박폭탄', desc: '제자리 3×3 + 목표 3×3', cost: 40 },
  { kind: 'scarecrow', label: '허수아비', desc: '가로세로 십자 + 까마귀 전부', cost: 40 },
  { kind: 'plow', label: '쟁기', desc: '3줄 두께로 좌우 3칸씩', cost: 45 },
  { kind: 'sprinkler', label: '스프링클러', desc: '마름모 모양으로 넓게', cost: 50 },
  { kind: 'watering-can', label: '물뿌리개', desc: '잡초·덮개 있는 칸 전부', cost: 50 },
];

/** 스킬 칸은 최대 셋. 레벨이 오르면 하나씩 열린다 */
export const MAX_SKILL_SLOTS = 3;
const SLOT_UNLOCK_LEVELS = [1, 6, 12];

export const DEFAULT_SKILLS: SpecialKind[] = ['butterfly'];

export function skillDef(kind: SpecialKind): SkillDef | undefined {
  return SKILLS.find(s => s.kind === kind);
}

/** 이 레벨에서 열려 있는 스킬 칸 수 */
export function skillSlotsFor(levelId: number): number {
  return SLOT_UNLOCK_LEVELS.filter(l => levelId >= l).length;
}

/** 다음 칸이 열리는 레벨. 다 열렸으면 null */
export function nextSlotLevel(levelId: number): number | null {
  return SLOT_UNLOCK_LEVELS.find(l => levelId < l) ?? null;
}

/** 저장된 장착을 믿을 수 있는 값으로 고친다. 모르는 종류·중복은 버리고 칸 수만큼 자른다 */
export function sanitizeSkills(raw: unknown, slots: number = MAX_SKILL_SLOTS): SpecialKind[] {
  if (!Array.isArray(raw)) return DEFAULT_SKILLS.slice(0, slots);
  const out: SpecialKind[] = [];
  raw.forEach(v => {
    if (typeof v === 'string' && SKILLS.some(s => s.kind === v) && !out.includes(v as SpecialKind)) {
      out.push(v as SpecialKind);
    }
  });
  return out.slice(0, slots);
}

/** 게이지를 채운다. 꽉 찬 뒤에는 더 쌓이지 않는다(아껴 두는 이득이 없게) */
export function chargeSkills(
  gauges: Partial<Record<SpecialKind, number>>,
  equipped: SpecialKind[],
  cleared: number,
): Partial<Record<SpecialKind, number>> {
  const next = { ...gauges };
  equipped.forEach(kind => {
    const cost = skillDef(kind)?.cost ?? Infinity;
    next[kind] = Math.min(cost, (next[kind] ?? 0) + Math.max(0, cleared));
  });
  return next;
}

export function isSkillReady(gauges: Partial<Record<SpecialKind, number>>, kind: SpecialKind): boolean {
  const cost = skillDef(kind)?.cost;
  return cost !== undefined && (gauges[kind] ?? 0) >= cost;
}

/** 스킬을 쓸 수 있는 칸: 아이템을 심는 부스터와 같다(보석이 있고, 덮개·장애물·수집물이 아니어야) */
export function canUseSkillAt(board: Board, pos: Position): boolean {
  const cell = at(board, pos.row, pos.col);
  if (!cell.exists || !cell.gem || cell.gem.inert) return false;
  return cell.cover === null && cell.blocker === null;
}

/** 지목한 칸의 보석을 그 스킬 아이템으로 바꾼다. 색 없는 아이템이면 색을 지운다 */
export function plantSkill(board: Board, pos: Position, kind: SpecialKind): Board {
  const next = cloneBoard(board);
  const cell = at(next, pos.row, pos.col);
  if (!cell.gem) return board;
  cell.gem = { ...cell.gem, special: kind, color: isColorless(kind) ? null : cell.gem.color };
  return next;
}
