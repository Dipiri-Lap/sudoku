import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { at, cloneBoard, isCellSwappable, emptyCell, isAdjacent, key, makeGem } from '../engine/board';
import { activateAt, hasAnyMove, listMoves, resolveTurn, activateBooster, activateSkill } from '../engine/resolve';
import { makeRng } from '../engine/rng';
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
const HAND_OFFSET = GENERATED_LEVELS.length;
const TEST_OFFSET = GENERATED_LEVELS.length + LEVELS.length;

const TIER_BADGE: Record<string, string> = { hard: '어려운 판', super: '아주 어려운 판' };
import type { GemColor, Position } from '../engine/types';
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
import SkillPanel from './SkillPanel';
import FxLayer from './fx/FxLayer';
import {
  MAX_SKILL_SLOTS,
  canUseSkillAt,
  chargeSkills,
  isSkillReady,
  nextSlotLevel,
  sanitizeSkills,
  skillDef,
  skillSlotsFor,
} from '../engine/skills';
import type { SpecialKind } from '../engine/types';
import { GRAVITY_EASE, LAND_MS, SWAP_EASE, SWAP_MS, fallDurationMs } from './constants';
import './JewelKingdomGame.css';

const COMMIT_RATIO = 0.6; // 셀 크기의 60% 이상 끌어야 방향이 확정된다

/**
 * 텃밭 컨셉: 블록은 색마다 채소 하나, 아이템은 색 없는 도구 하나씩이다.
 * 아이템은 색 매치 역할을 잃으므로(SPEC 3.11, matchColorOf) 그림도 색을
 * 따르지 않는다 - 무슨 색에서 왔는지보다 "무슨 아이템인지"가 읽혀야 한다.
 *   로켓=삽(세로 로켓은 CSS로 90도 돌린다) / TNT=거름 포대 / 프로펠러=참새 / 라이트볼=무지개 꽃
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

const SKILLS_KEY = 'jk-skills';

/** 스킬 장착은 기기에 기억해 둔다. 저장소가 막힌 환경(사생활 보호 창 등)이면 기본 장착으로 간다. */
function readSkills(): SpecialKind[] {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return sanitizeSkills(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeSkills(null);
  }
}

function writeSkills(skills: SpecialKind[]) {
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  } catch {
    /* 저장 못 해도 이번 세션에서는 쓴다 */
  }
}

type Gauges = Partial<Record<SpecialKind, number>>;

interface DragState {
  pos: Position;
  x: number;
  y: number;
  cellSize: number;
}

