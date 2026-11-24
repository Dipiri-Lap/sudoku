import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Music, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { isMusicMuted, isMuted, playSfx, setMusicMuted, setMuted, startBgm, stopBgm, unlockAudio } from './sound';
import { playStepSounds } from './stepSounds';
import { at, cloneBoard, isCellSwappable, emptyCell, isAdjacent, key, makeGem, parseKey } from '../engine/board';
import { activateAt, hasAnyMove, listMoves, resolveTurn, activateBooster, activateSkill } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { findHint, type Hint } from '../engine/hint';
import { applyBooster, applyTurn, resolveOptionsFor, startLevel } from '../engine/level';
import { applyGravity } from '../engine/gravity';
import { elementById } from '../data/elements';
import {
  BOOSTERS,
  canUseAt,
  startingInventory,
  type BoosterKind,
  type Inventory,
} from '../engine/boosters';
import { describeGoal } from '../engine/goals';
import { reshuffle } from '../bot/bot';
import { LEVELS, SANDBOX_LEVEL } from '../data/levels';
import { TEST_LEVELS, testLevelElement } from '../data/testLevels';
import { GENERATED_LEVELS } from '../data/generated';

/**
 * 고르는 판 = 스테이지(생성 레벨 1~1000) + 손으로 만든 레벨 + 요소별 시험 레벨.
 *
 * 플레이어는 스테이지 1부터 시작해 "다음 레벨"로 이어 간다. 손으로 만든 레벨과
 * 시험 레벨은 개발 서랍에서만 고른다. 한 목록에 잇는 이유: "다음 레벨"과
 * "다시 시작"이 두 벌로 갈라지지 않는다. 목록에서만 줄이 나뉜다.
 */
const ALL_LEVELS = [...GENERATED_LEVELS, ...LEVELS, ...TEST_LEVELS];
/** 스테이지 번호(1부터) → ALL_LEVELS 자리. 없는 번호면 마지막 스테이지 */
export function stageIndexOf(stage: number): number {
  const i = GENERATED_LEVELS.findIndex(l => Number(l.label) === stage);
  return i >= 0 ? i : GENERATED_LEVELS.length - 1;
}
export const STAGE_COUNT = GENERATED_LEVELS.length;
/** 로비의 시작 전 창에서 목표를 미리 보여 줄 때 쓴다 */
export function stageLevel(stage: number) {
  return GENERATED_LEVELS[stageIndexOf(stage)];
}
const HAND_OFFSET = GENERATED_LEVELS.length;
const TEST_OFFSET = GENERATED_LEVELS.length + LEVELS.length;

const TIER_BADGE: Record<string, string> = { hard: '어려운 판', super: '아주 어려운 판' };
import type { Board, GemColor, Position } from '../engine/types';
import SandboxPalette, { type PaintTool } from './SandboxPalette';
import {
  BlockerSprite,
  BoosterSprite,
  CargoSprite,
  CollectorSprite,
  CoverSprite,
  GroundSprite,
  SpawnerSprite,
} from './sprites';
import { usePlayback } from './usePlayback';
import FxLayer from './fx/FxLayer';
import { canUseSkillAt, chargeSkills, isSkillReady, skillDef } from '../engine/skills';
import { DEFAULT_CHARACTER } from '../data/characters';
import type { SpecialKind } from '../engine/types';
import { LAND_MS, MERGE_MS, SWAP_EASE, SWAP_MS, fallDelays, fallDurationMs, fallKeyframes } from './constants';
import { fallDistance } from '../engine/gravity';
import './JewelKingdomGame.css';

const COMMIT_RATIO = 0.6; // 셀 크기의 60% 이상 끌어야 방향이 확정된다

/**
 * 텃밭 컨셉: 블록은 색마다 채소 하나, 아이템은 색 없는 도구 하나씩이다.
 * 아이템은 색 매치 역할을 잃으므로(SPEC 3.11, matchColorOf) 그림도 색을
 * 따르지 않는다 - 무슨 색에서 왔는지보다 "무슨 아이템인지"가 읽혀야 한다.
 *   로켓=삽(세로 로켓은 CSS로 90도 돌린다) / TNT=거름 포대 / 프로펠러=도토리 / 라이트볼=무지개 꽃
 */
const ITEM_SPRITE: Record<string, string> = {
  'rocket-h': 'rocket',
  'rocket-v': 'rocket',
  tnt: 'tnt',
  propeller: 'propeller',
  lightball: 'lightball',
};

function spriteFor(color: number | null, special?: string): string {
  // 장착 아이템(낫·제비 등)은 종류 이름이 곧 파일 이름이다.
  if (special) return `/assets/3match/items/${ITEM_SPRITE[special] ?? special}.png`;
  return `/assets/3match/gems/gem-${color}.png`;
}

/** 칸이 사라지기 시작할 시각을 CSS 변수로 넘긴다(이펙트 물결). 0이면 안 붙인다. */
function withDelay(style: React.CSSProperties, delay: number | undefined): React.CSSProperties {
  if (!delay) return style;
  return { ...style, ['--d' as string]: `${Math.round(delay)}ms` };
}

type Gauges = Partial<Record<SpecialKind, number>>;

interface DragState {
  pos: Position;
  x: number;
  y: number;
  cellSize: number;
}

/**
 * 로비(Pop Garden 껍데기)에서 띄울 때 넘기는 것들. 하나도 안 넘기면 예전처럼 혼자 도는
 * 개발용 화면이다(다음 레벨로 바로 넘어감).
 */
export interface GameHostProps {
  /** 시작할 판(ALL_LEVELS 자리) */
  startIndex?: number;
  /** 클리어 창에서 "계속"을 누름 */
  onWin?: () => void;
  /** 실패 후 "로비로" */
  onLose?: () => void;
  /** 판 도중 일시정지 메뉴에서 "로비로" */
  onQuit?: () => void;
  /** 다시 하기(하트를 하나 쓴다). false면 하트가 없어 못 한다 */
  onRetry?: () => boolean;
  /** 클리어 보상 코인(클리어 창에 보여 준다) */
  winCoins?: number;
  /** 실패 후 "N수 더" - 코인을 쓴다. false면 코인이 모자라다 */
  onBuyMoves?: () => boolean;
  buyMovesCost?: number;
  buyMovesCount?: number;
}

