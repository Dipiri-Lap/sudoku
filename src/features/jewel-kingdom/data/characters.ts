import type { SpecialKind } from '../engine/types';

/**
 * 고를 수 있는 캐릭터. 캐릭터마다 스킬이 하나 붙어 있다.
 *
 * 예전에는 스킬을 칸에 직접 장착했는데(engine/skills.ts의 칸 1~3개), "누가 도와주는가"가
 * 보이는 편이 정이 가고 고르기도 쉽다는 판단으로 캐릭터를 고르면 그 캐릭터의 스킬을 쓰는
 * 방식으로 바꿨다. 스킬의 동작·게이지 비용은 그대로 skills.ts를 쓴다.
 */
export interface Character {
  id: string;
  name: string;
  /** 상반신 그림(아래 정렬). 상단 판 가운데 아치 창문에 앉고 머리는 틀 위로 살짝 튀어나온다 */
  face: string;
  /** 이 캐릭터의 스킬 */
  skill: SpecialKind;
  /** 고르는 화면에 쓸 한 줄 소개 */
  intro: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'hedgehog',
    name: '밤톨이',
    face: '/assets/3match/chars/hedgehog.png',
    skill: 'sprinkler',
    intro: '밤송이 가시가 자랑인 꼬마 고슴도치 정원사. 스프링클러로 밭을 넓게 적셔요',
  },
];

export const DEFAULT_CHARACTER = CHARACTERS[0];
