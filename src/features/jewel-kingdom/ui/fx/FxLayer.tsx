import React, { useEffect, useRef } from 'react';
import type { Application, Container, Sprite, Texture } from 'pixi.js';
import type { ShockwaveFilter } from 'pixi-filters/shockwave';
import type { TurnStep } from '../../engine/resolve';
import { at as cellAt, parseKey } from '../../engine/board';
import { FX_TIMING, arrivalMs, blastHasFx, flightTargets, scheduleClear, type ScheduledBlast } from './schedule';

/**
 * 판 위에 겹치는 이펙트 층(PixiJS, 투명 WebGL 캔버스).
 *
 * 판의 칸들은 DOM 그대로 두고 이펙트만 여기서 그린다 - 판을 통째로 옮기지 않고도
 * 파티클·가산 혼합·충격파 같은 게임용 연출을 얹을 수 있다.
 * 시각은 schedule.ts 한 곳에서 받는다. 칸이 사라지는 시각과 삽이 지나가는
 * 시각이 같은 표에서 나와야 둘이 어긋나지 않는다.
 *
 * pixi.js는 이 화면에 들어올 때만 불러온다(지연 로딩) - 다른 게임 번들에 섞이지 않게.
 */

interface Props {
  /** 지금 재생 중인 단계. 터짐 단계가 바뀔 때마다 이펙트를 쏜다. */
  step: TurnStep | null;
  tick: number;
  cols: number;
  rows: number;
  /** 화면 흔들림을 걸 요소(판 바깥 상자) */
  shakeTarget: React.RefObject<HTMLElement | null>;
}

type Pixi = typeof import('pixi.js');

interface Engine {
  pixi: Pixi;
  app: Application;
  root: Container;
  tex: {
    glow: Texture;
    shovel: Texture;
    /** 날아가는 아이템(참새·제비·개구리). 판 위 아이템과 같은 그림의 큰 판 */
    sparrow: Texture;
    /** 참새 날개를 내린 그림(날갯짓 두 번째 장) */
    sparrowDown: Texture;
    swallow: Texture;
    /** 제비 날개를 위로 친 그림 */
    swallowUp: Texture;
    frog: Texture;
    /** 개구리 다리를 쭉 뻗은 점프 그림 */
    frogLeap: Texture;
    scarecrow: Texture;
    /** 흰 깃털. 새 색으로 물들여 쓴다 */
    feather: Texture;
    /** 판 위 아이템 그림(합체 연출: 참새가 매달고 가는 짐, 커지는 거름포대). 키는 파일 이름 */
    items: Record<string, Texture>;
    /** 흰색으로 그린 과즙 조각들. 채소 색으로 물들여(tint) 쓴다 */
    juice: { drop: Texture; blob: Texture };
    debris: Record<string, Texture>;
  };
  ShockwaveFilter: typeof ShockwaveFilter;
  /** 이펙트 시계(ms). 탭이 숨으면 멈췄다가 이어진다. */
  clock: number;
  tasks: { at: number; run: () => void }[];
  updaters: ((dt: number) => boolean)[];
  /** 지금 퍼지는 충격파들. 여러 개가 겹쳐도 서로 지우지 않게 목록으로 든다. */
  waves: ShockwaveFilter[];
  /** 과즙 액체 층. 여기 뿌린 흐린 방울들이 gooFilter로 하나의 액체처럼 이어진다 */
  goo: Container;
}

const ITEM_FILES = [
  'rocket', 'tnt', 'propeller', 'lightball', 'sickle', 'plow', 'butterfly', 'ladybug',
  'watermelon', 'sprinkler', 'scarecrow', 'dandelion', 'watering-can',
];

/** 아이템 종류 → 그림 파일 이름(세로 삽도 같은 그림) */
function itemFile(kind: string): string {
  return kind === 'rocket-h' || kind === 'rocket-v' ? 'rocket' : kind;
}

const DEBRIS = ['dirt', 'crumb', 'leaf-green', 'leaf-orange', 'drop-water', 'drop-juice', 'seed', 'petal'];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 부드러운 원형 빛. 가산 혼합으로 얹으면 겹칠수록 밝아진다. */
function makeGlowTexture(pixi: Pixi): Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return pixi.Texture.from(canvas);
}

/**
 * 씨·알갱이 조각: 흰 원 + 진한 외곽선. 흰 면만 채소 색으로 물들고 외곽선은
 * 진하게 남아서 플랫 그림체(채소 그림의 테두리)와 맞는다.
 * (즙 자체는 액체 층이 그리므로 여기엔 단단한 조각만 있다)
 */
function makeJuiceTextures(pixi: Pixi): { drop: Texture; blob: Texture } {
  const draw = (size: number, path: (ctx: CanvasRenderingContext2D, s: number) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.lineJoin = 'round';
    path(ctx, size);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = size * 0.07;
    ctx.strokeStyle = 'rgba(40, 22, 10, 0.75)';
    ctx.stroke();
    return canvas;
  };
  // 물방울
  const drop = draw(64, (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.08);
    ctx.bezierCurveTo(s * 0.72, s * 0.38, s * 0.86, s * 0.55, s * 0.86, s * 0.66);
    ctx.arc(s * 0.5, s * 0.66, s * 0.36, 0, Math.PI, false);
    ctx.bezierCurveTo(s * 0.14, s * 0.55, s * 0.28, s * 0.38, s * 0.5, s * 0.08);
    ctx.closePath();
  });
  // 씨·알갱이
  const blob = draw(64, (ctx, s) => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
  });
  return { drop: pixi.Texture.from(drop), blob: pixi.Texture.from(blob) };
}

/**
 * 액체(메타볼) 필터.
 *
 * 가장자리가 투명해지는 둥근 방울들을 겹쳐 그리면 겹친 곳의 알파가 올라간다.
 * 그 알파를 문턱에서 날카롭게 자르면 방울끼리 가까울 땐 끈적하게 이어지고,
 * 멀어지면 실처럼 늘어나다 끊어지는 액체 모양이 된다. 흐림 필터를 따로 쓰지 않아
 * 폰에서도 가볍다.
 *
 * 그림체에 맞추려고 경계 바로 안쪽을 진하게(테두리), 두꺼운 가운데를 밝게(도톰함),
 * 왼쪽 위 가장자리에 흰 반사광을 넣는다.
 */