const JewelKingdomGame: React.FC = () => {
  // 난수원과 레벨 상태를 한 번에 만든다. useState의 지연 초기화라 렌더마다
  // 다시 실행되지 않는다 - 렌더 중에 Date.now()를 부르면 리렌더할 때마다
  // 다른 값이 나와 화면이 예측 불가능해진다.
  const [game, setGame] = useState(() => {
    const rng = makeRng(Date.now() >>> 0);
    return { rng, level: startLevel(ALL_LEVELS[0], rng) };
  });
  const [inventory, setInventory] = useState<Inventory>(startingInventory);
  /** 샌드박스에서 지금 들고 있는 도구. null이면 평소처럼 플레이한다. */
  const [tool, setTool] = useState<PaintTool | null>(null);
  const [paintLayers, setPaintLayers] = useState(1);
  const [sandbox, setSandbox] = useState(false);
  /** 지금 겨누고 있는 부스터. 칸을 지목해야 발동한다. */
  const [armed, setArmed] = useState<BoosterKind | null>(null);
  /** 장착한 스킬(게이지가 차면 쓰는 아이템). 칸 수는 레벨에 따라 열린다 */
  const [skills, setSkills] = useState<SpecialKind[]>(readSkills);
  /** 스킬별 게이지. 판마다 0에서 시작한다 */
  const [gauges, setGauges] = useState<Gauges>({});
  /** 지금 겨누고 있는 스킬. 칸을 지목해야 발동한다 */
  const [armedSkill, setArmedSkill] = useState<SpecialKind | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  /** 개발 서랍(레벨·시험 목록)이 열려 있는가. 개발 서버에서만 쓴다. */
  const [devOpen, setDevOpen] = useState(false);
  const { view, play, reset } = usePlayback(game.level.board);

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

  const size = view.board.width;
  const cellPct = 100 / size;
  const level = game.level;
  /** 화면에 보이는 스테이지 번호. 생성 레벨은 내부 번호(1000+n)와 다르다 */
  const stageNo = Number(level.level.label ?? level.level.id);
  // 스킬 칸은 레벨이 오르면 열린다. 샌드박스·개발 서버에서는 시험하기 쉽게 다 열어 둔다.
  const skillSlots = sandbox || import.meta.env.DEV ? MAX_SKILL_SLOTS : skillSlotsFor(stageNo);
  const equipped = skills.slice(0, skillSlots);
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
    const running: Animation[] = [];

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
      const duration = dropping ? fallDurationMs(pos.row - prev.row) : SWAP_MS;

      const anim = el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration, easing: dropping ? GRAVITY_EASE : SWAP_EASE },
      );
      running.push(anim);

      if (dropping) {
        anim.finished
          .then(() => {
            // 착지 스쿼시. 낙하가 실제로 끝난 뒤에만 얹는다.
            el.animate(
              [
                { transform: 'scaleY(0.82) scaleX(1.14)' },
                { transform: 'scaleY(1.06) scaleX(0.96)', offset: 0.55 },
                { transform: 'scale(1)' },
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
    if (target.row < 0 || target.col < 0 || target.row >= size || target.col >= size) return;
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
        top: `${r * cellPct}%`,
        width: `${cellPct}%`,
        height: `${cellPct}%`,
      };

      if (!cell.exists) {
        cells.push(<div key={`v-${k}`} className="jk-cell jk-void" style={style} />);
        continue;
      }

      cells.push(
        <div key={`p-${k}`} className={`jk-cell jk-plate${(r + c) % 2 ? ' alt' : ''}`} style={style}>
          {cell.ground && <GroundSprite kind={cell.ground.kind} layers={cell.ground.layers} />}
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

      if (cell.blocker) {
        const b = cell.blocker;
        cells.push(
          <div
            key={`b-${k}`}
            className={`jk-cell jk-blocker${view.damaged.has(k) ? ' damaged' : ''}${
              b.hidden ? ' unrevealed' : ''
            }`}
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
          style={withDelay(style, view.clearing.has(k) ? view.delays.get(k) : undefined)}
          onPointerDown={onPointerDown({ row: r, col: c })}
        >
          {gem.inert ? (
            <CargoSprite color={gem.color} />
          ) : (
            (gem.special || gem.color !== null) && (
              <img src={spriteFor(gem.color, gem.special)} alt="" draggable={false} />
            )
          )}
          {cell.cover && (
            <span className="jk-cover">
              <CoverSprite
                kind={cell.cover.kind}
                layers={cell.cover.layers}
                hides={cell.cover.hides}
                locks={cell.cover.locks}
              />
              {cell.cover.layers > 1 && <span className="jk-layers">{cell.cover.layers}</span>}
            </span>
          )}
        </div>,
      );
    }
  }

  const levelIndex = ALL_LEVELS.findIndex(l => l.id === level.level.id);
  const testOf = testLevelElement(level.level.id);

  return (
    <div className="jk-page">
      {/* 플레이어가 보는 맨 위: 다시 시작(오른쪽)과, 개발 중에만 보이는 개발 서랍 버튼 */}
      <div className="jk-topbar">
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
        <button
          className="jk-round-btn"
          onClick={() => (sandbox ? openSandbox() : loadLevel(levelIndex))}
          title="다시 시작"
          aria-label="다시 시작"
        >
          <RotateCcw size={22} strokeWidth={3} />
        </button>
      </div>

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

      <div className="jk-hud">
        <div className="jk-moves">
          <span className="n">{level.movesLeft}</span>
          <span className="label">남은 수</span>
        </div>
        <div className="jk-goals">
          {level.level.goals.map((goal, i) => {
            const done = level.progress[i] >= goal.count;
            return (
              <div key={i} className={`jk-goal${done ? ' done' : ''}`} title={describeGoal(goal)}>
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
                <span className="jk-goal-n">
                  {done ? '✓' : Math.max(0, goal.count - level.progress[i])}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 스킬 바: 장착한 스킬과 게이지. 꽉 찬 스킬을 누르면 겨누고, 칸을 찍으면 쓴다. */}
      <div className="jk-skill-bar">
        {Array.from({ length: skillSlots }, (_, i) => {
          const kind = equipped[i];
          if (!kind) {
            return (
              <button
                key={`empty-${i}`}
                className="jk-skill empty"
                onClick={() => setSkillOpen(true)}
                disabled={view.playing}
              >
                <span className="jk-skill-ring">
                  <span className="jk-skill-face">＋</span>
                </span>
                <span className="jk-skill-name">빈 칸</span>
              </button>
            );
          }
          const def = skillDef(kind)!;
          const ready = skillReady(kind);
          const fill = sandbox ? 1 : Math.min(1, (gauges[kind] ?? 0) / def.cost);
          return (
            <button
              key={kind}
              className={`jk-skill${ready ? ' ready' : ''}${armedSkill === kind ? ' armed' : ''}`}
              onClick={() => tapSkill(kind)}
              disabled={!canPlay || !ready}
              title={`${def.label}: ${def.desc}`}
              style={{ ['--fill' as string]: fill }}
            >
              <span className="jk-skill-ring">
                <span className="jk-skill-face">
                  <img src={spriteFor(null, kind)} alt="" draggable={false} />
                </span>
              </span>
              <span className="jk-skill-name">{ready ? '사용!' : def.label}</span>
            </button>
          );
        })}
        <button className="jk-equip-edit" onClick={() => setSkillOpen(true)} disabled={view.playing}>
          장착
        </button>
      </div>

      <div className="jk-board-outer" ref={boardOuterRef}>
        <div
          ref={boardRef}
          className="jk-board"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {cells}
          <FxLayer
            step={view.step}
            tick={view.tick}
            cols={view.board.width}
            rows={view.board.height}
            shakeTarget={boardOuterRef}
          />
        </div>

        {(armed || armedSkill) && <div className="jk-aim">쓸 칸을 고르세요</div>}

        {level.status !== 'playing' && !view.playing && (
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

      {skillOpen && (
        <SkillPanel
          equipped={equipped}
          slots={skillSlots}
          nextSlotLevel={nextSlotLevel(stageNo)}
          spriteFor={kind => spriteFor(null, kind)}
          onClose={() => setSkillOpen(false)}
          onSave={next => {
            setSkills(next);
            writeSkills(next);
            setSkillOpen(false);
            // 판 도중에 바꾸면 게이지가 섞여 비교가 안 된다 - 새로 시작한다.
            if (sandbox) openSandbox();
            else loadLevel(levelIndex);
          }}
        />
      )}

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