const JewelKingdomGame: React.FC<GameHostProps> = ({
  startIndex = 0,
  onWin,
  onLose,
  onQuit,
  onRetry,
  winCoins,
  onBuyMoves,
  buyMovesCost,
  buyMovesCount = 5,
}) => {
  const hosted = !!onWin;
  // 난수원과 레벨 상태를 한 번에 만든다. useState의 지연 초기화라 렌더마다
  // 다시 실행되지 않는다 - 렌더 중에 Date.now()를 부르면 리렌더할 때마다
  // 다른 값이 나와 화면이 예측 불가능해진다.
  const [game, setGame] = useState(() => {
    const rng = makeRng(Date.now() >>> 0);
    return { rng, level: startLevel(ALL_LEVELS[startIndex] ?? ALL_LEVELS[0], rng) };
  });
  const [inventory, setInventory] = useState<Inventory>(startingInventory);
  /** 샌드박스에서 지금 들고 있는 도구. null이면 평소처럼 플레이한다. */
  const [tool, setTool] = useState<PaintTool | null>(null);
  const [paintLayers, setPaintLayers] = useState(1);
  const [sandbox, setSandbox] = useState(false);
  /** 지금 겨누고 있는 부스터. 칸을 지목해야 발동한다. */
  const [armed, setArmed] = useState<BoosterKind | null>(null);
  /** 함께하는 캐릭터. 캐릭터마다 스킬이 하나 있다(지금은 샘플 한 명) */
  const character = DEFAULT_CHARACTER;
  /** 스킬별 게이지. 판마다 0에서 시작한다 */
  const [gauges, setGauges] = useState<Gauges>({});
  /** 지금 겨누고 있는 스킬. 칸을 지목해야 발동한다 */
  const [armedSkill, setArmedSkill] = useState<SpecialKind | null>(null);
  /** 개발 서랍(레벨·시험 목록)이 열려 있는가. 개발 서버에서만 쓴다. */
  const [devOpen, setDevOpen] = useState(false);
  /** 소리 끔(기기에 기억) */
  const [soundOff, setSoundOff] = useState(isMuted);
  const [musicOff, setMusicOff] = useState(isMusicMuted);
  /** 일시정지 메뉴(로비에서 띄운 경우) */
  const [paused, setPaused] = useState(false);
  /** "N수 더"를 눌렀는데 코인이 모자람 */
  const [noCoins, setNoCoins] = useState(false);
  const { view, play, reset } = usePlayback(game.level.board);

  // 배경음악: 플레이 곡. 로비에서 띄웠으면 떠날 때 끄지 않는다 - 로비가 이어서 자기 곡으로 바꾼다
  useEffect(() => {
    startBgm('play');
    if (!hosted) return stopBgm;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boardRef = useRef<HTMLDivElement>(null);
  const cellElsRef = useRef<Map<number, HTMLElement>>(new Map());
  const prevPosRef = useRef<Map<number, Position>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const [grabbed, setGrabbed] = useState<Position | null>(null);
  /** 큰 폭발 때 흔들 판 바깥 상자 */
  const boardOuterRef = useRef<HTMLDivElement>(null);

  // 앱 공통 틀(#root)의 최대 폭 500px·여백을 이 화면에서만 푼다 - 판이 화면 폭을
  // 끝까지 써야 블록이 크게 보인다. 가이드 화면과 같은 방식(body 클래스).
  useEffect(() => {
    document.body.classList.add('jk-body');
    return () => document.body.classList.remove('jk-body');
  }, []);

  // 판은 가로 W칸 × 세로 H칸(세로로 길 수 있다). 칸은 정사각형이라 위치 비율만 다르다
  const size = view.board.width;
  const rowsN = view.board.height;
  const cellPct = 100 / size;
  const cellPctY = 100 / rowsN;
  const level = game.level;
  /** 화면에 보이는 스테이지 번호. 생성 레벨은 내부 번호(1000+n)와 다르다 */
  const stageNo = Number(level.level.label ?? level.level.id);
  // 게이지를 채우는 스킬은 캐릭터의 스킬 하나다
  const equipped: SpecialKind[] = [character.skill];
  // 샌드박스에서는 게이지가 늘 차 있다 - 같은 스킬을 반복해서 시험해야 한다.
  const skillReady = (kind: SpecialKind) => sandbox || isSkillReady(gauges, kind);

  const loadLevel = useCallback(
    (index: number) => {
      const rng = makeRng(Date.now() >>> 0);
      const next = startLevel(ALL_LEVELS[index], rng);
      setGame({ rng, level: next });
      setArmed(null);
      setArmedSkill(null);
      setGauges({});
      setTool(null);
      setSandbox(false);
      reset(next.board);
    },
    [reset],
  );

  const openSandbox = useCallback(() => {
    const rng = makeRng(Date.now() >>> 0);
    const next = startLevel(SANDBOX_LEVEL, rng);
    setGame({ rng, level: next });
    setArmed(null);
    setArmedSkill(null);
    setGauges({});
    setSandbox(true);
    reset(next.board);
  }, [reset]);

  /**
   * 판에 요소를 찍는다. 찍은 뒤 한 번 가라앉혀서 늘 유효한 판을 유지한다 -
   * 장애물을 놓아 생긴 빈칸이 그대로 남으면 이후 동작이 전부 이상해진다.
   */
  const paintAt = (pos: Position) => {
    if (!tool) return;
    const board = cloneBoard(game.level.board);
    const idx = pos.row * board.width + pos.col;
    const cell = board.cells[idx];

    if (tool.kind === 'wall') {
      cell.walls = { ...(cell.walls ?? {}), [tool.side]: !cell.walls?.[tool.side] };
    } else {
      // 찍기는 덮어쓰기다. 남은 층이 섞이면 무엇을 보고 있는지 알 수 없다.
      board.cells[idx] = { ...emptyCell(), walls: cell.walls };
      const fresh = board.cells[idx];
      if (tool.kind === 'gem' || tool.kind === 'erase') {
        fresh.gem = makeGem(board, (pos.col % 5) as GemColor);
      } else {
        const def = elementById(tool.id);
        def?.apply(fresh, tool.layers, (pos.col % 5) as GemColor);
      }
    }

    const settled = applyGravity(board, new Set(), game.rng, game.level.level.colors);
    const level = { ...game.level, board: settled.board };
    setGame(g => ({ ...g, level }));
    reset(settled.board);
  };

  // FLIP: 보석의 그리드 좌표가 바뀌면, 바뀌기 직전 화면 위치에서 지금 자리로
  // 미끄러지는 애니메이션을 건다.
  //
  // 인라인 style 대신 Web Animations API를 쓴다. 인라인 transform은 React가
  // 같은 요소를 다시 렌더할 때 덮어써질 수 있고, 실제로 그 때문에 보석 몇 개가
  // 판 위쪽에 transform이 걸린 채 얼어붙어 화면에 구멍처럼 보였다.
  // WAAPI 애니메이션은 렌더와 무관하게 돌고 끝나면 스스로 원래 자리로 돌아온다.
  //
  // 낙하는 엔진이 fromRow/fromCol을 주므로 그걸 쓰고(새 보석은 이전 위치가 아예
  // 없으니 판 위쪽 음수 행에서 출발한다), 스왑·되돌리기는 직전 렌더의 위치와
  // 비교해서 구한다.
  useLayoutEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const cellSize = boardEl.clientWidth / size;

    const nextPos = new Map<number, Position>();
    for (let r = 0; r < view.board.height; r++) {
      for (let c = 0; c < view.board.width; c++) {
        const gem = at(view.board, r, c).gem;
        if (gem) nextPos.set(gem.id, { row: r, col: c });
      }
    }
    // id가 -1인 이동은 굴러떨어지는 장애물이라 보석 애니메이션 대상이 아니다.
    const fallById = new Map(view.falling.filter(m => m.id >= 0).map(m => [m.id, m]));
    // 줄줄이 내려오기: 위 보석일수록 늦게 출발
    const delays = fallDelays(view.falling);
    const delayById = new Map(view.falling.map((m, i) => [m.id, delays[i]]));
    const running: Animation[] = [];
    // 합체 스왑: 자리를 바꾸지 않고 끈 아이템(a)이 놓은 칸(b)으로 빨려 들어가 둘이 감기며 사라진다
    const mergeStep = view.step?.kind === 'swap' && view.step.merge ? view.step : null;

    nextPos.forEach((pos, id) => {
      const el = cellElsRef.current.get(id);
      if (!el) return;

      const fall = fallById.get(id);
      // 대각선으로 흘러들어온 보석은 열도 바뀌므로 fromCol을 그대로 쓴다.
      const prev = fall ? { row: fall.fromRow, col: fall.fromCol } : prevPosRef.current.get(id);
      if (!prev || (prev.row === pos.row && prev.col === pos.col)) return;

      const dx = (prev.col - pos.col) * cellSize;
      const dy = (prev.row - pos.row) * cellSize;
      const dropping = !!fall && dy < 0;

      if (mergeStep) {
        // 보드는 이미 바뀐 자리다: b에 있는 건 a에서 온 아이템, a에 있는 건 원래 b의 아이템
        const atB = pos.row === mergeStep.b.row && pos.col === mergeStep.b.col;
        // 원래 b의 아이템은 b 자리에 그대로 머문다(보드상 a에 있으므로 원래 자리 b만큼 밀어 둔다)
        const stay = atB ? null : `translate(${dx}px, ${dy}px)`;
        const from = atB ? `translate(${dx}px, ${dy}px)` : stay!;
        const mid = atB ? 'translate(0px, 0px)' : stay!;
        const turn = atB ? 1 : -1;
        running.push(
          el.animate(
            [
              { transform: `${from} scale(1) rotate(0deg)`, opacity: 1, offset: 0 },
              { transform: `${mid} scale(1.08) rotate(${turn * 40}deg)`, opacity: 1, offset: 0.45 },
              { transform: `${mid} scale(0.5) rotate(${turn * 220}deg)`, opacity: 1, offset: 0.85 },
              { transform: `${mid} scale(0.2) rotate(${turn * 300}deg)`, opacity: 0, offset: 1 },
            ],
            { duration: MERGE_MS, easing: 'ease-in', fill: 'forwards' },
          ),
        );
        return;
      }

      // 낙하는 엔진이 기록한 경로를 그대로 따라간다(아래 → 막히면 대각선 → 다시 아래).
      // 출발·도착만 잇는 직선이면 대각선이 처음부터 일어난 것처럼 비스듬히 미끄러진다.
      const anim = dropping
        ? el.animate(
            fallKeyframes(fall).map(f => ({
              transform: `translate(${f.dx * cellSize}px, ${f.dy * cellSize}px)`,
              offset: f.offset,
            })),
            {
              duration: fallDurationMs(fallDistance(fall)),
              easing: 'linear',
              // 출발을 기다리는 동안에도 원래 자리(위)에 머물러 있어야 한다
              delay: delayById.get(id) ?? 0,
              fill: 'backwards',
            },
          )
        : el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
            duration: SWAP_MS,
            easing: SWAP_EASE,
          });
      running.push(anim);

      if (dropping) {
        anim.finished
          .then(() => {
            // 착지: 납작 → 작게 통 튀기 → 살짝 눌렸다 제자리. 낙하가 실제로 끝난 뒤에만 얹는다.
            const hop = cellSize * 0.07;
            el.animate(
              [
                { transform: 'translateY(0) scaleY(0.84) scaleX(1.12)' },
                { transform: `translateY(${-hop}px) scaleY(1.04) scaleX(0.97)`, offset: 0.4 },
                { transform: 'translateY(0) scaleY(0.95) scaleX(1.04)', offset: 0.75 },
                { transform: 'translateY(0) scale(1)' },
              ],
              { duration: LAND_MS, easing: 'ease-out' },
            );
          })
          .catch(() => {
            /* 재생이 중간에 끊기면 스쿼시도 생략한다 */
          });
      }
    });

    prevPosRef.current = nextPos;
    return () => running.forEach(a => a.cancel());
  }, [view.tick, view.board, view.falling, size]);

  const runTurn = (result: ReturnType<typeof resolveTurn>) => {
    const nextLevel = applyTurn(level, result);
    // 내가 둔 수로 지운 칸만큼 스킬 게이지가 찬다. 부스터·스킬로 지운 칸은 치지 않는다 -
    // 스킬이 스킬을 채우면 연달아 쓰게 된다.
    if (result.valid) setGauges(g => chargeSkills(g, equipped, result.clearedCount));
    play(result.steps, () => {
      // 수가 없으면 다시 섞는다. 규칙이 아니라 진행 편의라 UI에 둔다.
      if (nextLevel.status === 'playing' && !hasAnyMove(nextLevel.board)) {
        const shuffled = reshuffle(nextLevel.board, game.rng, nextLevel.level.colors);
        setGame(g => ({ ...g, level: { ...nextLevel, board: shuffled } }));
        reset(shuffled);
        return;
      }
      setGame(g => ({ ...g, level: nextLevel }));
    });
  };

  const canPlay = !view.playing && level.status === 'playing';

  // 힌트: 손을 놓고 몇 초 지나면 둘 수 있는 한 수를 살짝 흔들어 보여준다.
  // 판을 만지거나 판이 바뀌면 지우고 다시 센다.
  const [hintMove, setHintMove] = useState<Hint | null>(null);
  const [idleNonce, setIdleNonce] = useState(0);
  const poke = () => {
    setHintMove(null);
    setIdleNonce(n => n + 1);
  };
  useEffect(() => {
    setHintMove(null);
    if (!canPlay || armed || armedSkill || tool) return;
    const t = window.setTimeout(() => setHintMove(findHint(level.board)), HINT_IDLE_MS);
    return () => window.clearTimeout(t);
  }, [canPlay, level.board, armed, armedSkill, tool, idleNonce]);
  // 버섯이 채소를 부수고 나오는 칸: 갈라지는 순간 즙·조각을 튀긴다(FxLayer)
  const regrowFx = useMemo(
    () =>
      [...view.regrown].flatMap(k => {
        const { row, col } = parseKey(k);
        const g = view.before ? at(view.before, row, col).gem : null;
        return g && g.color !== null && !g.special ? [{ row, col, color: g.color }] : [];
      }),
    [view.regrown, view.before],
  );
  const hintCells = useMemo(() => new Set(hintMove?.cells ?? []), [hintMove]);

  // 효과음: 단계가 바뀔 때마다 그 단계의 소리를 연출 시간표에 맞춰 건다
  useEffect(() => {
    if (view.step) playStepSounds(view.step);
  }, [view.tick, view.step]);

  // 판이 끝나면 축하·아쉬움 소리(재생이 다 끝난 뒤 한 번)
  const endedRef = useRef<string | null>(null);
  useEffect(() => {
    if (view.playing) return;
    const key = `${level.level.id}:${level.status}`;
    if (level.status === 'playing') {
      endedRef.current = null;
      // 새 판·다시 하기: 클리어로 멈췄던 배경음악을 다시 튼다(이미 흐르고 있으면 그대로)
      startBgm('play');
      return;
    }
    if (endedRef.current === key) return;
    endedRef.current = key;
    // 클리어: 배경음악을 걷어 내고 축하 소리만 들리게 한다
    if (level.status === 'won') stopBgm();
    playSfx(level.status === 'won' ? 'win' : 'lose');
  }, [view.playing, level.status, level.level.id]);

  const applyMove = (a: Position, b: Position) => {
    if (!canPlay) return;
    runTurn(resolveTurn(level.board, a, b, game.rng, resolveOptionsFor(level.level)));
  };

  /** 부스터는 이동 횟수를 소모하지 않는다 - 그래서 진행 반영 경로가 다르다. */
  const runBooster = (result: ReturnType<typeof activateBooster>) => {
    if (!result.valid) return;
    const nextLevel = applyBooster(level, result);
    play(result.steps, () => {
      if (nextLevel.status === 'playing' && !hasAnyMove(nextLevel.board)) {
        const shuffled = reshuffle(nextLevel.board, game.rng, nextLevel.level.colors);
        setGame(g => ({ ...g, level: { ...nextLevel, board: shuffled } }));
        reset(shuffled);
        return;
      }
      setGame(g => ({ ...g, level: nextLevel }));
    });
  };

  // 샌드박스에서는 개수가 줄지 않는다 - 같은 부스터를 반복해서 시험해야 한다.
  const spend = (kind: BoosterKind) => {
    if (sandbox) return;
    setInventory(inv => ({ ...inv, [kind]: inv[kind] - 1 }));
  };

  const tapBooster = (kind: BoosterKind) => {
    if (!canPlay || inventory[kind] <= 0) return;
    if (kind === 'shuffle') {
      spend(kind);
      const shuffled = reshuffle(level.board, game.rng, level.level.colors);
      setGame(g => ({ ...g, level: { ...level, board: shuffled } }));
      reset(shuffled);
      return;
    }
    setArmedSkill(null);
    setArmed(a => (a === kind ? null : kind));
  };

  const tapSkill = (kind: SpecialKind) => {
    if (!canPlay || !skillReady(kind)) return;
    setArmed(null);
    setArmedSkill(a => (a === kind ? null : kind));
  };

  // 아이템은 탭만으로도 발동한다(SPEC 4.6).
  const onTap = (pos: Position) => {
    if (!canPlay) return;

    // 부스터를 겨누고 있으면 그 칸에 쓴다.
    if (armed) {
      if (!canUseAt(level.board, pos, armed)) return;
      const result = activateBooster(level.board, pos, armed, game.rng, resolveOptionsFor(level.level));
      if (!result.valid) return;
      spend(armed);
      setArmed(null);
      runBooster(result);
      return;
    }

    // 스킬을 겨누고 있으면 그 칸에 쓴다. 게이지는 다시 0부터.
    if (armedSkill) {
      if (!canUseSkillAt(level.board, pos)) return;
      const result = activateSkill(level.board, pos, armedSkill, game.rng, resolveOptionsFor(level.level));
      if (!result.valid) return;
      const used = armedSkill;
      if (!sandbox) setGauges(g => ({ ...g, [used]: 0 }));
      setArmedSkill(null);
      runBooster(result);
      return;
    }

    if (!at(level.board, pos.row, pos.col).gem?.special) return;
    runTurn(activateAt(level.board, pos, game.rng, resolveOptionsFor(level.level)));
  };

  const onPointerDown = (pos: Position) => (e: React.PointerEvent) => {
    poke();
    // 브라우저는 첫 터치 전에는 소리를 막는다 - 여기서 깨운다
    unlockAudio();
    // 샌드박스에서 도구를 들고 있으면 스왑이 아니라 찍기다.
    if (tool) {
      paintAt(pos);
      return;
    }
    if (!canPlay) return;
    // 부스터·스킬을 겨누는 중에는 스왑이 아니라 지목이다.
    if (armed || armedSkill) {
      onTap(pos);
      return;
    }
    // 집을 수 있는지는 엔진에 묻는다. 여기서 따로 판정하면 화면은 못 집는데
    // 엔진은 받아주는(또는 그 반대의) 어긋남이 생긴다.
    const cell = at(view.board, pos.row, pos.col);
    if (!isCellSwappable(cell)) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pos,
      x: e.clientX,
      y: e.clientY,
      cellSize: (e.currentTarget as HTMLElement).getBoundingClientRect().width,
    };
    setGrabbed(pos);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < drag.cellSize * COMMIT_RATIO) return;

    dragRef.current = null;
    setGrabbed(null);
    const target: Position =
      Math.abs(dx) > Math.abs(dy)
        ? { row: drag.pos.row, col: drag.pos.col + (dx > 0 ? 1 : -1) }
        : { row: drag.pos.row + (dy > 0 ? 1 : -1), col: drag.pos.col };
    if (target.row < 0 || target.col < 0 || target.row >= rowsN || target.col >= size) return;
    if (!isAdjacent(drag.pos, target)) return;
    if (!at(view.board, target.row, target.col).gem) return;
    applyMove(drag.pos, target);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setGrabbed(null);
    if (drag) onTap(drag.pos);
  };

  const hint = () => {
    const options = listMoves(level.board);
    if (options.length > 0) applyMove(options[0].a, options[0].b);
  };

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < view.board.height; r++) {
    for (let c = 0; c < view.board.width; c++) {
      const cell = at(view.board, r, c);
      const k = key(r, c);
      const style: React.CSSProperties = {
        left: `${c * cellPct}%`,
        top: `${r * cellPctY}%`,
        width: `${cellPct}%`,
        height: `${cellPctY}%`,
      };

      if (!cell.exists) {
        cells.push(<div key={`v-${k}`} className="jk-cell jk-void" style={style} />);
        continue;
      }

      // 바닥(잔디 등)·덮개(꿀 등)도 장애물처럼: 이번에 벗겨지거나 번지는 칸은 맞는 시각까지
      // 피해 직전 모습을 두고, 그 순간 바뀐다 - 안 그러면 도토리를 쓰자마자 잔디가 먼저 사라졌다
      const hitStyle = { ['--h' as string]: `${Math.round(view.hitAt.get(k) ?? 0)}ms` } as React.CSSProperties;
      const beforeCell = view.before && view.damaged.has(k) ? at(view.before, r, c) : null;
      const oldGround = beforeCell?.ground ?? null;
      const groundChanged =
        !!beforeCell &&
        (oldGround?.kind !== cell.ground?.kind || (oldGround?.layers ?? 0) !== (cell.ground?.layers ?? 0));
      cells.push(
        <div key={`p-${k}`} className={`jk-cell jk-plate${(r + c) % 2 ? ' alt' : ''}`} style={style}>
          {groundChanged ? (
            <>
              {oldGround && (
                <span className="jk-ground-wrap pending-old" style={hitStyle}>
                  <GroundSprite kind={oldGround.kind} layers={oldGround.layers} />
                </span>
              )}
              {cell.ground && (
                <span className="jk-ground-wrap pending-new" style={hitStyle}>
                  <GroundSprite kind={cell.ground.kind} layers={cell.ground.layers} />
                </span>
              )}
            </>
          ) : (
            cell.ground && <GroundSprite kind={cell.ground.kind} layers={cell.ground.layers} />
          )}
        </div>,
      );

      // 벽은 칸이 아니라 경계에 있으므로 칸 위에 얇은 막대로 얹는다.
      if (cell.walls?.top) {
        cells.push(<div key={`wt-${k}`} className="jk-cell jk-wall top" style={style} />);
      }
      if (cell.walls?.left) {
        cells.push(<div key={`wl-${k}`} className="jk-cell jk-wall left" style={style} />);
      }

      if (cell.collector) {
        const box = cell.collector;
        cells.push(
          <div key={`col-${k}`} className="jk-cell jk-collector" style={style}>
            <CollectorSprite color={box.color} left={Math.max(0, box.need - box.got)} />
          </div>,
        );
      }

      if (cell.spawner) {
        cells.push(
          <div key={`sp-${k}`} className="jk-cell jk-spawner" style={style}>
            <SpawnerSprite color={cell.spawner.color} />
          </div>,
        );
      }

      // 이번에 깎이거나 깨지는 장애물: 맞는 시각까지는 피해 직전 모습을 보여 주고,
      // 그 순간 옛 모습은 번쩍 사라지고 새 모습(남은 겹)이 나타난다
      const oldB = view.before && view.damaged.has(k) ? at(view.before, r, c).blocker : null;
      const changed = !!oldB && (!cell.blocker || cell.blocker.layers !== oldB.layers || cell.blocker.kind !== oldB.kind);
      if (oldB && changed) {
        const hit = { ...style, ['--h' as string]: `${Math.round(view.hitAt.get(k) ?? 0)}ms` };
        cells.push(
          <div key={`bo-${k}`} className="jk-cell jk-blocker pending-old" style={hit}>
            <BlockerSprite kind={oldB.kind} layers={oldB.layers} hidden={oldB.hidden} />
            {!oldB.hidden && oldB.layers > 1 && <span className="jk-layers">{oldB.layers}</span>}
          </div>,
        );
        if (cell.blocker) {
          const b = cell.blocker;
          cells.push(
            <div key={`b-${k}`} className="jk-cell jk-blocker pending-new" style={hit}>
              <BlockerSprite kind={b.kind} layers={b.layers} hidden={b.hidden} />
              {!b.hidden && b.layers > 1 && <span className="jk-layers">{b.layers}</span>}
            </div>,
          );
          continue;
        }
      } else if (cell.blocker) {
        const b = cell.blocker;
        // 다시 자라난 장애물(버섯): 그 자리 채소가 톡 터진 뒤 장애물이 띠옹 솟는다
        const regrowFrom = view.regrown.has(k) && view.before ? at(view.before, r, c).gem : null;
        if (regrowFrom) {
          cells.push(
            <div key={`rg-${k}-${view.tick}`} className="jk-cell jk-regrow-old" style={style}>
              {/* 같은 그림을 들쭉날쭉한 금으로 반씩 잘라 두 쪽으로 갈라지게 한다 */}
              {(['l', 'r'] as const).map(side => (
                <span key={side} className={`jk-regrow-half ${side}`}>
                  <img src={spriteFor(regrowFrom.color, regrowFrom.special)} alt="" draggable={false} />
                </span>
              ))}
            </div>,
          );
        }
        cells.push(
          <div
            key={regrowFrom ? `b-${k}-${view.tick}` : `b-${k}`}
            className={`jk-cell jk-blocker${view.damaged.has(k) ? ' damaged' : ''}${
              b.hidden ? ' unrevealed' : ''
            }${regrowFrom ? ' regrowing' : ''}`}
            style={withDelay(style, view.damaged.has(k) ? view.delays.get(k) : undefined)}
          >
            <BlockerSprite kind={b.kind} layers={b.layers} hidden={b.hidden} />
            {!b.hidden && b.layers > 1 && <span className="jk-layers">{b.layers}</span>}
          </div>,
        );
        continue;
      }

      if (!cell.gem) continue;
      const gem = cell.gem;
      const classes = [
        'jk-cell',
        'jk-gem',
        gem.inert ? 'cargo' : '',
        gem.special ? `sp-${gem.special}` : '',
        grabbed?.row === r && grabbed?.col === c ? 'grabbed' : '',
        view.clearing.has(k) ? 'clearing' : '',
        view.spawned.has(k) ? 'spawning' : '',
        view.invalid.has(k) ? 'invalid' : '',
        view.collecting.has(k) ? 'collecting' : '',
        view.merged.has(k) ? 'merged' : '',
        view.morphAt.has(k) ? 'morphing' : '',
        hintCells.has(k) ? 'hinted' : '',
        (armed && canUseAt(view.board, { row: r, col: c }, armed)) ||
        (armedSkill && canUseSkillAt(view.board, { row: r, col: c }))
          ? 'targetable'
          : '',
      ]
        .filter(Boolean)
        .join(' ');

      cells.push(
        <div
          key={gem.id}
          ref={el => {
            if (el) cellElsRef.current.set(gem.id, el);
            else cellElsRef.current.delete(gem.id);
          }}
          className={classes}
          style={withDelay(
            withHint(
              hintMove,
              r,
              c,
              // 아이템마다 대기 동작의 박자를 어긋나게 - 판의 아이템이 한꺼번에 같이 깜빡이지 않게
              gem.special ? { ...style, ['--ph' as string]: `${-((gem.id * 0.37) % 1.7).toFixed(2)}s` } : style,
            ),
            view.clearing.has(k) ? view.delays.get(k) : undefined,
          )}
          onPointerDown={onPointerDown({ row: r, col: c })}
        >
          {gem.special && !gem.inert && <ItemIdleFx kind={gem.special} src={spriteFor(gem.color, gem.special)} />}
          {view.morphAt.has(k) && view.before && !at(view.before, r, c).gem?.special ? (
            // 무지개꽃 변신: 꽃잎이 닿기 전엔 원래 채소, 닿는 순간 아이템으로 뿅
            <>
              <img
                className="morph-old"
                style={{ ['--m' as string]: `${Math.round(view.morphAt.get(k)!)}ms` }}
                src={spriteFor(at(view.before, r, c).gem?.color ?? gem.color)}
                alt=""
                draggable={false}
              />
              <img
                className="morph-new"
                style={{ ['--m' as string]: `${Math.round(view.morphAt.get(k)!)}ms` }}
                src={spriteFor(gem.color, gem.special)}
                alt=""
                draggable={false}
              />
            </>
          ) : gem.inert ? (
            <CargoSprite color={gem.color} />
          ) : (
            (gem.special || gem.color !== null) && (
              <img src={spriteFor(gem.color, gem.special)} alt="" draggable={false} />
            )
          )}
          {(() => {
            const before = view.before && view.damaged.has(k) ? at(view.before, r, c).cover : null;
            const now = cell.cover;
            const changed =
              !!view.before && view.damaged.has(k) && (before?.kind !== now?.kind || (before?.layers ?? 0) !== (now?.layers ?? 0));
            const hitStyle = { ['--h' as string]: `${Math.round(view.hitAt.get(k) ?? 0)}ms` } as React.CSSProperties;
            const draw = (cv: NonNullable<typeof now>, cls: string) => (
              <span className={`jk-cover${cls}`} style={cls ? hitStyle : undefined}>
                <CoverSprite kind={cv.kind} layers={cv.layers} hides={cv.hides} locks={cv.locks} />
                {cv.layers > 1 && <span className="jk-layers">{cv.layers}</span>}
              </span>
            );
            if (!changed) return now ? draw(now, '') : null;
            // 덮개도 맞는 시각까지는 옛 모습(겹 수 포함), 그 순간 벗겨지거나 줄어든다
            return (
              <>
                {before && draw(before, ' pending-old')}
                {now && draw(now, ' pending-new')}
              </>
            );
          })()}
        </div>,
      );
    }
  }

  const levelIndex = ALL_LEVELS.findIndex(l => l.id === level.level.id);

  function toggleSound() {
    unlockAudio();
    setSoundOff(m => {
      setMuted(!m);
      return !m;
    });
  }

  function toggleMusic() {
    unlockAudio();
    setMusicOff(m => {
      setMusicMuted(!m);
      return !m;
    });
  }
  const testOf = testLevelElement(level.level.id);

  return (
    <div className="jk-page">
      {/* 플레이어가 보는 맨 위: 다시 시작(오른쪽)과, 개발 중에만 보이는 개발 서랍 버튼 */}
      <div className="jk-topbar">
        {hosted && (
          <button
            className="jk-round-btn jk-pause-btn"
            onClick={() => {
              unlockAudio();
              setPaused(true);
            }}
            title="일시정지"
            aria-label="일시정지"
          >
            <Pause size={22} strokeWidth={3} />
          </button>
        )}
        {import.meta.env.DEV && (
          <button className="jk-dev-toggle" onClick={() => setDevOpen(o => !o)} aria-expanded={devOpen}>
            개발
          </button>
        )}
        {!sandbox && (
          <div className={`jk-stage${level.level.tier ? ` tier-${level.level.tier}` : ''}`}>
            <span className="jk-stage-no">레벨 {level.level.label ?? level.level.id}</span>
            {level.level.tier && TIER_BADGE[level.level.tier] && (
              <span className="jk-stage-badge">{TIER_BADGE[level.level.tier]}</span>
            )}
          </div>
        )}
        {!hosted && (
          <>
            <button
              className="jk-round-btn"
              onClick={toggleSound}
              title={soundOff ? '소리 켜기' : '소리 끄기'}
              aria-label={soundOff ? '소리 켜기' : '소리 끄기'}
            >
              {soundOff ? <VolumeX size={22} strokeWidth={3} /> : <Volume2 size={22} strokeWidth={3} />}
            </button>
            <button
              className="jk-round-btn"
              onClick={() => (sandbox ? openSandbox() : loadLevel(levelIndex))}
              title="다시 시작"
              aria-label="다시 시작"
            >
              <RotateCcw size={22} strokeWidth={3} />
            </button>
          </>
        )}
      </div>

      {/* 일시정지 메뉴: 계속 / 다시 하기 / 소리 / 로비로(하트 하나를 잃는다) */}
      {hosted && paused && (
        <div className="jk-modal-back" onClick={() => setPaused(false)}>
          <div className="jk-modal" onClick={e => e.stopPropagation()}>
            <h2>일시정지</h2>
            <div className="jk-modal-toggles">
              <button className={`jk-toggle${soundOff ? '' : ' on'}`} onClick={toggleSound}>
                {soundOff ? <VolumeX size={20} /> : <Volume2 size={20} />} 효과음
              </button>
              <button className={`jk-toggle${musicOff ? '' : ' on'}`} onClick={toggleMusic}>
                <Music size={20} /> 배경음악
              </button>
            </div>
            <div className="jk-modal-actions">
              <button className="primary" onClick={() => setPaused(false)}>
                계속하기
              </button>
              <button
                onClick={() => {
                  setPaused(false);
                  if (onRetry?.()) loadLevel(levelIndex);
                }}
              >
                다시 하기 <small>♥ -1</small>
              </button>
              <button
                className="danger"
                onClick={() => {
                  setPaused(false);
                  onQuit?.();
                }}
              >
                로비로 나가기 <small>♥ -1</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개발 서랍: 레벨 고르기·시험 레벨·힌트·실험. 플레이 화면을 가리지 않게 접어 둔다. */}
      {import.meta.env.DEV && devOpen && (
        <div className="jk-dev">
          <div className="jk-actions">
            <div className="jk-levels">
              {LEVELS.map((l, i) => (
                <button
                  key={l.id}
                  className={`jk-lv${!sandbox && HAND_OFFSET + i === levelIndex ? ' active' : ''}`}
                  onClick={() => loadLevel(HAND_OFFSET + i)}
                  title="손으로 만든 레벨"
                >
                  {l.id}
                </button>
              ))}
            </div>
            <button onClick={hint} disabled={!canPlay} title="한 수 두기">
              힌트
            </button>
            <button
              className={`jk-lv${sandbox ? ' active' : ''}`}
              onClick={openSandbox}
              title="장애물을 직접 놓아보는 판"
            >
              실험
            </button>
          </div>

        <div className="jk-testbar">
          <span className="jk-testbar-title">
            스테이지 {GENERATED_LEVELS.length}판
            <input
              className="jk-stage-jump"
              type="number"
              min={1}
              max={GENERATED_LEVELS.length}
              placeholder="번호"
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                const n = Number((e.target as HTMLInputElement).value);
                const i = GENERATED_LEVELS.findIndex(l => Number(l.label) === n);
                if (i >= 0) loadLevel(i);
              }}
            />
          </span>
          <div className="jk-testbar-list">
            {GENERATED_LEVELS.map((l, i) => (
              <button
                key={l.id}
                className={`jk-lv${l.tier ? ` tier-${l.tier}` : ''}${!sandbox && i === levelIndex ? ' active' : ''}`}
                onClick={() => loadLevel(i)}
                title={`봇 승률 ${(l.winRate * 100).toFixed(0)}% (목표 ${(l.target * 100).toFixed(0)}%) · ${l.moves}수`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="jk-testbar">
          <span className="jk-testbar-title">요소별 시험</span>
          <div className="jk-testbar-list">
            {TEST_LEVELS.map((l, i) => {
              const def = testLevelElement(l.id);
              return (
                <button
                  key={l.id}
                  className={`jk-lv${!sandbox && TEST_OFFSET + i === levelIndex ? ' active' : ''}`}
                  onClick={() => loadLevel(TEST_OFFSET + i)}
                  title={def?.note}
                >
                  {l.label}
                  {def && !def.verified && <i className="jk-unverified">?</i>}
                </button>
              );
            })}
          </div>
        </div>

        {testOf && !sandbox && (
          <p className="jk-testnote">
            <b>{testOf.label}</b> — {testOf.note}
            {!testOf.verified && <span className="jk-unverified"> (동작 미확인)</span>}
          </p>
        )}

        </div>
      )}

      {/* 상단 판(로얄킹덤식): 나무 판 하나에 [목표] [캐릭터 창문 + 스킬 게이지] [남은 수].
          캐릭터는 아치 창문에 얼굴이 꽉 차고 판 위로 살짝 솟는다. 게이지가 꽉 차면
          창문을 눌러 겨눈 뒤 칸을 찍어 스킬을 쓴다. */}
      <div className="jk-hud2">
        <div className="jk-hud-box">
          <span className="jk-tab">목표</span>
          <div className="jk-hud-goals">
            {level.level.goals.map((goal, i) => {
              const done = level.progress[i] >= goal.count;
              return (
                <div key={i} className={`jk-hgoal${done ? ' done' : ''}`} title={describeGoal(goal)}>
                  {goal.kind === 'color' ? (
                    <img src={spriteFor(goal.color)} alt="" />
                  ) : (
                    <span className="jk-goal-icon">
                      {goal.kind === 'blocker' ? (
                        <BlockerSprite kind={goal.blockerKind} layers={1} />
                      ) : goal.kind === 'ground' || goal.kind === 'spread' ? (
                        <GroundSprite kind={goal.groundKind} layers={1} />
                      ) : goal.kind === 'collect' ? (
                        <CollectorSprite color={null} left={0} />
                      ) : (
                        <CoverSprite kind={goal.kind === 'cover' ? goal.coverKind : undefined} layers={1} />
                      )}
                    </span>
                  )}
                  <span className="jk-hgoal-n">{done ? '✓' : Math.max(0, goal.count - level.progress[i])}</span>
                </div>
              );
            })}
          </div>
        </div>

        {(() => {
          const kind = character.skill;
          const def = skillDef(kind)!;
          const ready = skillReady(kind);
          const have = sandbox ? def.cost : Math.min(def.cost, Math.floor(gauges[kind] ?? 0));
          return (
            <button
              className={`jk-buddy2${ready ? ' ready' : ''}${armedSkill === kind ? ' armed' : ''}`}
              onClick={() => tapSkill(kind)}
              disabled={!canPlay || !ready}
              title={`${character.name} · ${def.label}: ${def.desc}`}
              style={{ ['--fill' as string]: have / def.cost }}
            >
              <span className="jk-arch">
                <span className="jk-arch-in" />
                {/* 캐릭터는 창문 하늘 위에 따로 얹는다 - 아래는 창틀 안쪽에서 잘리고 머리는 틀 위로 나온다 */}
                <span className="jk-arch-pic">
                  <img src={character.face} alt={character.name} draggable={false} />
                </span>
                <img className="jk-arch-leaf l" src="/assets/3match/fx/leaf-green.png" alt="" draggable={false} />
                <img className="jk-arch-leaf r" src="/assets/3match/fx/leaf-green.png" alt="" draggable={false} />
              </span>
              <span className="jk-bgauge">
                <img src={spriteFor(null, kind)} alt="" draggable={false} />
                <i />
                <b>{ready ? '사용!' : `${have}/${def.cost}`}</b>
              </span>
            </button>
          );
        })()}

        <div className="jk-hud-box">
          <span className="jk-tab">남은 수</span>
          <span className={`jk-hud-moves${level.movesLeft <= 5 ? ' low' : ''}`}>{level.movesLeft}</span>
        </div>
      </div>

      <div
        className="jk-board-outer"
        ref={boardOuterRef}
        style={{ ['--jk-ratio' as string]: size / rowsN }}
      >
        <div
          ref={boardRef}
          className="jk-board"
          style={{ aspectRatio: `${size} / ${rowsN}` }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <BoardOutline board={view.board} />
          {cells}
          <FxLayer
            step={view.step}
            tick={view.tick}
            regrowFrom={regrowFx}
            cols={view.board.width}
            rows={view.board.height}
            shakeTarget={boardOuterRef}
          />
        </div>

        {(armed || armedSkill) && <div className="jk-aim">쓸 칸을 고르세요</div>}

        {hosted && level.status !== 'playing' && !view.playing && (
          <div className="jk-overlay">
            {level.status === 'won' ? (
              <>
                <h2>클리어!</h2>
                {winCoins ? <p className="jk-reward">🪙 +{winCoins}</p> : null}
                <div className="jk-overlay-actions">
                  <button className="primary" onClick={onWin}>
                    계속
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>수가 다 떨어졌어요</h2>
                <p className="jk-overlay-sub">조금만 더 하면 깰 수 있어요!</p>
                <div className="jk-overlay-actions column">
                  {onBuyMoves && (
                    <button
                      className="primary"
                      onClick={() => {
                        if (!onBuyMoves()) {
                          setNoCoins(true);
                          return;
                        }
                        setNoCoins(false);
                        setGame(g => ({
                          ...g,
                          level: { ...g.level, movesLeft: g.level.movesLeft + buyMovesCount, status: 'playing' },
                        }));
                      }}
                    >
                      +{buyMovesCount}수 더 <small>🪙 {buyMovesCost}</small>
                    </button>
                  )}
                  {noCoins && <p className="jk-overlay-sub warn">코인이 모자라요</p>}
                  <button
                    onClick={() => {
                      setNoCoins(false);
                      if (onRetry?.()) loadLevel(levelIndex);
                    }}
                  >
                    다시 하기 <small>♥ -1</small>
                  </button>
                  <button onClick={onLose}>로비로</button>
                </div>
              </>
            )}
          </div>
        )}
        {!hosted && level.status !== 'playing' && !view.playing && (
          <div className="jk-overlay">
            <h2>{level.status === 'won' ? '클리어!' : '수가 다 떨어졌어요'}</h2>
            <div className="jk-overlay-actions">
              <button onClick={() => loadLevel(levelIndex)}>다시</button>
              {level.status === 'won' && levelIndex < ALL_LEVELS.length - 1 && (
                <button className="primary" onClick={() => loadLevel(levelIndex + 1)}>
                  다음 레벨
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {sandbox ? (
        <SandboxPalette
          tool={tool}
          layers={paintLayers}
          onPick={setTool}
          onLayers={setPaintLayers}
        />
      ) : null}

      <div className="jk-boosters">
        {BOOSTERS.map(b => {
          // 샌드박스는 시험용이라 전부 열어둔다.
          const locked = !sandbox && level.level.id < b.unlockLevel;
          const count = inventory[b.kind];
          return (
            <button
              key={b.kind}
              className={`jk-booster${armed === b.kind ? ' armed' : ''}${locked ? ' locked' : ''}`}
              disabled={locked || (!sandbox && count <= 0) || !canPlay}
              onClick={() => tapBooster(b.kind)}
              title={locked ? `레벨 ${b.unlockLevel}부터` : b.label}
            >
              <BoosterSprite kind={b.kind} />
              <span className="jk-booster-n">{locked ? '🔒' : sandbox ? '∞' : count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default JewelKingdomGame;

/**
 * 판 칸 모양을 따라가는 얇은 나무 테두리.
 *
 * 그리는 법: 칸보다 조금 큰 나무색 사각형을 모든 칸에 깔고, 그 위에 칸 크기의 흙색
 * 사각형을 덮는다. 겹친 안쪽은 지워지고 바깥 윤곽에만 테가 남는다 - 모서리를 따로
 * 계산하지 않아도 오목·볼록 모서리가 다 맞는다. 칸(.jk-plate)보다 먼저 그려 밑에 깔린다.
 */
function BoardOutline({ board }: { board: Board }) {
  const shape = board.cells.map(c => (c.exists ? '1' : '0')).join('');
  const w = board.width;
  return useMemo(() => {
    const live: [number, number][] = [];
    [...shape].forEach((ch, i) => ch === '1' && live.push([Math.floor(i / w), i % w]));
    // 테 두께(칸 크기 대비). 바깥 진한 선 + 안쪽 밝은 나무결
    const outer = 0.07;
    const inner = 0.045;
    const rect = (r: number, c: number, o: number, fill: string, k: string) => (
      <rect key={k} x={c - o} y={r - o} width={1 + o * 2} height={1 + o * 2} rx={o} fill={fill} />
    );
    return (
      <svg className="jk-outline" viewBox={`0 0 ${w} ${shape.length / w}`} preserveAspectRatio="none" aria-hidden>
        {live.map(([r, c]) => rect(r, c, outer, '#5b3514', `o${r},${c}`))}
        {live.map(([r, c]) => rect(r, c, inner, '#c98a4a', `i${r},${c}`))}
        {live.map(([r, c]) => rect(r, c, 0, '#3a2314', `b${r},${c}`))}
      </svg>
    );
  }, [shape, w]);
}

/**
 * 판 위 아이템이 "아이템"으로 읽히게 하는 대기 효과. 일반 채소와 한눈에 구분돼야 한다.
 *  - 공통: 뒤에서 숨 쉬는 빛무리 + 가끔 반짝이는 별
 *  - 거름포대: 심지 끝에서 불꽃이 타닥타닥 튄다(그림의 심지 끝 = 가로 58%·세로 11%)
 *  - 삽: 날 위로 금속 반사광이 쓱 지나간다(그림 모양대로 가린 띠)
 * 그림 자체의 움직임(부풀기·들썩이기·통통 뛰기·돌기)은 CSS가 img에 건다.
 * 칸(.jk-gem)의 이동·터짐 애니메이션과 겹치지 않게 칸 안쪽 요소에만 건다.
 */
function ItemIdleFx({ kind, src }: { kind: string; src: string }) {
  const mask = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` } as React.CSSProperties;
  return (
    <span className="jk-ifx" aria-hidden>
      <span className="jk-aura" />
      {kind === 'tnt' && (
        <span className="jk-fuse">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      {(kind === 'rocket-h' || kind === 'rocket-v') && <span className="jk-glint" style={mask} />}
      <span className="jk-twinkle" />
    </span>
  );
}

/** 가만히 있다가 힌트가 뜨기까지 */
const HINT_IDLE_MS = 5000;

/** 힌트로 움직일 칸이면 그 방향을 CSS 변수로 넘긴다 */
function withHint(hint: Hint | null, r: number, c: number, style: React.CSSProperties): React.CSSProperties {
  const m = hint?.movers.find(v => v.pos.row === r && v.pos.col === c);
  if (!m) return style;
  return { ...style, ['--hx' as string]: m.dc, ['--hy' as string]: m.dr };
}