function makeGooFilter(pixi: Pixi) {
  // Pixi v8 기본 필터 정점 셰이더(defaultFilter.vert)와 같다
  const vertex = `in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord(void) { return aPosition * (uOutputFrame.zw * uInputSize.zw); }
void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}`;
  const fragment = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
// 정점 셰이더(highp)와 정밀도가 다르면 프로그램 링크가 실패한다 - 맞춰 둔다
uniform highp vec4 uInputSize;
void main(void) {
  vec4 c = texture(uTexture, vTextureCoord);
  float a = c.a;
  // 액체 경계: 문턱 아래는 버린다
  float body = smoothstep(0.40, 0.46, a);
  if (body <= 0.0) { finalColor = vec4(0.0); return; }
  vec3 col = c.rgb / max(a, 0.0001);
  // 맑은 과즙: 채도를 올려 색이 섞인 곳도 흐려지지 않게 한다
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(luma), col, 1.22) * 1.06, 0.0, 1.0);
  // 도톰함: 겹쳐서 두꺼운 가운데일수록 밝게
  float bulge = smoothstep(0.62, 0.98, a);
  col = mix(col, min(col * 1.18 + 0.04, vec3(1.0)), bulge * 0.5);
  // 반사광: 왼쪽 위로 몇 픽셀 옮긴 곳이 더 얇으면 빛을 받는 가장자리
  vec2 px = uInputSize.zw * 3.0;
  float an = texture(uTexture, vTextureCoord - px).a;
  // 반사광은 두꺼운 즙에만 - 작은 방울까지 넣으면 하얀 조각처럼 보인다
  float spec = smoothstep(0.08, 0.22, a - an) * smoothstep(0.66, 0.8, a);
  col = mix(col, vec3(1.0), spec * 0.6);
  // 테두리: 경계 바로 안쪽 띠를 진하게 - 채소 그림의 외곽선과 맞춘다
  // 얇게, 너무 검지 않게 - 넓고 진하면 작은 방울이 통째로 어두워져 탁해 보인다
  float rim = 1.0 - smoothstep(0.46, 0.51, a);
  col = mix(col, col * 0.6, rim * 0.85);
  finalColor = vec4(col * body, body);
}`;
  return new pixi.Filter({
    glProgram: pixi.GlProgram.from({ vertex, fragment, name: 'jk-goo' }),
    resources: {},
  });
}

/** 깃털: 끝이 뾰족한 잎 모양 + 가운데 깃대. 흰 면만 물들고 테두리는 진하게 남는다 */
function makeFeatherTexture(pixi: Pixi): Texture {
  const w = 40;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.bezierCurveTo(w - 3, h * 0.3, w - 4, h * 0.7, w / 2, h - 6);
  ctx.bezierCurveTo(4, h * 0.7, 3, h * 0.3, w / 2, 4);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(60, 34, 16, 0.7)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.lineTo(w / 2, h - 2);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  return pixi.Texture.from(canvas);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const FxLayer: React.FC<Props> = ({ step, tick, cols, rows, shakeTarget }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // Pixi 준비. StrictMode에서 두 번 마운트돼도 하나만 살아남게 cancelled로 막는다.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let made: Engine | null = null;
    (async () => {
      const pixi = await import('pixi.js');
      const { ShockwaveFilter } = await import('pixi-filters/shockwave');
      const host = hostRef.current;
      if (cancelled || !host) return;
      const app = new pixi.Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: host,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        // 액체 필터를 GLSL로만 썼다 - WebGPU로 잡히면 필터가 안 돈다
        preference: 'webgl',
      });
      if (cancelled) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }
      host.appendChild(app.canvas);
      const [shovel, sparrow, sparrowDown, swallow, swallowUp, frog, frogLeap, scarecrow, ...debrisTex] = await Promise.all([
        pixi.Assets.load<Texture>('/assets/3match/items/rocket.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/sparrow.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/sparrow-down.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/swallow.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/swallow-up.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/frog.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/frog-leap.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/scarecrow.png'),
        ...DEBRIS.map(n => pixi.Assets.load<Texture>(`/assets/3match/fx/${n}.png`)),
      ]);
      const itemTex = await Promise.all(ITEM_FILES.map(n => pixi.Assets.load<Texture>(`/assets/3match/items/${n}.png`)));
      if (cancelled) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }
      const root = new pixi.Container();
      app.stage.addChild(root);
      // 과즙 액체는 다른 파편보다 아래에 깐다(씨·잎이 액체 위로 튀어야 한다)
      const goo = new pixi.Container();
      goo.filters = [makeGooFilter(pixi)];
      goo.filterArea = app.screen;
      root.addChild(goo);
      made = {
        pixi,
        app,
        root,
        tex: {
          glow: makeGlowTexture(pixi),
          shovel,
          sparrow,
          sparrowDown,
          swallow,
          swallowUp,
          frog,
          frogLeap,
          scarecrow,
          feather: makeFeatherTexture(pixi),
          items: Object.fromEntries(ITEM_FILES.map((n, i) => [n, itemTex[i]])),
          juice: makeJuiceTextures(pixi),
          debris: Object.fromEntries(DEBRIS.map((n, i) => [n, debrisTex[i]])),
        },
        ShockwaveFilter,
        clock: 0,
        tasks: [],
        updaters: [],
        waves: [],
        goo,
      };
      const engine = made;
      app.ticker.add(ticker => {
        // 탭이 오래 숨었다 돌아오면 dt가 튄다 - 한 번에 너무 많이 진행하지 않게 자른다.
        const dt = Math.min(ticker.deltaMS, 50);
        engine.clock += dt;
        const due = engine.tasks.filter(t => t.at <= engine.clock);
        engine.tasks = engine.tasks.filter(t => t.at > engine.clock);
        due.forEach(t => t.run());
        // 업데이트 도중에 새 파티클이 생길 수 있다(삽 꼬리의 흙). filter 결과를 그대로
        // 덮어쓰면 그동안 추가된 것이 목록에서 빠져, 화면에 멈춘 채 영원히 남는다.
        const running = engine.updaters;
        engine.updaters = [];
        const alive = running.filter(u => u(dt));
        engine.updaters = alive.concat(engine.updaters);
      });
      engineRef.current = engine;
    })();
    return () => {
      cancelled = true;
      if (made) {
        made.app.destroy({ removeView: true }, { children: true });
        engineRef.current = null;
      }
    };
  }, []);

  // 터짐 단계가 새로 시작될 때마다 그 단계의 이펙트를 시각표대로 건다.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !step || step.kind !== 'clear') return;
    const host = hostRef.current;
    if (!host) return;
    const cell = host.clientWidth / cols;
    const schedule = scheduleClear(step);
    spawnJuice(engine, step, schedule.delays, cell);
    schedule.blasts.forEach(sb => {
      if (!blastHasFx(sb.blast)) return;
      switch (sb.blast.kind) {
        case 'tnt':
          spawnFertilizer(engine, sb, cell, shakeTarget.current);
          break;
        case 'propeller':
          spawnSparrow(engine, sb, cell);
          break;
        case 'butterfly':
          spawnSwallows(engine, sb, cell);
          break;
        case 'ladybug':
          spawnFrog(engine, sb, cell, shakeTarget.current);
          break;
        case 'scarecrow':
          spawnScarecrow(engine, sb, step, cell, cols, rows);
          break;
        default:
          spawnShovel(engine, sb, cell, cols, rows);
      }
    });
    // 참새가 실어 온 아이템인데 전용 이펙트가 없으면(낫·쟁기 등) 도착 순간 펑 하고 터진 걸 보여 준다
    schedule.blasts.forEach(sb => {
      if (!sb.carried || blastHasFx(sb.blast)) return;
      const c = centerOf(sb.blast.row, sb.blast.col, cell);
      at(engine, sb.start, () => {
        hitStar(engine, c.x, c.y, cell, 1.1);
        dustPuff(engine, c.x, c.y, cell, 8, 1.3);
        debrisBurst(engine, c.x, c.y, cell, 12, ['dirt', 'crumb', 'leaf-green'], 1);
      });
    });
    // tick이 바뀔 때만 다시 건다 - 같은 단계를 두 번 쏘지 않게.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return <div ref={hostRef} className="jk-fx-layer" aria-hidden />;
};

export default FxLayer;

// ───────────────────────── 공용 조각 ─────────────────────────

function at(engine: Engine, delay: number, run: () => void) {
  engine.tasks.push({ at: engine.clock + delay, run });
}

/** 수명이 다하면 스스로 지워지는 스프라이트 하나 */
function particle(
  engine: Engine,
  sprite: Sprite,
  opts: {
    vx: number;
    vy: number;
    gravity?: number;
    spin?: number;
    life: number;
    grow?: number;
    fadeFrom?: number;
    /** 어디에 붙일지. 기본은 이펙트 층 맨 위 */
    parent?: Container;
    /** 빠를수록 진행 방향으로 길쭉하게(액체 방울) */
    stretch?: number;
  },
) {
  (opts.parent ?? engine.root).addChild(sprite);
  const base = sprite.scale.x;
  const baseAlpha = sprite.alpha;
  let age = 0;
  let { vx, vy } = opts;
  engine.updaters.push(dt => {
    age += dt;
    vy += (opts.gravity ?? 0) * dt;
    sprite.x += vx * dt;
    sprite.y += vy * dt;
    sprite.rotation += (opts.spin ?? 0) * dt;
    const t = age / opts.life;
    if (opts.grow) sprite.scale.set(base * (1 + opts.grow * easeOut(Math.min(1, t))));
    if (opts.stretch) {
      // 날아가는 방향으로 눕혀 늘이고, 옆으로는 조금 얇게
      const speed = Math.hypot(vx, vy);
      sprite.rotation = Math.atan2(vy, vx);
      sprite.scale.set(base * (1 + speed * opts.stretch), base * (1 - Math.min(0.35, speed * opts.stretch * 0.4)));
    }
    const fadeFrom = opts.fadeFrom ?? 0.6;
    sprite.alpha = t < fadeFrom ? baseAlpha : baseAlpha * Math.max(0, 1 - (t - fadeFrom) / (1 - fadeFrom));
    if (age >= opts.life) {
      sprite.destroy();
      return false;
    }
    return true;
  });
}

function sizeTo(sprite: Sprite, px: number) {
  const s = px / Math.max(sprite.texture.width, sprite.texture.height);
  sprite.scale.set(s);
}

function centerOf(row: number, col: number, cell: number) {
  return { x: (col + 0.5) * cell, y: (row + 0.5) * cell };
}

/** 흙먼지 한 무리 */
function dustPuff(engine: Engine, x: number, y: number, cell: number, count: number, spread = 0.35) {
  const { pixi, tex } = engine;
  for (let i = 0; i < count; i++) {
    const s = new pixi.Sprite(tex.glow);
    s.anchor.set(0.5);
    s.tint = 0x9c7048;
    s.alpha = 0.45;
    sizeTo(s, cell * rand(0.5, 0.8));
    s.x = x + rand(-1, 1) * cell * 0.2;
    s.y = y + rand(-1, 1) * cell * 0.2;
    const a = rand(0, Math.PI * 2);
    const v = rand(0.0006, 0.0018) * cell * spread;
    particle(engine, s, {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 0.0004 * cell, // 먼지는 살짝 떠오른다
      life: rand(260, 360),
      grow: 0.9,
      fadeFrom: 0.1,
    });
  }
}

/** 튀는 파편(흙덩이·잎) */
function debrisBurst(engine: Engine, x: number, y: number, cell: number, count: number, kinds: string[], power = 1) {
  const { pixi, tex } = engine;
  for (let i = 0; i < count; i++) {
    const s = new pixi.Sprite(tex.debris[kinds[i % kinds.length]]);
    s.anchor.set(0.5);
    sizeTo(s, cell * rand(0.3, 0.52));
    s.x = x;
    s.y = y;
    s.rotation = rand(0, Math.PI * 2);
    const a = rand(0, Math.PI * 2);
    // 셀 크기에 비례한 속도 - 폰·태블릿에서 같은 칸 수만큼 튄다
    const v = rand(0.004, 0.011) * cell * power;
    particle(engine, s, {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 0.004 * cell,
      gravity: 0.00004 * cell,
      spin: rand(-0.012, 0.012),
      life: rand(620, 920),
      fadeFrom: 0.65,
    });
  }
}

function shake(target: HTMLElement | null, amp: number, ms: number) {
  if (!target || typeof target.animate !== 'function') return;
  const frames: Keyframe[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const k = (1 - i / steps) * amp;
    frames.push({ transform: i === steps ? 'translate(0,0)' : `translate(${rand(-k, k)}px, ${rand(-k, k)}px)` });
  }
  target.animate(frames, { duration: ms, easing: 'linear' });
}

// ───────────────────────── 거름포대 (TNT) ─────────────────────────
//
// 예비 동작(부풀며 떨림, 판 칸 CSS) → 멈칫(히트스톱) → 섬광 + 사각 충격파 +
// 흙·잎 파편 + 흙먼지 + 판 흔들림. 칸은 충격파가 닿는 순서로 사라진다.

function spawnFertilizer(engine: Engine, sb: ScheduledBlast, cell: number, shakeEl: HTMLElement | null) {
  const { pixi, tex, root } = engine;
  const { x, y } = centerOf(sb.blast.row, sb.blast.col, cell);
  const boom = sb.start + FX_TIMING.tntCharge + FX_TIMING.tntHitstop;
  // 거름포대 둘을 합친 대폭발(반경 4). 실려 와서 터지는 포대는 보통 크기다.
  const big = !!sb.blast.combo && !sb.carried;
  const K = big ? 1.8 : 1;

  if (big) {
    // 두 포대가 합쳐져 큰 포대로 부풀며 부르르 떤다 → 터진다
    at(engine, sb.start, () => {
      const sack = new pixi.Sprite(tex.items.tnt);
      sack.anchor.set(0.5);
      sack.x = x;
      sack.y = y;
      root.addChild(sack);
      let age = 0;
      const dur = FX_TIMING.tntCharge + FX_TIMING.tntHitstop;
      engine.updaters.push(dt => {
        age += dt;
        const t = Math.min(1, age / FX_TIMING.tntCharge);
        sizeTo(sack, cell * (1.1 + 1.3 * easeOut(t)));
        sack.rotation = age < FX_TIMING.tntCharge ? Math.sin(age * 0.12) * 0.12 * t : 0;
        sack.x = x + (age < FX_TIMING.tntCharge ? Math.sin(age * 0.33) * cell * 0.03 * t : 0);
        if (age >= dur) {
          sack.destroy();
          return false;
        }
        return true;
      });
    });
  }

  // 예비 동작 동안 발밑에 모이는 따뜻한 빛
  at(engine, sb.start, () => {
    const g = new pixi.Sprite(tex.glow);
    g.anchor.set(0.5);
    g.blendMode = 'add';
    g.tint = 0xffc46b;
    g.alpha = 0.0;
    g.x = x;
    g.y = y;
    sizeTo(g, cell * 1.2);
    root.addChild(g);
    let age = 0;
    const dur = FX_TIMING.tntCharge + FX_TIMING.tntHitstop;
    engine.updaters.push(dt => {
      age += dt;
      const t = Math.min(1, age / dur);
      g.alpha = 0.85 * t;
      sizeTo(g, cell * (1.2 + 0.6 * t + Math.sin(age * 0.09) * 0.08));
      if (age >= dur) {
        g.destroy();
        return false;
      }
      return true;
    });
  });

  at(engine, boom, () => {
    // 펑! 만화풍 별. 밝은 흙색 판에서는 가산 혼합 빛이 거의 안 보여서
    // 단색 면 + 진한 테두리로 그린다(플랫 그림체와도 맞는다).
    const star = new pixi.Graphics();
    const spikes = 10;
    const pts: number[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 1 : 0.55 + Math.random() * 0.1;
      const a = (i / (spikes * 2)) * Math.PI * 2 + rand(-0.06, 0.06);
      pts.push(Math.cos(a) * r * 100, Math.sin(a) * r * 100);
    }
    star.poly(pts).fill({ color: 0xffd84a }).stroke({ width: 10, color: 0xf07a1a });
    star.poly(pts.map(v => v * 0.55)).fill({ color: 0xfff6c8 });
    star.scale.set((cell / 100) * 0.6);
    star.x = x;
    star.y = y;
    star.rotation = rand(0, Math.PI);
    root.addChild(star);
    let sAge = 0;
    engine.updaters.push(dt => {
      sAge += dt;
      const t = sAge / 300;
      // 확 커졌다가 살짝 줄며 사라진다
      const sc = K * (cell / 100) * (t < 0.35 ? 0.6 + 2.0 * easeOut(t / 0.35) : 2.6 - 0.6 * (t - 0.35));
      star.scale.set(sc);
      star.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5);
      if (t >= 1) {
        star.destroy();
        return false;
      }
      return true;
    });

    // 별 뒤를 받치는 빛 (어두운 칸·장애물 위에서는 이게 살린다)
    const flash = new pixi.Sprite(tex.glow);
    flash.anchor.set(0.5);
    flash.blendMode = 'add';
    flash.tint = 0xffe08a;
    flash.x = x;
    flash.y = y;
    sizeTo(flash, cell * 2.4 * K);
    particle(engine, flash, { vx: 0, vy: 0, life: 320, grow: 1.8, fadeFrom: 0.1 });

    // 사각 충격파 - 5x5 범위의 테두리까지 퍼진다
    const ring = new pixi.Graphics();
    root.addChild(ring);
    let age = 0;
    const reach = FX_TIMING.tntRing * (big ? 4.5 : 2.5);
    engine.updaters.push(dt => {
      age += dt;
      const t = Math.min(1, age / (reach + 160));
      const half = cell * (0.5 + (big ? 4.2 : 2.2) * easeOut(Math.min(1, age / reach)) + 0.35 * t);
      ring.clear();
      const w = Math.max(2, cell * 0.16 * (1 - t));
      ring
        .roundRect(x - half, y - half, half * 2, half * 2, cell * 0.35)
        .stroke({ width: w + 4, color: 0x8a5a3b, alpha: 0.55 * (1 - t) })
        .roundRect(x - half, y - half, half * 2, half * 2, cell * 0.35)
        .stroke({ width: w, color: 0xfffbe8, alpha: 0.95 * (1 - t) });
      if (t >= 1) {
        ring.destroy();
        return false;
      }
      return true;
    });

    // 공기 일렁임 - 이펙트 층 전체(빛·먼지)를 충격파로 휘게 한다
    const wave = new engine.ShockwaveFilter({
      center: { x, y },
      amplitude: cell * 0.22 * K,
      wavelength: cell * 1.3,
      speed: cell * 9,
      radius: cell * 3.4 * K,
      brightness: 1.12,
    });
    root.filterArea = engine.app.screen;
    engine.waves.push(wave);
    root.filters = [...engine.waves];
    let wAge = 0;
    engine.updaters.push(dt => {
      wAge += dt;
      wave.time = wAge / 1000;
      if (wAge > 420) {
        engine.waves = engine.waves.filter(w => w !== wave);
        root.filters = engine.waves.length > 0 ? [...engine.waves] : [];
        wave.destroy();
        return false;
      }
      return true;
    });

    debrisBurst(engine, x, y, cell, Math.round(26 * K), ['dirt', 'crumb', 'dirt', 'leaf-green', 'crumb', 'leaf-orange'], 1.2 * K);
    dustPuff(engine, x, y, cell, Math.round(10 * K), 1.4 * K);
    shake(shakeEl, Math.max(3, cell * 0.09) * K, 300 * K);
  });
}

// ───────────────────────── 삽 (로켓) ─────────────────────────
//
// 제자리에서 흙을 튀기며 출발 → 삽 두 자루가 양 끝으로 날아가며 흙 꼬리를 남기고,
// 지나간 칸이 차례로 사라진다(칸 시각은 schedule.ts의 rocketCell과 같다).

function spawnShovel(engine: Engine, sb: ScheduledBlast, cell: number, cols: number, rows: number) {
  const { pixi, tex, root } = engine;
  const { row, col, kind } = sb.blast;
  const horizontal = kind === 'rocket-h';
  const { x, y } = centerOf(row, col, cell);

  at(engine, sb.start, () => {
    dustPuff(engine, x, y, cell, 5, 0.6);
    debrisBurst(engine, x, y, cell, 6, ['crumb', 'dirt'], 0.6);
  });

  at(engine, sb.start + FX_TIMING.rocketLaunch, () => {
    const speed = cell / FX_TIMING.rocketCell; // px/ms - 칸이 사라지는 속도와 같다
    const limit = (horizontal ? cols : rows) * cell + cell;
    ([-1, 1] as const).forEach(dir => {
      const s = new pixi.Sprite(tex.shovel);
      s.anchor.set(0.5);
      sizeTo(s, cell * (sb.blast.combo && !sb.carried ? 1.5 : 1.05));
      if (horizontal) s.scale.x *= dir; // 그림은 오른쪽을 본다
      else s.rotation = (dir * Math.PI) / 2;
      s.x = x;
      s.y = y;

      // 삽 밑의 빛 꼬리
      const streak = new pixi.Sprite(tex.glow);
      streak.anchor.set(0.5);
      streak.blendMode = 'add';
      streak.tint = 0xfff0c8;
      streak.alpha = 0.7;
      root.addChild(streak);
      root.addChild(s);

      let travelled = 0;
      let sinceTrail = 0;
      engine.updaters.push(dt => {
        const step = speed * dt;
        travelled += step;
        if (horizontal) s.x += step * dir;
        else s.y += step * dir;
        // 꼬리는 진행 방향으로 길게 늘인다
        const len = Math.min(travelled, cell * 2.2);
        const thick = cell * (sb.blast.combo && !sb.carried ? 1.2 : 0.55);
        streak.width = horizontal ? len : thick;
        streak.height = horizontal ? thick : len;
        streak.x = horizontal ? s.x - (dir * len) / 2 : s.x;
        streak.y = horizontal ? s.y : s.y - (dir * len) / 2;

        sinceTrail += dt;
        if (sinceTrail > 22) {
          sinceTrail = 0;
          const d = new pixi.Sprite(tex.debris[Math.random() < 0.7 ? 'crumb' : 'dirt']);
          d.anchor.set(0.5);
          sizeTo(d, cell * rand(0.16, 0.26));
          d.x = s.x;
          d.y = s.y;
          const side = Math.random() < 0.5 ? -1 : 1;
          particle(engine, d, {
            vx: horizontal ? -dir * speed * 0.08 : side * rand(0.001, 0.003) * cell,
            vy: horizontal ? -rand(0.001, 0.004) * cell : -dir * speed * 0.08,
            gravity: 0.00003 * cell,
            spin: rand(-0.015, 0.015),
            life: rand(320, 480),
            fadeFrom: 0.4,
          });
        }
        if (travelled > limit) {
          s.destroy();
          streak.destroy();
          return false;
        }
        return true;
      });
    });
  });
}

// ───────────────────────── 채소 과즙 ─────────────────────────
//
// 채소가 사라지는 순간 그 채소에 어울리는 즙과 조각이 튄다. 칸이 사라지는 시각
// (schedule.delays)에 맞춰 터뜨려서, 삽이 지나가거나 충격파가 퍼질 때도 물결을 따라간다.

interface JuiceRecipe {
  /** 즙 색 */
  juice: number;
  /** 즙 방울과 함께 튀는 조각: 파편 그림 이름 또는 물든 알갱이 */
  bits: { tex: string; tint?: number; count: number; size: [number, number] }[];
}

/** 색 인덱스 = 채소 (gems/gem-N.png): 0 토마토, 1 양배추, 2 블루베리, 3 옥수수, 4 가지, 5 당근 */
const JUICE: JuiceRecipe[] = [
  { juice: 0xe8322b, bits: [{ tex: 'blob', tint: 0xf3e07a, count: 3, size: [0.08, 0.11] }] }, // 토마토: 노란 씨
  { juice: 0x9ad24e, bits: [{ tex: 'leaf-green', count: 3, size: [0.18, 0.26] }] }, // 양배추: 잎 조각
  { juice: 0x4a63e0, bits: [{ tex: 'blob', tint: 0x4f6ad8, count: 3, size: [0.1, 0.14] }] }, // 블루베리: 작은 알
  { juice: 0xffd23a, bits: [{ tex: 'blob', tint: 0xffe066, count: 5, size: [0.1, 0.14] }] }, // 옥수수: 알갱이
  { juice: 0xa457d6, bits: [{ tex: 'leaf-green', count: 1, size: [0.16, 0.2] }] }, // 가지: 꼭지
  { juice: 0xff8a2a, bits: [{ tex: 'blob', tint: 0xff9a3c, count: 3, size: [0.12, 0.16] }, { tex: 'leaf-green', count: 1, size: [0.16, 0.22] }] }, // 당근
];

/** 칸이 줄어드는 애니메이션(jk-pop)이 가장 부풀었을 때 터뜨린다 */
const JUICE_AT = 70;

function spawnJuice(engine: Engine, step: TurnStep, delays: Map<string, number>, cell: number) {
  if (step.kind !== 'clear') return;
  // 한꺼번에 많이 터지면(합체·큰 연쇄) 칸당 조각 수를 줄여 폰에서도 버티게 한다
  const many = step.cells.length > 20;
  step.cells.forEach(k => {
    const { row, col } = parseKey(k);
    const gem = cellAt(step.board, row, col).gem;
    // 아이템은 자기 이펙트가 있고, 수집물은 터지지 않는다
    if (!gem || gem.special || gem.inert || gem.color === null) return;
    const recipe = JUICE[gem.color];
    if (!recipe) return;
    const x = (col + 0.5) * cell;
    const y = (row + 0.5) * cell;
    at(engine, (delays.get(k) ?? 0) + JUICE_AT, () => juiceBurst(engine, x, y, cell, recipe, many));
  });
}

function juiceBurst(engine: Engine, x: number, y: number, cell: number, recipe: JuiceRecipe, many: boolean) {
  const { pixi, tex } = engine;

  // 칸 자리에 퍼지는 즙 자국은 쓰지 않는다. 채소와 같은 색에 굵은 외곽선이 둘려
  // "채소가 두꺼운 테두리로 부푼 덩어리"처럼 보였다. 튀어 나가는 것만 남긴다.

  // 1) 즙 방울 - 사방으로 튀었다가 떨어진다. 방울은 날아가는 방향으로 기운다.
  //    크기를 섞어(큰 방울 몇 + 작은 방울 여럿) 한 번에 "촤악" 퍼지는 느낌을 낸다.
  const drops = many ? 4 : 9;
  for (let i = 0; i < drops; i++) {
    const s = new pixi.Sprite(tex.juice.drop);
    s.anchor.set(0.5, 0.65);
    s.tint = recipe.juice;
    sizeTo(s, cell * (i % 3 === 0 ? rand(0.22, 0.28) : rand(0.15, 0.21)));
    s.x = x;
    s.y = y;
    const a = (i / drops) * Math.PI * 2 + rand(-0.35, 0.35);
    const v = rand(0.0042, 0.0078) * cell;
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v - 0.0032 * cell;
    s.rotation = Math.atan2(vy, vx) + Math.PI / 2 + Math.PI;
    particle(engine, s, { vx, vy, gravity: 0.000036 * cell, life: rand(420, 580), fadeFrom: 0.55 });
  }

  // 2) 은은한 액체 - 실처럼 늘어나는 가는 방울. 날아가며 사라지므로 칸에 남지 않는다.
  //    (칸 자리에 고이는 웅덩이는 얼룩처럼 보여서 뺐다)
  const strands = many ? 2 : 5;
  for (let i = 0; i < strands; i++) {
    const a = (i / strands) * Math.PI * 2 + rand(-0.5, 0.5) - Math.PI * 0.15;
    const v = rand(0.0055, 0.0095) * cell;
    [1, 0.6].forEach((k, j) => {
      const d = new pixi.Sprite(tex.glow);
      d.anchor.set(0.5);
      d.tint = recipe.juice;
      d.x = x;
      d.y = y;
      sizeTo(d, cell * (j === 0 ? rand(0.34, 0.44) : rand(0.26, 0.34)));
      particle(engine, d, {
        vx: Math.cos(a) * v * k,
        vy: Math.sin(a) * v * k - 0.0022 * cell,
        gravity: 0.00005 * cell,
        life: rand(320, 420),
        fadeFrom: 0.3,
        stretch: 95 / cell,
        parent: engine.goo,
      });
    });
  }

  // 3) 물보라 - 테두리 없는 아주 작은 과즙 입자가 빠르게 흩어진다. 터지는 순간의 "치익"
  if (!many) {
    for (let i = 0; i < 8; i++) {
      const m = new pixi.Sprite(tex.glow);
      m.anchor.set(0.5);
      m.tint = recipe.juice;
      m.alpha = 0.9;
      sizeTo(m, cell * rand(0.1, 0.17));
      m.x = x;
      m.y = y;
      const a = rand(0, Math.PI * 2);
      const v = rand(0.008, 0.013) * cell;
      particle(engine, m, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.002 * cell,
        gravity: 0.00004 * cell,
        life: rand(220, 320),
        fadeFrom: 0.3,
      });
    }
  }

  // 4) 조각 - 씨·잎·알갱이
  recipe.bits.forEach(bit => {
    const n = many ? Math.ceil(bit.count / 2) : bit.count;
    for (let i = 0; i < n; i++) {
      const t = bit.tex === 'blob' ? tex.juice.blob : tex.debris[bit.tex];
      const s = new pixi.Sprite(t);
      s.anchor.set(0.5);
      if (bit.tint !== undefined) s.tint = bit.tint;
      sizeTo(s, cell * rand(bit.size[0], bit.size[1]) * 1.6);
      s.x = x + rand(-0.15, 0.15) * cell;
      s.y = y + rand(-0.15, 0.15) * cell;
      s.rotation = rand(0, Math.PI * 2);
      const a = rand(0, Math.PI * 2);
      const v = rand(0.003, 0.006) * cell;
      particle(engine, s, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.004 * cell,
        gravity: 0.00004 * cell,
        spin: rand(-0.012, 0.012),
        life: rand(460, 640),
        fadeFrom: 0.55,
      });
    }
  });
}

// ───────────────────────── 날아가는 친구들 공용 ─────────────────────────

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function quad(a: number, c: number, b: number, t: number) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * c + t * t * b;
}

/** 깃털 몇 장이 튀어 나갔다가 좌우로 흔들리며 내려앉는다 */
function featherPuff(engine: Engine, x: number, y: number, cell: number, count: number, tints: number[]) {
  const { pixi, tex } = engine;
  for (let i = 0; i < count; i++) {
    const f = new pixi.Sprite(tex.feather);
    f.anchor.set(0.5);
    f.tint = tints[i % tints.length];
    sizeTo(f, cell * rand(0.26, 0.38));
    f.x = x + rand(-0.15, 0.15) * cell;
    f.y = y + rand(-0.15, 0.15) * cell;
    const a = rand(0, Math.PI * 2);
    const v = rand(0.0015, 0.004) * cell;
    let age = 0;
    const life = rand(650, 900);
    const sway = rand(0.006, 0.01);
    const phase = rand(0, Math.PI * 2);
    let vx = Math.cos(a) * v;
    let vy = Math.sin(a) * v - 0.002 * cell;
    engine.root.addChild(f);
    engine.updaters.push(dt => {
      age += dt;
      vx *= Math.pow(0.992, dt);
      vy = vy * Math.pow(0.99, dt) + 0.000012 * cell * dt;
      f.x += vx * dt + Math.sin(age * sway + phase) * cell * 0.004;
      f.y += vy * dt;
      f.rotation = Math.sin(age * sway + phase) * 0.9;
      const t = age / life;
      f.alpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
      if (age >= life) {
        f.destroy();
        return false;
      }
      return true;
    });
  }
}

/** 콕! 맞은 자리에 터지는 작은 만화풍 별 */
function hitStar(engine: Engine, x: number, y: number, cell: number, size: number, color = 0xfff1a8) {
  const { pixi, root } = engine;
  const star = new pixi.Graphics();
  const spikes = 7;
  const pts: number[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    pts.push(Math.cos(a) * r * 100, Math.sin(a) * r * 100);
  }
  star.poly(pts).fill({ color }).stroke({ width: 12, color: 0xd9822b });
  // 첫 갱신 전에 한 번 그려질 수 있다 - 원래 크기(반지름 100px)로 번쩍이지 않게 미리 줄여 둔다
  star.scale.set((cell / 100) * size * 0.3);
  star.x = x;
  star.y = y;
  star.rotation = rand(0, Math.PI);
  root.addChild(star);
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    const t = age / 220;
    star.scale.set((cell / 100) * size * (t < 0.4 ? 0.3 + 0.7 * easeOut(t / 0.4) : 1 - 0.3 * (t - 0.4)));
    star.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5);
    if (t >= 1) {
      star.destroy();
      return false;
    }
    return true;
  });
}

/** 그림은 오른쪽을 본다. 왼쪽으로 갈 땐 뒤집고, 진행 각도만큼 기울인다 */
function face(sprite: Sprite, base: number, vx: number, vy: number, tilt: number, maxTilt: number) {
  const left = vx < -0.0001;
  sprite.scale.x = left ? -Math.abs(base) : Math.abs(base);
  const ang = Math.atan2(vy, Math.abs(vx) + 1e-6);
  const r = Math.max(-maxTilt, Math.min(maxTilt, ang * tilt));
  sprite.rotation = left ? -r : r;
}

// ───────────────────────── 참새 (프로펠러) ─────────────────────────
//
// 제자리에서 파닥이며 수직으로 떠오른다(날갯바람에 주변 십자가 날아감) → 같은 높이로
// 곧게 날아가(그림자가 땅을 따라온다) → 목표 위에 내려앉아 콕콕 두 번 쪼며 "짹!" →
// 앞쪽 위로 비스듬히 날아올라 사라진다. 날개는 위·아래 두 장을 번갈아 그린다.

function spawnSparrow(engine: Engine, sb: ScheduledBlast, cell: number) {
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const target = flightTargets(b)[0];
  const from = centerOf(b.row, b.col, cell);
  const to = centerOf(target.row, target.col, cell);
  const takeoff = FX_TIMING.sparrowTakeoff;
  const arrive = arrivalMs(b, target);
  // 비행 = 높이 떠서 수평으로 날기 + 마지막에 내려와 쪼기. 포물선으로 튀면 개구리처럼 보인다.
  const DIVE = 90;
  const cruise = Math.max(60, arrive - takeoff - DIVE);
  const ALT = cell * 0.75; // 나는 높이(땅=칸 가운데 기준)
  const PECK2 = 110; // 두 번째 콕
  const LEAVE = 420;
  const dir = to.x < from.x - 1 ? -1 : to.x > from.x + 1 ? 1 : Math.random() < 0.5 ? -1 : 1;

  at(engine, sb.start, () => {
    // 땅 그림자: 새가 떠 있다는 걸 알려 준다(높이 = 그림자와 몸 사이 거리)
    const shadow = new pixi.Sprite(tex.glow);
    shadow.anchor.set(0.5);
    shadow.tint = 0x2a1a0c;
    shadow.alpha = 0;
    root.addChild(shadow);

    const s = new pixi.Sprite(tex.sparrow);
    s.anchor.set(0.5);
    sizeTo(s, cell * 1.35);
    const base = s.scale.y;
    s.x = from.x;
    s.y = from.y;
    // 합체: 실어 나르는 아이템을 발밑에 매달고 간다(도착하면 떨어뜨려 터뜨린다)
    const cargo = sb.payload ? new pixi.Sprite(tex.items[itemFile(sb.payload)]) : null;
    if (cargo) {
      cargo.anchor.set(0.5, 0.15);
      sizeTo(cargo, cell * 0.85);
      if (sb.payload === 'rocket-v') cargo.rotation = Math.PI / 2;
      root.addChild(cargo);
    }
    root.addChild(s);
    featherPuff(engine, from.x, from.y, cell, 4, [0xc89a6a, 0xf3e3c8]);
    dustPuff(engine, from.x, from.y + cell * 0.2, cell, 5, 0.9);

    // 날갯바람: 출발 자리에서 퍼지는 바람 고리(주변 십자가 이 바람에 날아간다)
    const gust = new pixi.Graphics();
    root.addChildAt(gust, 0);
    let gAge = 0;
    engine.updaters.push(dt => {
      gAge += dt;
      const t = Math.min(1, gAge / 280);
      gust.clear();
      gust
        .circle(from.x, from.y, cell * (0.4 + 1.2 * easeOut(t)))
        .stroke({ width: Math.max(1.5, cell * 0.08 * (1 - t)), color: 0xfffbe8, alpha: 0.9 * (1 - t) });
      if (t >= 1) {
        gust.destroy();
        return false;
      }
      return true;
    });

    let age = 0;
    let flapClock = 0;
    let down = false;
    let pecked = 0;
    let gx = from.x; // 땅 위 위치(그림자 자리)
    let gy = from.y;
    let lastGx = gx;
    let lastGy = gy;
    let trailClock = 0;
    engine.updaters.push(dt => {
      age += dt;
      let alt = 0;
      let tilt = 0;
      let flapEvery = 55; // 날갯짓 간격(ms). 뜰 때·내릴 때 더 빠르다
      let alpha = 1;
      if (age < takeoff) {
        // 이륙: 살짝 웅크렸다가(예비 동작) 파닥이며 수직으로 솟는다
        const u = age / takeoff;
        const t = u < 0.3 ? 0 : easeOut((u - 0.3) / 0.7);
        alt = ALT * t - (u < 0.3 ? cell * 0.06 * Math.sin((u / 0.3) * Math.PI) : 0);
        tilt = -0.15 * t;
        flapEvery = u < 0.3 ? 120 : 34;
      } else if (age < takeoff + cruise) {
        // 순항: 같은 높이로 곧게 날아간다. 참새 특유의 작은 오르내림만 얹는다
        const t = (age - takeoff) / cruise;
        // 출발은 또렷하게 보이도록 느긋하게, 가운데서 확 속도를 냈다가 목표 앞에서 브레이크
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        gx = from.x + (to.x - from.x) * e;
        gy = from.y + (to.y - from.y) * e;
        alt = ALT + Math.sin(t * Math.PI * 3) * cell * 0.06;
        tilt = 0.18 * Math.sin(Math.PI * t); // 속도가 붙는 가운데쯤 앞으로 숙인다
      } else if (age < arrive) {
        // 목표 위에서 내려앉으며 고개를 숙인다
        const t = (age - takeoff - cruise) / DIVE;
        gx = to.x;
        gy = to.y;
        alt = ALT * (1 - easeInOut(t)) + cell * 0.18 * easeInOut(t);
        tilt = 0.5 * t;
        flapEvery = 40;
      } else if (age < arrive + PECK2 + 120) {
        // 콕, 콕: 두 번 쪼고 고개를 든다
        gx = to.x;
        gy = to.y;
        const t = age - arrive;
        const peck = (u: number) => Math.max(0, Math.sin(Math.PI * Math.min(1, u)));
        const p = t < PECK2 ? peck(t / 70) : peck((t - PECK2) / 70) * 0.7;
        alt = cell * 0.18 - p * cell * 0.1;
        tilt = 0.25 + 0.5 * p;
        flapEvery = 90;
        if (pecked === 0) {
          pecked = 1;
          hitStar(engine, to.x + dir * cell * 0.22, to.y + cell * 0.1, cell, 0.6);
          featherPuff(engine, to.x, to.y - cell * 0.1, cell, 3, [0xc89a6a, 0xf3e3c8, 0x8a5a3b]);
          debrisBurst(engine, to.x, to.y + cell * 0.1, cell, 6, ['seed', 'crumb'], 0.6);
          bubble(engine, to.x - dir * cell * 0.35, to.y - cell * 0.75, cell, '짹!');
        } else if (pecked === 1 && t >= PECK2) {
          pecked = 2;
          hitStar(engine, to.x + dir * cell * 0.22, to.y + cell * 0.12, cell, 0.38);
          debrisBurst(engine, to.x, to.y + cell * 0.1, cell, 3, ['seed'], 0.45);
        }
      } else {
        // 떠나기: 파닥이며 앞쪽 위로 비스듬히 날아올라 사라진다
        const t = Math.min(1, (age - arrive - PECK2 - 120) / LEAVE);
        const e = t * t;
        gx = to.x + dir * cell * 2.4 * e;
        gy = to.y;
        alt = cell * 0.18 + cell * 2.2 * e + ALT * easeOut(t);
        tilt = -0.3;
        flapEvery = 40;
        alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        if (t >= 1) {
          s.destroy();
          shadow.destroy();
          if (cargo && !cargo.destroyed) cargo.destroy();
          return false;
        }
      }

      // 날갯짓: 위·아래 두 장을 번갈아
      flapClock += dt;
      if (flapClock >= flapEvery) {
        flapClock = 0;
        down = !down;
        s.texture = down ? tex.sparrowDown : tex.sparrow;
        // 아래 그림은 머리가 조금 위에 그려져 있어서 기준점을 맞춰 몸이 튀지 않게 한다
        s.anchor.set(0.5, down ? 0.445 : 0.5);
      }
      // 빠르게 나는 구간에는 바람 줄기를 남겨 속도감을 준다
      trailClock += dt;
      if (trailClock > 22 && age > takeoff && age < takeoff + cruise) {
        trailClock = 0;
        const vx = gx - lastGx;
        const vy = gy - lastGy;
        const sp = Math.hypot(vx, vy);
        if (sp > cell * 0.02) {
          const w = new pixi.Sprite(tex.glow);
          w.anchor.set(0.5);
          w.alpha = Math.min(0.6, sp / (cell * 0.12));
          w.x = s.x - (vx / sp) * cell * 0.45;
          w.y = s.y - (vy / sp) * cell * 0.45;
          w.rotation = Math.atan2(vy, vx);
          w.width = cell * 0.8;
          w.height = cell * 0.11;
          root.addChildAt(w, Math.max(0, root.getChildIndex(s)));
          particle(engine, w, { vx: 0, vy: 0, life: 200, fadeFrom: 0 });
        }
      }
      lastGx = gx;
      lastGy = gy;
      const bob = down ? -cell * 0.03 : 0; // 내리칠 때 몸이 살짝 뜬다
      s.x = gx;
      s.y = gy - alt + bob;
      s.scale.set(base * dir, base);
      s.rotation = dir * tilt;
      s.alpha = alpha;
      if (cargo && !cargo.destroyed) {
        if (age < arrive) {
          // 대롱대롱: 진행 반대쪽으로 살짝 흔들린다
          cargo.x = s.x - dir * cell * 0.05;
          cargo.y = s.y + cell * 0.22;
          cargo.rotation = (sb.payload === 'rocket-v' ? Math.PI / 2 : 0) + Math.sin(age * 0.012) * 0.25 - dir * tilt * 0.5;
        } else {
          cargo.destroy(); // 도착: 실린 아이템의 이펙트가 이어받는다
        }
      }

      const lift = Math.min(1, alt / (ALT * 1.6));
      shadow.x = gx;
      shadow.y = gy + cell * 0.3;
      shadow.width = cell * (0.75 - 0.3 * lift);
      shadow.height = cell * (0.22 - 0.08 * lift);
      shadow.alpha = (0.32 - 0.12 * lift) * alpha * Math.min(1, age / 60);
      return true;
    });
  });
}

/** "짹!"·"개굴!" 같은 소리 글자가 톡 튀어나왔다 사라진다 */
function bubble(engine: Engine, x: number, y: number, cell: number, text: string) {
  const { pixi, root } = engine;
  const txt = new pixi.Text({
    text,
    style: {
      fontFamily: 'Jua, sans-serif',
      fontSize: 64,
      fill: 0xffffff,
      stroke: { color: 0x5a3417, width: 12, join: 'round' },
    },
  });
  txt.anchor.set(0.5);
  // 판 가장자리 칸이면 글자가 이펙트 층 밖으로 잘린다 - 안쪽으로 밀어 넣는다
  const w = engine.app.screen.width;
  x = Math.max(cell * 0.45, Math.min(w - cell * 0.45, x));
  y = Math.max(cell * 0.55, y);
  txt.x = x;
  txt.y = y;
  txt.rotation = rand(-0.15, 0.15);
  root.addChild(txt);
  const base = (cell * 0.42) / 64;
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    const t = age / 520;
    const pop = t < 0.2 ? easeOut(t / 0.2) * 1.15 : 1.15 - 0.15 * Math.min(1, (t - 0.2) / 0.15);
    txt.scale.set(base * pop);
    txt.y = y - cell * 0.25 * t;
    txt.alpha = t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35);
    if (t >= 1) {
      txt.destroy();
      return false;
    }
    return true;
  });
}

// ───────────────────────── 제비 (나비) ─────────────────────────
//
// 두 마리가 출발 자리에서 파닥이며 양쪽으로 갈라져 → 높이 떠서 서로 반대로 휘는 길로
// 날다가(파닥파닥 - 활공 - 파닥파닥) → 목표 바로 위를 낮게 스치며 칼바람 자국을 남기고
// 칸이 사라지고 → 다시 솟구쳐 빠져나간다. 땅에는 그림자가 따라온다.

function spawnSwallows(engine: Engine, sb: ScheduledBlast, cell: number) {
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const from = centerOf(b.row, b.col, cell);
  const targets = flightTargets(b);
  const takeoff = FX_TIMING.swallowTakeoff;
  const ALT = cell * 0.9;

  at(engine, sb.start, () => {
    featherPuff(engine, from.x, from.y, cell, 4, [0x2f4a8a, 0xffffff]);
    dustPuff(engine, from.x, from.y + cell * 0.2, cell, 4, 0.9);
    const flash = new pixi.Sprite(tex.glow);
    flash.anchor.set(0.5);
    flash.blendMode = 'add';
    flash.tint = 0xdfe8ff;
    flash.x = from.x;
    flash.y = from.y;
    sizeTo(flash, cell * 1.4);
    particle(engine, flash, { vx: 0, vy: 0, life: 220, grow: 0.8, fadeFrom: 0.1 });

    targets.forEach((target, i) => {
      const to = centerOf(target.row, target.col, cell);
      const arrive = arrivalMs(b, target);
      const fly = arrive - takeoff;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      // 두 마리가 서로 반대쪽으로 휘어 간다(땅 위 경로)
      const side = i % 2 === 0 ? -1 : 1;
      const bend = cell * 1.0 + len * 0.25;
      const nx = (-dy / len) * side;
      const ny = (dx / len) * side;
      const ctrl = { x: (from.x + to.x) / 2 + nx * bend, y: (from.y + to.y) / 2 + ny * bend };
      const start = { x: from.x + nx * cell * 0.4, y: from.y + ny * cell * 0.4 };

      const shadow = new pixi.Sprite(tex.glow);
      shadow.anchor.set(0.5);
      shadow.tint = 0x1a1420;
      shadow.alpha = 0;
      root.addChild(shadow);

      const s = new pixi.Sprite(tex.swallow);
      s.anchor.set(0.5);
      sizeTo(s, cell * 1.3);
      const base = s.scale.y;
      s.x = from.x;
      s.y = from.y;
      s.alpha = 0;
      root.addChild(s);

      let age = 0;
      let gx = from.x;
      let gy = from.y;
      let pgx = gx;
      let pgy = gy;
      let vx = start.x - from.x;
      let vy = start.y - from.y;
      let hit = false;
      let sinceTrail = 0;
      let flapClock = 0;
      let up = false;
      const EXIT = 320;
      engine.updaters.push(dt => {
        age += dt;
        let alt: number;
        let alpha = 1;
        // 날갯짓 리듬: 뜰 때는 계속 파닥, 순항 중에는 파닥파닥 - 쭉 활공을 반복
        let flapping: boolean;
        if (age < takeoff) {
          // 둘이 함께 퍼덕이며 솟았다가 양쪽으로 갈라진다
          const u = age / takeoff;
          const t = easeOut(u);
          const split = easeInOut(Math.max(0, (u - 0.35) / 0.65));
          gx = from.x + (start.x - from.x) * split;
          gy = from.y + (start.y - from.y) * split;
          alt = ALT * 0.75 * t;
          alpha = Math.min(1, age / 40);
          flapping = true;
        } else if (age < arrive) {
          const t = Math.min(1, (age - takeoff) / fly);
          // 처음엔 활공하듯 느긋하게(잘 보이게), 목표 앞에서 확 내리꽂는다(시원하게)
          const e = 0.35 * t + 0.65 * t * t * t;
          gx = quad(start.x, ctrl.x, to.x, e);
          gy = quad(start.y, ctrl.y, to.y, e);
          // 높이 떴다가 목표에 다가가며 땅을 스칠 만큼 낮아진다
          alt = ALT * (0.7 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.3))) * (1 - t * t) + cell * 0.08;
          flapping = (age - takeoff) % 260 < 130 && t < 0.75;
        } else {
          if (!hit) {
            hit = true;
            swoosh(engine, to.x, to.y, vx, vy, cell);
            featherPuff(engine, to.x, to.y, cell, 3, [0x2f4a8a, 0xffffff, 0xd8452b]);
            debrisBurst(engine, to.x, to.y, cell, 4, ['leaf-green', 'crumb'], 0.7);
          }
          // 같은 방향으로 이어 날며 다시 솟구친다
          const t = (age - arrive) / EXIT;
          const sp = Math.max(1e-3, Math.hypot(vx, vy));
          const k = (cell * 0.011 * dt) / sp;
          gx += vx * k * (1 + t);
          gy += vy * k * (1 + t);
          alt = cell * 0.08 + cell * 1.6 * t * t;
          alpha = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
          flapping = true;
          if (t >= 1) {
            s.destroy();
            shadow.destroy();
            return false;
          }
        }
        if (Math.hypot(gx - pgx, gy - pgy) > 0.01) {
          vx = gx - pgx;
          vy = gy - pgy;
        }
        pgx = gx;
        pgy = gy;

        flapClock += dt;
        if (flapping && flapClock >= 50) {
          flapClock = 0;
          up = !up;
        } else if (!flapping) {
          up = false; // 활공: 날개를 펼친 그림 그대로
        }
        s.texture = up ? tex.swallowUp : tex.swallow;
        // 위로 친 그림은 몸이 조금 아래·왼쪽에 그려져 있어서 기준점을 맞춘다
        s.anchor.set(up ? 0.484 : 0.5, up ? 0.523 : 0.5);

        s.x = gx;
        s.y = gy - alt;
        s.alpha = alpha;
        face(s, base, vx, vy, 1, 1.0);
        s.scale.y = base;

        const lift = Math.min(1, alt / (ALT * 1.4));
        shadow.x = gx;
        shadow.y = gy + cell * 0.25;
        shadow.width = cell * (0.8 - 0.35 * lift);
        shadow.height = cell * (0.2 - 0.08 * lift);
        shadow.rotation = Math.atan2(vy, vx);
        shadow.alpha = (0.3 - 0.14 * lift) * alpha;

        // 바람 줄기: 지나간 자리에 가늘고 긴 흰 빛을 남긴다
        sinceTrail += dt;
        if (age > takeoff && sinceTrail > 18 && alpha > 0.2) {
          sinceTrail = 0;
          const sp = Math.max(1e-3, Math.hypot(vx, vy));
          const w = new pixi.Sprite(tex.glow);
          w.anchor.set(0.5);
          w.alpha = 0.55;
          w.x = s.x - (vx / sp) * cell * 0.4;
          w.y = s.y - (vy / sp) * cell * 0.4;
          w.rotation = Math.atan2(vy, vx);
          w.width = cell * 0.8;
          w.height = cell * 0.1;
          root.addChildAt(w, Math.max(0, root.getChildIndex(s)));
          particle(engine, w, { vx: 0, vy: 0, life: 220, fadeFrom: 0 });
        }
        return true;
      });
    });
  });
}

/** 제비가 스친 자리: 진행 방향으로 휘어진 칼바람 자국(초승달) */
function swoosh(engine: Engine, x: number, y: number, vx: number, vy: number, cell: number) {
  const { pixi, root } = engine;
  const g = new pixi.Graphics();
  g.x = x;
  g.y = y;
  g.rotation = Math.atan2(vy, vx);
  root.addChild(g);
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    const t = Math.min(1, age / 240);
    const r = cell * (0.55 + 0.25 * easeOut(t));
    // 초승달: 바깥 호와 안쪽 호 사이를 채운다
    g.clear();
    const sweep = 1.25 * easeOut(Math.min(1, t * 2.2));
    const a0 = -Math.PI / 2 - 0.2;
    const a1 = a0 + sweep * 2.4;
    g.arc(0, 0, r, a0, a1).arc(cell * 0.12, 0, r * 0.82, a1, a0, true).closePath();
    g.fill({ color: 0xffffff, alpha: 0.9 * (1 - t) });
    g.stroke({ width: Math.max(1.5, cell * 0.03), color: 0x2f4a8a, alpha: 0.5 * (1 - t) });
    if (t >= 1) {
      g.destroy();
      return false;
    }
    return true;
  });
  hitStar(engine, x, y, cell, 0.42, 0xe9f0ff);
}

// ───────────────────────── 개구리 (무당벌레) ─────────────────────────
//
// 앉은 채 목을 부풀리며 움츠렸다가 → 다리를 쭉 뻗은 점프 그림으로 바뀌어 높이 폴짝
// (오를 땐 머리를 들고, 내려올 땐 숙인다. 정점에서 커져 보이고 그림자는 작아진다) →
// 앉은 그림으로 철퍼덕 착지: 물웅덩이 물결 + 물방울 왕관 + 충격 고리 + 판 흔들림 +
// "개굴!" → 3×3이 가운데부터 사라지고 → 한 번 더 작게 뛰어 사라진다.

function spawnFrog(engine: Engine, sb: ScheduledBlast, cell: number, shakeEl: HTMLElement | null) {
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const target = flightTargets(b)[0];
  const from = centerOf(b.row, b.col, cell);
  const to = centerOf(target.row, target.col, cell);
  const crouch = FX_TIMING.frogCrouch;
  const land = arrivalMs(b, target);
  const hop = land - crouch;
  const dist = Math.hypot(to.x - from.x, to.y - from.y) / cell;
  const height = cell * Math.min(1.8, 0.9 + 0.12 * dist); // 너무 높으면 판 밖으로 나간다
  const dir = to.x < from.x - 1 ? -1 : to.x > from.x + 1 ? 1 : Math.random() < 0.5 ? -1 : 1;

  at(engine, sb.start, () => {
    const shadow = new pixi.Sprite(tex.glow);
    shadow.anchor.set(0.5);
    shadow.tint = 0x2a1a0c;
    shadow.alpha = 0.35;
    root.addChild(shadow);

    const s = new pixi.Sprite(tex.frog);
    s.anchor.set(0.5, 0.85); // 앉은 그림은 발 언저리를 기준으로 눌리고 펴진다
    sizeTo(s, cell * 1.15);
    const sitBase = s.scale.y;
    // 점프 그림은 몸이 길어서 같은 몸 크기로 보이게 조금 더 크게
    const leapBase = sitBase * 1.18;
    const footY = cell * 0.35;
    s.x = from.x;
    s.y = from.y + footY;
    root.addChild(s);

    let age = 0;
    let leaping = false;
    let landed = false;
    let launched = false;
    let trailClock = 0;
    const SQUASH = 190;
    const STAY = 140;
    const OUT = 300;
    const setPose = (leap: boolean) => {
      if (leap === leaping) return;
      leaping = leap;
      s.texture = leap ? tex.frogLeap : tex.frog;
      s.anchor.set(0.5, leap ? 0.5 : 0.85);
    };
    engine.updaters.push(dt => {
      age += dt;
      let gx = from.x;
      let gy = from.y;
      let sx = 1;
      let sy = 1;
      let up = 0;
      let rot = 0;
      if (age < crouch) {
        // 움츠리기: 납작해지며 부르르 떤다
        const t = easeOut(age / crouch);
        sx = 1 + 0.2 * t;
        sy = 1 - 0.3 * t;
        gx += Math.sin(age * 0.3) * cell * 0.02 * t;
      } else if (age < land) {
        if (!launched) {
          launched = true;
          dustPuff(engine, from.x, from.y + cell * 0.25, cell, 6, 1);
          debrisBurst(engine, from.x, from.y + cell * 0.2, cell, 4, ['crumb', 'leaf-green'], 0.6);
        }
        setPose(true);
        const t = (age - crouch) / hop;
        gx = from.x + (to.x - from.x) * t;
        gy = from.y + (to.y - from.y) * t;
        up = 4 * height * t * (1 - t);
        // 진행 방향으로 몸을 눕힌다: 오를 땐 머리를 들고 내려올 땐 숙인다.
        // 점프 그림 자체가 30도쯤 들려 있어서 그만큼 빼 준다
        const vyUp = 4 * height * (1 - 2 * t); // 위쪽 속도(높이/진행)
        const ang = Math.atan2(vyUp, Math.max(cell, Math.abs(to.x - from.x)) + cell * 0.5);
        rot = -(ang - 0.45) * 0.8;
        const near = 0.28 * Math.sin(Math.PI * t); // 정점에서 가까워진 듯 커진다
        sx = 1 + near;
        sy = 1 + near;
        // 뛰어가는 길이 보이게 지나간 자리에 옅은 꼬리를 남긴다
        trailClock += dt;
        if (trailClock > 28) {
          trailClock = 0;
          const w = new pixi.Sprite(tex.glow);
          w.anchor.set(0.5);
          w.tint = 0xe9ffd0;
          w.alpha = 0.45;
          w.x = s.x;
          w.y = s.y;
          sizeTo(w, cell * 0.55);
          root.addChildAt(w, Math.max(0, root.getChildIndex(shadow)));
          particle(engine, w, { vx: 0, vy: 0, life: 260, grow: -0.5, fadeFrom: 0 });
        }
      } else if (age < land + SQUASH + STAY) {
        setPose(false);
        gx = to.x;
        gy = to.y;
        if (!landed) {
          landed = true;
          frogImpact(engine, to.x, to.y, cell, shakeEl);
        }
        const t = Math.min(1, (age - land) / SQUASH);
        // 철퍼덕: 확 눌렸다가 탱글하게 돌아온다
        const wob = Math.exp(-5 * t) * Math.cos(t * 10);
        sx = 1 + 0.35 * wob;
        sy = 1 - 0.4 * wob;
      } else {
        // 작게 한 번 더 뛰어 사라진다
        setPose(true);
        const t = Math.min(1, (age - land - SQUASH - STAY) / OUT);
        gx = to.x + dir * cell * 0.9 * t;
        gy = to.y;
        up = 4 * cell * 0.7 * t * (1 - t) + t * cell * 0.4;
        sx = sy = 1 - 0.45 * t;
        rot = -(0.45 - 0.9 * t) * 0.5 + 0.36;
        s.alpha = 1 - t * t;
        if (t >= 1) {
          s.destroy();
          shadow.destroy();
          return false;
        }
      }
      const k = leaping ? leapBase : sitBase;
      s.scale.set(k * sx * dir, k * sy);
      s.rotation = dir * rot;
      s.x = gx;
      s.y = (leaping ? gy : gy + footY) - up;
      // 그림자: 땅에 붙어 있고, 높이 뜰수록 작고 흐려진다
      const lift = Math.min(1, up / height);
      shadow.x = gx;
      shadow.y = gy + cell * 0.38;
      shadow.width = cell * (0.95 - 0.45 * lift);
      shadow.height = cell * (0.3 - 0.13 * lift);
      shadow.alpha = 0.35 * (1 - 0.6 * lift) * s.alpha;
      return true;
    });
  });
}

function frogImpact(engine: Engine, x: number, y: number, cell: number, shakeEl: HTMLElement | null) {
  const { pixi, tex, root } = engine;
  // 3×3 테두리까지 퍼지는 충격 고리(흙색 바깥선 + 밝은 안쪽선)
  const ring = new pixi.Graphics();
  root.addChildAt(ring, 0);
  let age = 0;
  const reach = FX_TIMING.frogRing * 2 + 60;
  const dur = reach + 220;
  engine.updaters.push(dt => {
    age += dt;
    const t = Math.min(1, age / dur);
    const r = cell * (0.4 + 1.25 * easeOut(Math.min(1, age / reach)));
    const w = Math.max(2, cell * 0.14 * (1 - t));
    ring.clear();
    ring.ellipse(x, y + cell * 0.1, r, r * 0.8).stroke({ width: w + 4, color: 0x8a5a3b, alpha: 0.5 * (1 - t) });
    ring.ellipse(x, y + cell * 0.1, r, r * 0.8).stroke({ width: w, color: 0xfffbe8, alpha: 0.9 * (1 - t) });
    if (t >= 1) {
      ring.destroy();
      return false;
    }
    return true;
  });

  // 물웅덩이: 착지 자리에 맑은 물이 고였다가 물결 두 겹이 퍼진다
  const puddle = new pixi.Graphics();
  root.addChildAt(puddle, 0);
  let pAge = 0;
  engine.updaters.push(dt => {
    pAge += dt;
    const t = Math.min(1, pAge / 520);
    puddle.clear();
    const fade = 1 - t;
    puddle.ellipse(x, y + cell * 0.25, cell * 0.62, cell * 0.24).fill({ color: 0x8fd3f0, alpha: 0.55 * fade });
    [0, 0.25].forEach(lag => {
      const u = Math.max(0, Math.min(1, (t - lag) / 0.75));
      if (u <= 0) return;
      puddle
        .ellipse(x, y + cell * 0.25, cell * (0.5 + 0.9 * easeOut(u)), cell * (0.2 + 0.36 * easeOut(u)))
        .stroke({ width: Math.max(1.5, cell * 0.05 * (1 - u)), color: 0xe8f8ff, alpha: 0.9 * (1 - u) });
    });
    if (t >= 1) {
      puddle.destroy();
      return false;
    }
    return true;
  });

  // 물방울 왕관: 둥글게 위로 튀었다 떨어진다
  const n = 12;
  for (let i = 0; i < n; i++) {
    const d = new pixi.Sprite(tex.debris['drop-water']);
    d.anchor.set(0.5);
    sizeTo(d, cell * rand(0.18, 0.28));
    const a = (i / n) * Math.PI * 2 + rand(-0.15, 0.15);
    d.x = x + Math.cos(a) * cell * 0.35;
    d.y = y + cell * 0.2 + Math.sin(a) * cell * 0.14;
    particle(engine, d, {
      vx: Math.cos(a) * rand(0.002, 0.0045) * cell,
      vy: -rand(0.006, 0.01) * cell,
      gravity: 0.00005 * cell,
      life: rand(480, 640),
      fadeFrom: 0.6,
      stretch: 40 / cell,
    });
  }

  const flash = new pixi.Sprite(tex.glow);
  flash.anchor.set(0.5);
  flash.blendMode = 'add';
  flash.tint = 0xd8f7a0;
  flash.x = x;
  flash.y = y;
  sizeTo(flash, cell * 2);
  particle(engine, flash, { vx: 0, vy: 0, life: 260, grow: 1.2, fadeFrom: 0.1 });
  debrisBurst(engine, x, y, cell, 6, ['leaf-green', 'crumb'], 0.8);
  dustPuff(engine, x, y + cell * 0.2, cell, 5, 1.1);
  bubble(engine, x + cell * 0.55, y - cell * 0.85, cell, '개굴!');
  shake(shakeEl, Math.max(2, cell * 0.07), 240);
}

// ───────────────────────── 허수아비 ─────────────────────────
//
// 땅에서 불쑥 솟아 팔을 활짝 벌린다(탱글하게 흔들림) → 양팔과 위아래로 지푸라기 바람이
// 뻗어 십자 줄이 차례로 사라지고 → 판 곳곳의 까마귀가 깃털을 흩날리며 놀라 달아난다 →
// 허수아비는 잠깐 뽐내다 땅으로 쏙 들어간다.

function spawnScarecrow(engine: Engine, sb: ScheduledBlast, step: TurnStep, cell: number, cols: number, rows: number) {
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const { x, y } = centerOf(b.row, b.col, cell);
  const rise = FX_TIMING.scarecrowRise;

  at(engine, sb.start, () => {
    const s = new pixi.Sprite(tex.scarecrow);
    s.anchor.set(0.5, 0.92); // 장대 끝을 땅에 꽂은 기준
    sizeTo(s, cell * 1.6);
    const base = s.scale.y;
    const groundY = y + cell * 0.45;
    s.x = x;
    s.y = groundY;
    root.addChild(s);
    dustPuff(engine, x, groundY - cell * 0.1, cell, 6, 0.9);
    debrisBurst(engine, x, groundY - cell * 0.15, cell, 6, ['crumb', 'dirt'], 0.6);

    let age = 0;
    const HOLD = 420;
    const SINK = 200;
    engine.updaters.push(dt => {
      age += dt;
      if (age < rise) {
        // 솟기: 세로로 길게 튀어나왔다가
        const t = easeOut(age / rise);
        s.scale.set(base * (0.5 + 0.5 * t), base * (0.2 + 0.95 * t));
        s.rotation = 0;
      } else if (age < rise + HOLD) {
        // 팔 벌리기: 가로로 확 퍼지며 탱글하게 흔들린다
        const t = (age - rise) / 300;
        const wob = Math.exp(-4 * Math.min(1, t)) * Math.sin(t * 16);
        s.scale.set(base * (1 + 0.18 * wob), base * (1.15 - 0.15 * Math.min(1, t * 2) - 0.1 * wob));
        s.rotation = 0.06 * wob;
      } else {
        // 땅으로 쏙
        const t = Math.min(1, (age - rise - HOLD) / SINK);
        s.scale.set(base * (1 - 0.3 * t), base * (1 - 0.9 * t));
        s.alpha = 1 - t * t;
        if (t >= 1) {
          s.destroy();
          return false;
        }
      }
      return true;
    });
  });

  // 팔 끝과 위아래로 뻗는 지푸라기 바람 네 줄기
  at(engine, sb.start + rise, () => {
    const speed = cell / FX_TIMING.scarecrowCell;
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dx, dy]) => {
      const limit = (dx !== 0 ? cols : rows) * cell + cell;
      const gust = new pixi.Sprite(tex.glow);
      gust.anchor.set(0.5);
      gust.tint = 0xfff0b0;
      gust.alpha = 0.8;
      root.addChildAt(gust, 0);
      let travelled = 0;
      let sinceTrail = 0;
      engine.updaters.push(dt => {
        travelled += speed * dt;
        const len = Math.min(travelled, cell * 2.4);
        gust.width = dx !== 0 ? len : cell * 0.6;
        gust.height = dx !== 0 ? cell * 0.6 : len;
        gust.x = x + dx * (travelled - len / 2);
        gust.y = y + dy * (travelled - len / 2);
        sinceTrail += dt;
        if (sinceTrail > 20) {
          sinceTrail = 0;
          // 지푸라기: 노랗게 물들인 깃털 모양을 가늘게
          const st = new pixi.Sprite(tex.feather);
          st.anchor.set(0.5);
          st.tint = Math.random() < 0.5 ? 0xf2c94c : 0xe0a93a;
          sizeTo(st, cell * rand(0.24, 0.34));
          st.scale.x *= 0.45;
          st.x = x + dx * travelled + rand(-0.15, 0.15) * cell;
          st.y = y + dy * travelled + rand(-0.15, 0.15) * cell;
          st.rotation = rand(0, Math.PI * 2);
          particle(engine, st, {
            vx: dx * speed * 0.12 + rand(-1, 1) * 0.001 * cell,
            vy: dy * speed * 0.12 - rand(0.001, 0.003) * cell,
            gravity: 0.00003 * cell,
            spin: rand(-0.01, 0.01),
            life: rand(380, 560),
            fadeFrom: 0.4,
          });
        }
        if (travelled > limit) {
          gust.destroy();
          return false;
        }
        return true;
      });
    });
  });

  // 까마귀: 십자 밖에서 이번에 맞는 칸 = 허수아비에 놀란 까마귀
  // (다른 아이템에 맞은 장애물과 섞이지 않게, 시각표에서 이 허수아비가 놀래킨 시각에 맞는 칸만)
  const scareAt = sb.start + rise + FX_TIMING.scarecrowScare;
  const delays = scheduleClear(step).delays;
  const crows =
    step.kind === 'clear'
      ? step.damage
          .map(d => d.key)
          .filter(k => delays.get(k) === scareAt)
          .map(k => parseKey(k))
          .filter(p => p.row !== b.row && p.col !== b.col)
      : [];
  if (crows.length > 0) {
    at(engine, sb.start + rise + FX_TIMING.scarecrowScare, () => {
      crows.forEach(p => {
        const c = centerOf(p.row, p.col, cell);
        hitStar(engine, c.x, c.y - cell * 0.1, cell, 0.6, 0xfff6d0);
        featherPuff(engine, c.x, c.y, cell, 6, [0x2b2b33, 0x45454f, 0x1d1d22]);
      });
    });
  }
}
