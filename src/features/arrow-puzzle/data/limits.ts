/**
 * 지금 플레이할 수 있는 애로우웨이 스테이지 수.
 *
 * 생성한 스테이지는 1000개지만 901번부터는 아직 공개하지 않는다. 전체 원본은 stages.full.json 이고(앱이 불러오지 않는다),
 * 앱은 scripts/split-arrow-stages.mjs 로 나눈 100개 묶음(data/stages/*.json)을 stageLoader.ts 로 필요할 때만 받는다.
 * 공개 범위를 늘릴 때는 이 값을 올리고, stageLoader.ts 에서 새로 공개되는 묶음의 DEV 조건을 푼다.
 * 도전과제도 이 값을 넘는 목표(500·700·1000 스테이지)는 숨긴다.
 */
export const ARROW_MAX_STAGE = import.meta.env.DEV ? 1000 : 900; // 로컬(dev)에서는 1000개 전부 플레이 가능
