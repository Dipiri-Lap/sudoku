import React, { useEffect, useRef } from 'react';
import type { Application, Container, Sprite, Texture } from 'pixi.js';
import type { ShockwaveFilter } from 'pixi-filters/shockwave';
import type { TurnStep } from '../../engine/resolve';
import { at as cellAt, parseKey } from '../../engine/board';
import { REGROW_CRACK_MS } from '../constants';
import {
  FX_TIMING,
  arrivalMs,
  blastHasFx,
  flightTargets,
  hitTimes,
  scheduleClear,
  type ScheduledBlast,
  lightGapFor,
  lightballPopMs,
  transformTargets,
} from './schedule';

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
  /** 버섯이 부수고 나온 칸과 거기 있던 채소 색 - 갈라지는 순간 즙·조각을 튀긴다 */
  regrowFrom?: { row: number; col: number; color: number }[];
}

type Pixi = typeof import('pixi.js');

interface Engine {
  pixi: Pixi;
  app: Application;
  root: Container;
  tex: {
    glow: Texture;
    shovel: Texture;
    /** 날아가는 아이템(도토리·제비·개구리). 판 위 아이템과 같은 그림의 큰 판 */
    acorn: Texture;
    swallow: Texture;
    /** 제비 날개를 위로 친 그림 */
    swallowUp: Texture;
    frog: Texture;
    /** 개구리 다리를 쭉 뻗은 점프 그림 */
    frogLeap: Texture;
    scarecrow: Texture;
    /** 흰 깃털(3D 렌더). 새 색으로 물들여 쓴다 */
    feather: Texture;
    /** 판 위 아이템 그림(합체 연출: 도토리가 싣고 가는 짐, 커지는 거름포대). 키는 파일 이름 */
    items: Record<string, Texture>;
    /** 흰색 3D 렌더 과즙 조각들(방울·알갱이). 채소 색으로 물들여(tint) 쓴다 */
    juice: { drop: Texture; blob: Texture };
    debris: Record<string, Texture>;
    /** 채소 그림(색 인덱스 순). 삽이 퍼 올려 던지는 채소 */
    gems: Texture[];
    /** 합체 아이템 그림: 삽을 멘 도토리, 거름포대를 안은 도토리, 도토리 꾸러미 */
    combo: { shovel: Texture; bag: Texture; bundle: Texture };
    /** 흰 연기 덩어리(3D 렌더). 흙먼지 색으로 물들여 쓴다 */
    puff: Texture;
    /** 통통한 금별(3D 렌더) - 맞는 순간·폭발 */
    star: Texture;
    /** 무지개 꼬리 리본(꼬리 쪽 가늘고 투명 → 머리 쪽 굵고 밝음) */
    trail: Texture;
    /** 네 갈래 반짝이(3D 렌더) */
    sparkle: Texture;
    /** 흰 짚 한 가닥(코드로 그림). 짚색·새끼줄색으로 물들여 쓴다 */
    straw: Texture;
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
/** 3D 렌더 입자(fx 폴더). 흰 것들은 물들여 쓴다 */
const PARTS = ['drop-white', 'bead', 'puff', 'feather', 'star', 'sparkle'] as const;
/** 공중에서 빙글 뒤집히는 납작한 조각 - 옆으로 눕는 순간 얇아져 입체로 보인다 */
const FLIPPY = new Set(['leaf-green', 'leaf-orange', 'petal', 'feather']);

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
 * 짚 한 가닥: 가늘고 긴 둥근 막대 + 진한 테두리 + 한쪽 밝은 결.
 * 흰색으로 그려서 tint로 짚색·새끼줄색을 입힌다(평면 하이퍼캐주얼 톤).
 */
function makeStrawTexture(pixi: Pixi): Texture {
  const w = 96;
  const h = 18;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const r = h / 2 - 2;
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8a8a8a';
  ctx.stroke();
  // 결: 가운데 살짝 위로 밝은 줄, 아래로 어두운 줄
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d4d4d4';
  ctx.beginPath();
  ctx.moveTo(10, h / 2 + 2);
  ctx.lineTo(w - 14, h / 2 + 2);
  ctx.stroke();
  return pixi.Texture.from(canvas);
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
  col = mix(col, vec3(1.0), spec * 0.85);
  // 가장자리 음영: 외곽선이 아니라 둥근 면이 돌아 들어가며 어두워지는 정도만(3D 그림체)
  float rim = 1.0 - smoothstep(0.46, 0.56, a);
  col = mix(col, col * 0.78, rim * 0.6);
  finalColor = vec4(col * body, body);
}`;
  return new pixi.Filter({
    glProgram: pixi.GlProgram.from({ vertex, fragment, name: 'jk-goo' }),
    resources: {},
  });
}

/**
 * 무지개 꼬리 리본 텍스처. 가로(u)가 리본 길이 방향 - 0이 꼬리, 1이 머리.
 * 리본(MeshRope) 두께는 한 가지라서 가늘어지는 모양을 그림에 그려 넣는다:
 * 꼬리는 가늘고 투명, 머리로 갈수록 굵고 밝아지며, 색은 무지개를 지나 머리에서 하얗게 빛난다.
 */
function makeTrailTexture(pixi: Pixi): Texture {
  const W = 256;
  const H = 32;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const hues = [
    [255, 92, 92],
    [255, 168, 60],
    [255, 226, 80],
    [110, 216, 110],
    [80, 170, 255],
    [170, 112, 255],
  ];
  for (let x = 0; x < W; x++) {
    const u = x / (W - 1); // 0 꼬리 ~ 1 머리
    const hp = (1 - u) * (hues.length - 1);
    const i0 = Math.floor(hp);
    const i1 = Math.min(hues.length - 1, i0 + 1);
    const f = hp - i0;
    const col = [0, 1, 2].map(ch => hues[i0][ch] * (1 - f) + hues[i1][ch] * f);
    const half = 0.18 + 0.82 * Math.pow(u, 0.6); // 꼬리 가늘게 → 머리 굵게
    const fade = Math.min(1, Math.pow(u, 0.9) * 1.15); // 꼬리 끝만 투명
    for (let y = 0; y < H; y++) {
      const d = Math.abs(y - (H - 1) / 2) / ((H - 1) / 2) / half; // 0 가운데 ~ 1 가장자리
      // 또렷한 가장자리(1px 안팎만 부드럽게) + 가운데 살짝 밝은 띠
      const edge = Math.max(0, Math.min(1, (1 - d) * (H * half * 0.5)));
      const shine = Math.max(0, 1 - d * 3) * 0.35;
      const k = (y * W + x) * 4;
      img.data[k] = Math.min(255, col[0] + 255 * shine);
      img.data[k + 1] = Math.min(255, col[1] + 255 * shine);
      img.data[k + 2] = Math.min(255, col[2] + 255 * shine);
      img.data[k + 3] = Math.round(255 * edge * fade);
    }
  }
  ctx.putImageData(img, 0, 0);
  return pixi.Texture.from(canvas);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const FxLayer: React.FC<Props> = ({ step, tick, cols, rows, shakeTarget, regrowFrom }) => {
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
      const partTex = await Promise.all(PARTS.map(n => pixi.Assets.load<Texture>(`/assets/3match/fx/${n}.png`)));
      const part = Object.fromEntries(PARTS.map((n, i) => [n, partTex[i]])) as Record<(typeof PARTS)[number], Texture>;
      const [shovel, acorn, swallow, swallowUp, frog, frogLeap, scarecrow, ...debrisTex] = await Promise.all([
        pixi.Assets.load<Texture>('/assets/3match/items/rocket.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/acorn.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/swallow.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/swallow-up.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/frog.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/frog-leap.png'),
        pixi.Assets.load<Texture>('/assets/3match/fx/scarecrow.png'),
        ...DEBRIS.map(n => pixi.Assets.load<Texture>(`/assets/3match/fx/${n}.png`)),
      ]);
      const itemTex = await Promise.all(ITEM_FILES.map(n => pixi.Assets.load<Texture>(`/assets/3match/items/${n}.png`)));
      const gemTex = await Promise.all([0, 1, 2, 3, 4, 5].map(i => pixi.Assets.load<Texture>(`/assets/3match/gems/gem-${i}.png`)));
      const [comboShovel, comboBag, comboBundle] = await Promise.all([
        pixi.Assets.load<Texture>('/assets/3match/items/acorn-shovel.png'),
        pixi.Assets.load<Texture>('/assets/3match/items/acorn-bag.png'),
        pixi.Assets.load<Texture>('/assets/3match/items/acorn-bundle.png'),
      ]);
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
          acorn,
          swallow,
          swallowUp,
          frog,
          frogLeap,
          scarecrow,
          feather: part.feather,
          items: Object.fromEntries(ITEM_FILES.map((n, i) => [n, itemTex[i]])),
          juice: { drop: part['drop-white'], blob: part.bead },
          debris: Object.fromEntries(DEBRIS.map((n, i) => [n, debrisTex[i]])),
          gems: gemTex,
          combo: { shovel: comboShovel, bag: comboBag, bundle: comboBundle },
          puff: part.puff,
          star: part.star,
          trail: makeTrailTexture(pixi),
          sparkle: part.sparkle,
          straw: makeStrawTexture(pixi),
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

  // 버섯이 채소를 부수고 나옴: 채소가 갈라지는 순간 그 채소의 즙과 조각이 튄다
  useEffect(() => {
    const engine = engineRef.current;
    const host = hostRef.current;
    if (!engine || !host || !regrowFrom || regrowFrom.length === 0) return;
    const cell = host.clientWidth / cols;
    regrowFrom.forEach(({ row, col, color }) => {
      const recipe = JUICE[color];
      if (!recipe) return;
      const c = centerOf(row, col, cell);
      at(engine, REGROW_CRACK_MS, () => juiceBurst(engine, c.x, c.y - cell * 0.1, cell, recipe, false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // 터짐 단계가 새로 시작될 때마다 그 단계의 이펙트를 시각표대로 건다.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !step || step.kind !== 'clear') return;
    const host = hostRef.current;
    if (!host) return;
    const cell = host.clientWidth / cols;
    const schedule = scheduleClear(step);
    // 삽이 지나가는 줄의 채소는 퍼 올려 던진다 - 그 칸은 즙을 튀기지 않는다
    const scooped = new Map<string, { color: number; dir: -1 | 1; horizontal: boolean }>();
    schedule.blasts.forEach(sb => {
      const { kind, row, col } = sb.blast;
      if (kind !== 'rocket-h' && kind !== 'rocket-v') return;
      const horizontal = kind === 'rocket-h';
      step.cells.forEach(k => {
        const p = parseKey(k);
        if (horizontal ? p.row !== row : p.col !== col) return;
        const gem = cellAt(step.board, p.row, p.col).gem;
        if (!gem || gem.special || gem.inert || gem.color === null) return;
        const along = horizontal ? p.col - col : p.row - row;
        if (along === 0) return;
        scooped.set(k, { color: gem.color, dir: along < 0 ? -1 : 1, horizontal });
      });
    });
    spawnJuice(engine, step, schedule.delays, cell, scooped);
    // 짚단: 맞는 순간 짚 가닥이 흩날린다(깨지면 크게, 겹만 깎이면 조금)
    const hits = hitTimes(step);
    step.damage.forEach(d => {
      if (d.kind !== 'box' || d.target !== 'blocker') return;
      const p = parseKey(d.key);
      const c = centerOf(p.row, p.col, cell);
      at(engine, hits.get(d.key) ?? 0, () => strawBurst(engine, c.x, c.y, cell, d.destroyed));
    });
    // 합체: 놓은 칸에서 "뿅" - 두 아이템이 감기며 사라진 자리에 빛 고리와 반짝이
    if (step.merged) {
      const c = centerOf(step.merged[1].row, step.merged[1].col, cell);
      mergePop(engine, c.x, c.y, cell);
    }
    scooped.forEach((sc, k) => {
      const p = parseKey(k);
      at(engine, schedule.delays.get(k) ?? 0, () => scoopVeggie(engine, p.row, p.col, sc.color, sc.dir, sc.horizontal, cell));
    });
    schedule.blasts.forEach(sb => {
      if (!blastHasFx(sb.blast)) return;
      switch (sb.blast.kind) {
        case 'tnt':
          spawnFertilizer(engine, sb, cell, shakeTarget.current);
          break;
        case 'propeller':
          spawnAcorn(engine, sb, cell);
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
        case 'lightball':
          if (sb.blast.wipe) spawnRainbowWipe(engine, sb, cell, cols, rows, shakeTarget.current);
          else spawnRainbow(engine, sb, step, cell);
          break;
        default:
          spawnShovel(engine, sb, cell, cols, rows, shakeTarget.current);
      }
    });
    // 도토리가 실어 온 아이템인데 전용 이펙트가 없으면(낫·쟁기 등) 도착 순간 펑 하고 터진 걸 보여 준다
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
    /** 공중에서 뒤집히는 빠르기(rad/ms). 납작한 조각이 옆으로 누울 때 얇아져 입체로 보인다 */
    tumble?: number;
  },
) {
  (opts.parent ?? engine.root).addChild(sprite);
  const base = sprite.scale.x;
  const baseAlpha = sprite.alpha;
  let age = 0;
  let { vx, vy } = opts;
  let flip = rand(0, Math.PI * 2);
  engine.updaters.push(dt => {
    age += dt;
    flip += (opts.tumble ?? 0) * dt;
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
    if (opts.tumble) {
      // 뒤집히는 동안 가로가 얇아졌다 넓어진다(완전히 0이 되면 사라져 보여 바닥을 둔다)
      const k = 0.2 + 0.8 * Math.abs(Math.cos(flip));
      sprite.scale.x = Math.abs(sprite.scale.y) * k * (Math.cos(flip) < 0 ? -1 : 1);
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
    const s = new pixi.Sprite(tex.puff);
    s.anchor.set(0.5);
    s.tint = 0xeedcc2;
    s.alpha = 0.75;
    s.rotation = rand(-0.4, 0.4);
    sizeTo(s, cell * rand(0.42, 0.66));
    s.x = x + rand(-1, 1) * cell * 0.2;
    s.y = y + rand(-1, 1) * cell * 0.2;
    const a = rand(0, Math.PI * 2);
    const v = rand(0.0006, 0.0018) * cell * spread;
    particle(engine, s, {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 0.0004 * cell, // 먼지는 살짝 떠오른다
      life: rand(320, 440),
      grow: 0.7,
      fadeFrom: 0.35,
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
      tumble: FLIPPY.has(kinds[i % kinds.length]) ? rand(0.008, 0.016) : 0,
    });
  }
}

const STRAW_TINTS = [0xf7c948, 0xf2b630, 0xffd966, 0xe9a92a];
const TWINE_TINT = 0xb5763a;

/**
 * 짚단이 맞는 순간: 짚 가닥이 사방으로 튀었다가 팔랑이며 떨어지고, 마른 먼지가 피어오른다.
 * broken이면 짚단이 통째로 흩어지는 크기, 아니면 겹만 깎인 작은 털림.
 */
function strawBurst(engine: Engine, x: number, y: number, cell: number, broken: boolean) {
  const { pixi, tex } = engine;
  hitStar(engine, x, y, cell, broken ? 0.85 : 0.55, 0xfff1b8);
  dustPuff(engine, x, y, cell, broken ? 6 : 3, broken ? 0.9 : 0.5);
  const count = broken ? 18 : 6;
  for (let i = 0; i < count; i++) {
    const s = new pixi.Sprite(tex.straw);
    s.anchor.set(0.5);
    // 새끼줄 조각을 조금 섞는다(그림의 끈 색)
    s.tint = broken && i % 7 === 0 ? TWINE_TINT : STRAW_TINTS[i % STRAW_TINTS.length];
    const len = cell * rand(0.28, broken ? 0.62 : 0.42);
    s.scale.set(len / tex.straw.width);
    s.x = x + rand(-0.25, 0.25) * cell;
    s.y = y + rand(-0.25, 0.25) * cell;
    s.rotation = rand(0, Math.PI * 2);
    // 위쪽으로 더 많이 튄다(짚이 부풀어 터지는 느낌)
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05) + (i % 3 === 0 ? rand(-0.9, 0.9) : 0);
    const v = rand(0.003, broken ? 0.009 : 0.005) * cell;
    let flutter = rand(0, Math.PI * 2);
    const drift = rand(0.004, 0.008);
    particle(engine, s, {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 0.002 * cell,
      gravity: 0.000022 * cell,
      spin: rand(-0.02, 0.02),
      life: rand(700, broken ? 1100 : 800),
      fadeFrom: 0.55,
    });
    // 가벼운 짚은 떨어지면서 좌우로 살랑인다
    engine.updaters.push(dt => {
      if (s.destroyed) return false;
      flutter += drift * dt;
      s.x += Math.sin(flutter) * 0.0006 * cell * dt;
      return true;
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
    let phase = 0;
    let sparkClock = 0;
    const dur = FX_TIMING.tntCharge + FX_TIMING.tntHitstop;
    // 심지 끝(그림의 가로 58%·세로 11%)
    const fx = x + cell * 0.08;
    const fy = y - cell * 0.39;
    engine.updaters.push(dt => {
      age += dt;
      const t = Math.min(1, age / dur);
      // 빛은 갈수록 밝고 붉어지며, 맥박이 점점 빨라진다
      phase += dt * (0.008 + 0.05 * t * t);
      g.alpha = 0.85 * t;
      g.tint = t < 0.6 ? 0xffc46b : 0xff7a3a;
      sizeTo(g, cell * (1.2 + 0.7 * t + Math.sin(phase) * (0.06 + 0.12 * t)));
      // 심지에서 튀는 불티: 처음엔 드문드문, 막판엔 쉴 새 없이
      sparkClock += dt;
      const every = 120 - 95 * t;
      if (age < FX_TIMING.tntCharge && sparkClock >= every) {
        sparkClock = 0;
        const n = t > 0.6 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const sp = new pixi.Sprite(tex.sparkle);
          sp.anchor.set(0.5);
          sizeTo(sp, cell * rand(0.14, 0.24) * (1 + 0.5 * t));
          sp.x = fx;
          sp.y = fy;
          sp.rotation = rand(0, Math.PI);
          const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
          const v = rand(0.0015, 0.004) * cell * (1 + t);
          particle(engine, sp, {
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            gravity: 0.000012 * cell,
            spin: rand(-0.01, 0.01),
            life: rand(220, 340),
            fadeFrom: 0.3,
          });
        }
      }
      if (age >= dur) {
        g.destroy();
        return false;
      }
      return true;
    });
  });

  at(engine, boom, () => {
    // 펑! 통통한 3D 금별이 확 부풀었다 사라지고 반짝이가 사방으로 튄다
    const star = new pixi.Sprite(tex.star);
    star.anchor.set(0.5);
    star.x = x;
    star.y = y;
    star.rotation = rand(-0.4, 0.4);
    sizeTo(star, cell * 0.6);
    root.addChild(star);
    let sAge = 0;
    engine.updaters.push(dt => {
      sAge += dt;
      const t = sAge / 320;
      // 확 커졌다가 살짝 줄며 사라진다
      const sc = K * (t < 0.35 ? 0.6 + 1.9 * easeOut(t / 0.35) : 2.5 - 0.6 * (t - 0.35));
      sizeTo(star, cell * sc);
      star.rotation += 0.002 * dt;
      star.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5);
      if (t >= 1) {
        star.destroy();
        return false;
      }
      return true;
    });
    sparkleBurst(engine, x, y, cell, Math.round(8 * K), 1.6 * K);

    // 별 뒤를 받치는 빛 (어두운 칸·장애물 위에서는 이게 살린다)
    const flash = new pixi.Sprite(tex.glow);
    flash.anchor.set(0.5);
    flash.blendMode = 'add';
    flash.tint = 0xffe08a;
    flash.x = x;
    flash.y = y;
    sizeTo(flash, cell * 2.4 * K);
    particle(engine, flash, { vx: 0, vy: 0, life: 320, grow: 1.8, fadeFrom: 0.1 });

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
// 제자리에서 흙을 튀기며 출발 → 삽 두 자루가 양 끝으로 땅을 파며 달려간다:
//  1) 흙 파도 - 날 앞에서 흙덩이가 양옆 위로 쏟아지고, 지나간 줄에 고랑 자국이 남았다 사라진다
//  2) 채소 퍼 올리기 - 지나가는 칸의 채소를 퍼서 뒤쪽 위로 던진다(scoopVeggie)
//  3) 끝에 꽂히기 - 판 끝에서 날을 땅에 탕 꽂고 부르르 떨다 사라진다
// 칸 시각은 schedule.ts의 rocketCell과 같다(삽 속도 = 칸이 사라지는 속도).

function spawnShovel(
  engine: Engine,
  sb: ScheduledBlast,
  cell: number,
  cols: number,
  rows: number,
  shakeEl: HTMLElement | null,
) {
  const { pixi, tex, root } = engine;
  const { row, col, kind } = sb.blast;
  const horizontal = kind === 'rocket-h';
  const { x, y } = centerOf(row, col, cell);
  // 큰 삽(굵은 흙 파도): 두꺼운 십자(삽+거름포대)일 때만
  const big = !!sb.blast.combo && !sb.carried && (sb.blast.band ?? 1) > 1;

  // 십자 합체: 가로·세로 한 쌍 중 가로 쪽만 그린다(두 번 그리지 않게)
  //  - 삽+삽: 두 삽이 X자로 날아와 "쨍" 부딪히고 흙이 솟구친 뒤 네 방향으로 튀어나간다
  //  - 삽+거름포대: 포대가 부풀며 달아오르다 펑 터지고, 그 폭발 속에서 큰 삽 네 자루가 나간다
  if (sb.clash && horizontal) {
    if (big) at(engine, sb.start - FX_TIMING.crossBoom, () => bagBoomForShovels(engine, x, y, cell, shakeEl));
    else at(engine, sb.start - FX_TIMING.crossClash, () => shovelClash(engine, x, y, cell, shakeEl));
  }

  at(engine, sb.start, () => {
    dustPuff(engine, x, y, cell, 5, 0.6);
    debrisBurst(engine, x, y, cell, 6, ['crumb', 'dirt'], 0.6);
  });

  at(engine, sb.start + FX_TIMING.rocketLaunch, () => {
    const speed = cell / FX_TIMING.rocketCell; // px/ms - 칸이 사라지는 속도와 같다
    ([-1, 1] as const).forEach(dir => {
      // 판 끝(마지막 칸 가운데를 조금 지난 곳)까지 간 거리
      const lastIdx = dir > 0 ? (horizontal ? cols : rows) - 1 : 0;
      const reach = Math.abs(lastIdx - (horizontal ? col : row)) * cell + cell * 0.2;

      // 고랑 자국: 지나간 길을 따라 늘어나는 흙빛 띠. 다 가고 나면 서서히 사라진다
      const furrow = new pixi.Graphics();
      root.addChildAt(furrow, 0);

      const s = new pixi.Sprite(tex.shovel);
      s.anchor.set(0.5);
      sizeTo(s, cell * (big ? 1.5 : 1.1));
      const base = Math.abs(s.scale.y);
      const baseRot = horizontal ? 0 : (dir * Math.PI) / 2;
      if (horizontal) s.scale.x = base * dir; // 그림은 오른쪽을 본다
      s.rotation = baseRot;
      s.x = x;
      s.y = y;
      root.addChild(s);

      let travelled = 0;
      let sinceTrail = 0;
      let stuck = -1; // 꽂힌 뒤 흐른 시간(ms). -1이면 아직 달리는 중
      let furrowFade = 1;
      const thick = cell * (big ? 1.1 : 0.5);
      engine.updaters.push(dt => {
        if (stuck < 0) {
          const step = Math.min(speed * dt, reach - travelled);
          travelled += step;
          if (horizontal) s.x += step * dir;
          else s.y += step * dir;
          // 땅을 긁으며 덜컹덜컹
          const bump = Math.sin(travelled * 0.25) * 0.08;
          s.rotation = baseRot + bump * dir;

          // 1) 흙 파도: 날 앞에서 흙덩이가 양옆 위로 쏟아진다
          sinceTrail += dt;
          if (sinceTrail > 16) {
            sinceTrail = 0;
            for (let i = 0; i < 2; i++) {
              const d = new pixi.Sprite(tex.debris[Math.random() < 0.6 ? 'dirt' : 'crumb']);
              d.anchor.set(0.5);
              sizeTo(d, cell * rand(0.18, 0.32) * (big ? 1.3 : 1));
              const side = i === 0 ? -1 : 1;
              d.x = s.x + (horizontal ? dir * cell * 0.3 : side * cell * 0.2);
              d.y = s.y + (horizontal ? side * cell * 0.15 : dir * cell * 0.3);
              particle(engine, d, {
                // 옆으로 튀어 나가며 위로 솟았다 떨어진다
                vx: horizontal ? dir * speed * rand(0.05, 0.15) : side * rand(0.003, 0.006) * cell,
                vy: horizontal ? side * rand(0.002, 0.005) * cell - 0.004 * cell : dir * speed * rand(0.05, 0.15) - 0.003 * cell,
                gravity: 0.00005 * cell,
                spin: rand(-0.02, 0.02),
                life: rand(380, 560),
                fadeFrom: 0.5,
              });
            }
            if (Math.random() < 0.35) dustPuff(engine, s.x, s.y, cell, 1, 0.5);
          }

          if (travelled >= reach - 0.01) {
            stuck = 0;
            // 3) 탕! 땅에 꽂힌다
            dustPuff(engine, s.x, s.y + cell * 0.1, cell, 6, 1);
            debrisBurst(engine, s.x, s.y, cell, 8, ['dirt', 'crumb', 'dirt'], 0.8);
            hitStar(engine, s.x, s.y, cell, 0.45);
            if (dir > 0) shake(shakeEl, Math.max(2, cell * 0.05) * (big ? 1.5 : 1), 180);
          }
        } else if (!s.destroyed) {
          stuck += dt;
          // 앞으로 콕: 네 방향 모두 날아가던 방향 그대로 판 끝에 박히며 같은 각도(20도)만 숙인다
          const STICK = 70;
          const k = Math.min(1, stuck / STICK);
          const tilt = 0.35 * (horizontal ? dir : 1);
          // 박히는 만큼 앞으로 살짝 밀려 들어간다
          const push = cell * 0.12 * easeOut(k);
          if (stuck - dt <= STICK) {
            const prev = cell * 0.12 * easeOut(Math.min(1, (stuck - dt) / STICK));
            if (horizontal) s.x += (push - prev) * dir;
            else s.y += (push - prev) * dir;
          }
          // 부르르: 꽂힌 뒤 점점 잦아드는 떨림
          const wob = stuck > STICK ? Math.sin((stuck - STICK) * 0.09) * 0.22 * Math.exp(-(stuck - STICK) / 140) : 0;
          s.rotation = baseRot + tilt * easeOut(k) + wob;
          // 박히는 순간 살짝 눌렸다 펴진다
          const squash = stuck < STICK ? 1 - 0.15 * Math.sin((k * Math.PI) / 2) : 1;
          s.scale.y = base * squash;
          if (stuck > 420) s.alpha = Math.max(0, 1 - (stuck - 420) / 160);
          if (stuck > 580) s.destroy();
        } else {
          stuck += dt;
        }

        // 고랑: 달린 길이만큼 띠가 늘어나고, 꽂힌 뒤 서서히 사라진다
        if (stuck > 200) furrowFade = Math.max(0, furrowFade - dt / 400);
        furrow.clear();
        if (travelled > 2 && furrowFade > 0) {
          const len = travelled;
          const rx = horizontal ? (dir > 0 ? x : x - len) : x - thick / 2;
          const ry = horizontal ? y - thick / 2 : dir > 0 ? y : y - len;
          furrow
            .roundRect(rx, ry, horizontal ? len : thick, horizontal ? thick : len, thick / 2)
            .fill({ color: 0x3b2210, alpha: 0.45 * furrowFade });
        }
        if (stuck > 580 && furrowFade <= 0) {
          if (!s.destroyed) s.destroy();
          furrow.destroy();
          return false;
        }
        return true;
      });
    });
  });
}

/** 삽+거름포대 합체: 포대가 부풀며 붉게 달아오르다 펑! - 큰 삽 네 자루가 그 폭발에서 나간다 */
function bagBoomForShovels(engine: Engine, x: number, y: number, cell: number, shakeEl: HTMLElement | null) {
  const { pixi, tex, root } = engine;
  const CHARGE = FX_TIMING.crossBoom - 60; // 부풀기, 마지막 60ms는 멈칫
  const sack = new pixi.Sprite(tex.items.tnt);
  sack.anchor.set(0.5, 0.6);
  sack.x = x;
  sack.y = y + cell * 0.1;
  sizeTo(sack, cell * 0.3);
  root.addChild(sack);
  const glow = new pixi.Sprite(tex.glow);
  glow.anchor.set(0.5);
  glow.blendMode = 'add';
  glow.x = x;
  glow.y = y;
  glow.alpha = 0;
  root.addChildAt(glow, Math.max(0, root.getChildIndex(sack)));
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    if (age < FX_TIMING.crossBoom) {
      const u = Math.min(1, age / CHARGE);
      // 뿅 나타나 점점 부풀며 부르르 - 막판엔 붉게
      const pop = age < 80 ? easeOut(age / 80) : 1;
      sizeTo(sack, cell * (1.0 + 0.5 * u) * pop);
      sack.rotation = age < CHARGE ? Math.sin(age * (0.08 + 0.2 * u)) * 0.14 * u : 0;
      sack.tint = u > 0.6 ? 0xffb090 : 0xffffff;
      glow.tint = u > 0.6 ? 0xff7a3a : 0xffc46b;
      glow.alpha = 0.85 * u;
      sizeTo(glow, cell * (1.4 + 0.8 * u));
      return true;
    }
    sack.destroy();
    glow.destroy();
    // 펑!
    const star = new pixi.Sprite(tex.star);
    star.anchor.set(0.5);
    star.x = x;
    star.y = y;
    sizeTo(star, cell * 0.6);
    root.addChild(star);
    let sAge = 0;
    engine.updaters.push(d2 => {
      sAge += d2;
      const t = sAge / 300;
      sizeTo(star, cell * (t < 0.35 ? 0.6 + 1.8 * easeOut(t / 0.35) : 2.4 - 0.6 * (t - 0.35)));
      star.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5);
      if (t >= 1) {
        star.destroy();
        return false;
      }
      return true;
    });
    sparkleBurst(engine, x, y, cell, 8, 1.4);
    debrisBurst(engine, x, y, cell, 18, ['dirt', 'crumb', 'dirt', 'leaf-green'], 1.2);
    dustPuff(engine, x, y, cell, 8, 1.3);
    shake(shakeEl, Math.max(3, cell * 0.08), 260);
    return false;
  });
}

/** 삽 십자 합체: 두 삽이 양쪽 위에서 X자로 날아와 "쨍" 부딪힌다 → 흙이 솟구친다 */
function shovelClash(engine: Engine, x: number, y: number, cell: number, shakeEl: HTMLElement | null) {
  const { pixi, tex, root } = engine;
  const IN = 130; // 날아와 부딪히기까지
  const HOLD = 130; // 부딪힌 채 부르르
  ([-1, 1] as const).forEach(side => {
    const s = new pixi.Sprite(tex.shovel);
    s.anchor.set(0.5);
    sizeTo(s, cell * 1.3);
    const base = Math.abs(s.scale.y);
    // 왼쪽 삽은 오른쪽 아래로, 오른쪽 삽은 왼쪽 아래로 - 날이 가운데서 X자로 엇갈린다
    s.scale.x = base * -side;
    const finalRot = side * -0.75;
    const sx = x + side * cell * 1.1;
    const sy = y - cell * 0.9;
    s.x = sx;
    s.y = sy;
    s.rotation = finalRot + side * 0.6;
    root.addChild(s);
    let age = 0;
    engine.updaters.push(dt => {
      age += dt;
      if (age < IN) {
        const e = easeOut(age / IN);
        s.x = sx + (x + side * cell * 0.08 - sx) * e;
        s.y = sy + (y - sy) * e;
        s.rotation = finalRot + side * 0.6 * (1 - e);
      } else if (age < IN + HOLD) {
        // 부딪힌 반동으로 부르르
        const u = (age - IN) / HOLD;
        s.x = x + side * cell * 0.08 + side * Math.sin(u * Math.PI * 6) * cell * 0.04 * (1 - u);
        s.y = y;
        s.rotation = finalRot + Math.sin(u * Math.PI * 6) * 0.08 * (1 - u);
      } else {
        // 네 방향 삽에게 넘기고 사라진다
        const u = Math.min(1, (age - IN - HOLD) / 80);
        s.alpha = 1 - u;
        s.scale.set(base * -side * (1 + 0.3 * u), base * (1 + 0.3 * u));
        if (u >= 1) {
          s.destroy();
          return false;
        }
      }
      return true;
    });
  });
  // 쨍! 부딪히는 순간
  at(engine, IN, () => {
    const flash = new pixi.Sprite(tex.glow);
    flash.anchor.set(0.5);
    flash.blendMode = 'add';
    flash.tint = 0xf4fbff;
    flash.x = x;
    flash.y = y;
    sizeTo(flash, cell * 1.8);
    particle(engine, flash, { vx: 0, vy: 0, life: 220, grow: 1, fadeFrom: 0.1 });
    hitStar(engine, x, y, cell, 0.9, 0xf2f7ff);
    sparkleBurst(engine, x, y, cell, 8, 1.3);
    bubble(engine, x, y - cell * 0.9, cell, '쨍!');
    shake(shakeEl, Math.max(2, cell * 0.06), 160);
    // 흙이 솟구친다
    for (let i = 0; i < 14; i++) {
      const d = new pixi.Sprite(tex.debris[i % 3 === 0 ? 'crumb' : 'dirt']);
      d.anchor.set(0.5);
      sizeTo(d, cell * rand(0.2, 0.34));
      d.x = x + rand(-0.2, 0.2) * cell;
      d.y = y;
      const a = -Math.PI / 2 + rand(-0.7, 0.7);
      const v = rand(0.006, 0.011) * cell;
      particle(engine, d, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        gravity: 0.00005 * cell,
        spin: rand(-0.02, 0.02),
        life: rand(520, 720),
        fadeFrom: 0.6,
      });
    }
    dustPuff(engine, x, y, cell, 6, 1.1);
  });
}

/** 2) 삽이 퍼 올린 채소: 뒤쪽 위로 빙글 돌며 포물선으로 날아가 작아지며 사라진다 */
function scoopVeggie(
  engine: Engine,
  row: number,
  col: number,
  color: number,
  dir: -1 | 1,
  horizontal: boolean,
  cell: number,
) {
  const { pixi, tex, root } = engine;
  const t = tex.gems[color];
  if (!t) return;
  const { x, y } = centerOf(row, col, cell);
  const s = new pixi.Sprite(t);
  s.anchor.set(0.5);
  sizeTo(s, cell * 0.92);
  const base = s.scale.x;
  s.x = x;
  s.y = y;
  root.addChild(s);
  // 흙 한 줌이 같이 튄다
  debrisBurst(engine, x, y, cell, 3, ['crumb', 'dirt'], 0.5);
  // 던지는 방향: 삽이 온 쪽(뒤)으로, 위로 크게
  const back = -dir;
  const side = Math.random() < 0.5 ? -1 : 1;
  let vx = horizontal ? back * rand(0.002, 0.004) * cell : side * rand(0.0015, 0.003) * cell;
  let vy = horizontal ? -rand(0.009, 0.012) * cell : back * rand(0.002, 0.004) * cell - 0.009 * cell;
  const spin = rand(0.008, 0.014) * (Math.random() < 0.5 ? -1 : 1);
  const g = 0.000032 * cell;
  const life = rand(560, 700);
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    vy += g * dt;
    s.x += vx * dt;
    s.y += vy * dt;
    vx *= Math.pow(0.999, dt);
    s.rotation += spin * dt;
    const k = age / life;
    // 위로 떴다가 멀어지듯 작아진다
    const sc = k < 0.25 ? 1 + 0.25 * (k / 0.25) : 1.25 - 0.85 * ((k - 0.25) / 0.75);
    s.scale.set(base * sc);
    s.alpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    if (age >= life) {
      s.destroy();
      return false;
    }
    return true;
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

function spawnJuice(
  engine: Engine,
  step: TurnStep,
  delays: Map<string, number>,
  cell: number,
  skip: Map<string, unknown> = new Map(),
) {
  if (step.kind !== 'clear') return;
  // 한꺼번에 많이 터지면(합체·큰 연쇄) 칸당 조각 수를 줄여 폰에서도 버티게 한다
  const many = step.cells.length > 20;
  step.cells.forEach(k => {
    // 삽이 퍼 올려 던지는 채소는 터지지 않고 통째로 날아간다
    if (skip.has(k)) return;
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
  // 3D 방울은 크고 적게 - 자잘하게 많으면 색종이처럼 보인다
  const drops = many ? 3 : 6;
  for (let i = 0; i < drops; i++) {
    const s = new pixi.Sprite(tex.juice.drop);
    s.anchor.set(0.5, 0.65);
    s.tint = recipe.juice;
    sizeTo(s, cell * (i % 3 === 0 ? rand(0.28, 0.34) : rand(0.19, 0.25)));
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
    for (let i = 0; i < 4; i++) {
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
        tumble: FLIPPY.has(bit.tex) ? rand(0.008, 0.016) : 0,
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
      // 팔랑: 좌우로 흔들릴 때 옆으로 누워 얇아진다
      const k = 0.35 + 0.65 * Math.abs(Math.cos(age * sway * 1.3 + phase));
      f.scale.x = Math.abs(f.scale.y) * k;
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

/** 콕! 맞은 자리에 통통한 3D 금별이 튀어나왔다 사라지고 반짝이가 흩어진다 */
function hitStar(engine: Engine, x: number, y: number, cell: number, size: number, color = 0xffffff) {
  const { pixi, tex, root } = engine;
  const star = new pixi.Sprite(tex.star);
  star.anchor.set(0.5);
  star.tint = color;
  const full = cell * size * 1.25;
  sizeTo(star, full * 0.3);
  star.x = x;
  star.y = y;
  star.rotation = rand(-0.5, 0.5);
  root.addChild(star);
  const spin = rand(-0.004, 0.004);
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    const t = age / 260;
    // 퐁: 확 커졌다가(살짝 넘쳤다 돌아오며) 줄며 사라진다
    const k = t < 0.35 ? 0.3 + 0.85 * easeOut(t / 0.35) : 1.15 - 0.15 * ((t - 0.35) / 0.65) - 0.3 * Math.max(0, t - 0.7);
    sizeTo(star, full * k);
    star.rotation += spin * dt;
    star.alpha = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
    if (t >= 1) {
      star.destroy();
      return false;
    }
    return true;
  });
  sparkleBurst(engine, x, y, cell, Math.round(3 + size * 3), size);
}

/** 반짝이 몇 개가 튀어 나가며 반짝(커졌다 작아졌다) 사라진다 */
function sparkleBurst(engine: Engine, x: number, y: number, cell: number, count: number, power = 1) {
  const { pixi, tex, root } = engine;
  for (let i = 0; i < count; i++) {
    const sp = new pixi.Sprite(tex.sparkle);
    sp.anchor.set(0.5);
    const full = cell * rand(0.22, 0.36) * Math.max(0.7, power);
    sizeTo(sp, full * 0.2);
    sp.x = x;
    sp.y = y;
    root.addChild(sp);
    const a = (i / count) * Math.PI * 2 + rand(-0.4, 0.4);
    const v = rand(0.0025, 0.0045) * cell * Math.max(0.8, power);
    let age = 0;
    const life = rand(320, 460);
    engine.updaters.push(dt => {
      age += dt;
      const t = age / life;
      sp.x += Math.cos(a) * v * dt * (1 - t);
      sp.y += Math.sin(a) * v * dt * (1 - t);
      // 반짝: 한 번 크게, 한 번 작게
      sizeTo(sp, full * (0.2 + 0.8 * Math.sin(Math.min(1, t) * Math.PI)));
      sp.rotation = t * 1.2;
      if (t >= 1) {
        sp.destroy();
        return false;
      }
      return true;
    });
  }
}

/** 그림은 오른쪽을 본다. 왼쪽으로 갈 땐 뒤집고, 진행 각도만큼 기울인다 */
function face(sprite: Sprite, base: number, vx: number, vy: number, tilt: number, maxTilt: number) {
  const left = vx < -0.0001;
  sprite.scale.x = left ? -Math.abs(base) : Math.abs(base);
  const ang = Math.atan2(vy, Math.abs(vx) + 1e-6);
  const r = Math.max(-maxTilt, Math.min(maxTilt, ang * tilt));
  sprite.rotation = left ? -r : r;
}

// ───────────────────────── 무지개꽃 (라이트볼) ─────────────────────────
//
// 꽃이 빙글 돌며 떠올라 활짝 핀다 → 꽃 가운데서 무지개빛 줄기가 같은 색 채소마다 "슝슝슝"
// 차례로 뻗는다(닿은 채소는 반짝 빛난다) → 다 뻗으면 잠깐 숨을 고르고 한꺼번에 팡!
// 채소가 사라지는 시각은 schedule.ts의 lightballPopMs(대상 수)로 같다.

const RAINBOW = [0xff5a5a, 0xffa53a, 0xffe14a, 0x6ad66a, 0x4aa8ff, 0xa66bff];

/**
 * 무지개꽃+무지개꽃: 큰 꽃이 빙글 돌며 빛을 모으다 팡! - 무지개 고리가 가운데서 바깥으로
 * 퍼지고(닿는 칸부터 터진다, schedule.ts의 wipeCharge·wipeRing과 같은 속도) 꽃잎 폭풍이 흩날린다.
 */
function spawnRainbowWipe(
  engine: Engine,
  sb: ScheduledBlast,
  cell: number,
  cols: number,
  rows: number,
  shakeEl: HTMLElement | null,
) {
  const { pixi, tex, root } = engine;
  const { x, y } = centerOf(sb.blast.row, sb.blast.col, cell);
  const CHARGE = FX_TIMING.wipeCharge;
  // 판 끝까지 닿는 거리(칸)
  const far = Math.max(
    ...[
      [0, 0],
      [0, cols - 1],
      [rows - 1, 0],
      [rows - 1, cols - 1],
    ].map(([r, c]) => Math.hypot(r - sb.blast.row, c - sb.blast.col)),
  );
  const RING_MS = far * FX_TIMING.wipeRing;

  at(engine, sb.start, () => {
    // 큰 꽃: 빙글 돌며 커지고 빛을 모은다
    const glow = new pixi.Sprite(tex.glow);
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = 0xfff0c0;
    glow.x = x;
    glow.y = y;
    root.addChild(glow);
    const flower = new pixi.Sprite(tex.items.lightball);
    flower.anchor.set(0.5);
    flower.x = x;
    flower.y = y;
    root.addChild(flower);
    let age = 0;
    let sparkClock = 0;
    engine.updaters.push(dt => {
      age += dt;
      const u = Math.min(1, age / CHARGE);
      sizeTo(flower, cell * (1 + 1.6 * easeOut(u)) * (1 + 0.04 * Math.sin(age * 0.05)));
      flower.rotation += dt * (0.006 + 0.03 * u * u);
      sizeTo(glow, cell * (2 + 2.5 * u));
      glow.alpha = 0.9 * u;
      // 빛이 모여드는 반짝이
      sparkClock += dt;
      if (sparkClock > 40 && age < CHARGE) {
        sparkClock = 0;
        const a = rand(0, Math.PI * 2);
        const d = cell * rand(1.6, 2.6);
        const sp = new pixi.Sprite(tex.sparkle);
        sp.anchor.set(0.5);
        sp.tint = RAINBOW[Math.floor(rand(0, RAINBOW.length))];
        sizeTo(sp, cell * rand(0.18, 0.3));
        sp.x = x + Math.cos(a) * d;
        sp.y = y + Math.sin(a) * d;
        particle(engine, sp, { vx: -Math.cos(a) * d / 260, vy: -Math.sin(a) * d / 260, life: 260, fadeFrom: 0.6 });
      }
      if (age >= CHARGE) {
        flower.destroy();
        glow.destroy();
        return false;
      }
      return true;
    });
  });

  at(engine, sb.start + CHARGE, () => {
    // 팡!
    const star = new pixi.Sprite(tex.star);
    star.anchor.set(0.5);
    star.x = x;
    star.y = y;
    root.addChild(star);
    let sAge = 0;
    engine.updaters.push(dt => {
      sAge += dt;
      const t = sAge / 380;
      sizeTo(star, cell * (t < 0.3 ? 1 + 3 * easeOut(t / 0.3) : 4 - 1.2 * (t - 0.3)));
      star.rotation += dt * 0.003;
      star.alpha = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.55);
      if (t >= 1) {
        star.destroy();
        return false;
      }
      return true;
    });
    shake(shakeEl, Math.max(4, cell * 0.12), 420);
    sparkleBurst(engine, x, y, cell, 14, 2);

    // 무지개 고리: 여섯 색이 겹친 띠가 판 끝까지 퍼진다(칸이 터지는 속도와 같다)
    const ring = new pixi.Graphics();
    ring.blendMode = 'add';
    root.addChild(ring);
    let rAge = 0;
    engine.updaters.push(dt => {
      rAge += dt;
      const t = Math.min(1, rAge / (RING_MS + 200));
      const radius = (rAge / FX_TIMING.wipeRing) * cell;
      ring.clear();
      const fade = Math.max(0, 1 - Math.max(0, rAge - RING_MS) / 200);
      RAINBOW.forEach((col, k) => {
        ring.circle(x, y, Math.max(1, radius - k * cell * 0.11)).stroke({
          width: cell * 0.12,
          color: col,
          alpha: 0.55 * fade,
        });
      });
      if (t >= 1) {
        ring.destroy();
        return false;
      }
      return true;
    });

    // 꽃잎 폭풍: 무지개색 꽃잎이 사방으로 흩날린다
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + rand(-0.1, 0.1);
      const pe = new pixi.Sprite(tex.debris.petal);
      pe.anchor.set(0.5);
      const hue = RAINBOW[i % RAINBOW.length];
      const r0 = (hue >> 16) & 255;
      const g0 = (hue >> 8) & 255;
      const b0 = hue & 255;
      pe.tint = (Math.round(r0 + (255 - r0) * 0.45) << 16) | (Math.round(g0 + (255 - g0) * 0.45) << 8) | Math.round(b0 + (255 - b0) * 0.45);
      sizeTo(pe, cell * rand(0.28, 0.42));
      pe.x = x;
      pe.y = y;
      pe.rotation = a;
      const v = (cell / FX_TIMING.wipeRing) * rand(0.7, 1.05);
      particle(engine, pe, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        gravity: 0.000012 * cell,
        spin: rand(-0.01, 0.01),
        life: rand(RING_MS * 0.8, RING_MS + 300),
        fadeFrom: 0.55,
        tumble: rand(0.006, 0.012),
      });
    }

    // 공기 일렁임
    const wave = new engine.ShockwaveFilter({
      center: { x, y },
      amplitude: cell * 0.3,
      wavelength: cell * 1.6,
      speed: cell / (FX_TIMING.wipeRing / 1000),
      radius: cell * (far + 1),
      brightness: 1.15,
    });
    root.filterArea = engine.app.screen;
    engine.waves.push(wave);
    root.filters = [...engine.waves];
    let wAge = 0;
    engine.updaters.push(dt => {
      wAge += dt;
      wave.time = wAge / 1000;
      if (wAge > RING_MS + 200) {
        engine.waves = engine.waves.filter(w => w !== wave);
        root.filters = engine.waves.length > 0 ? [...engine.waves] : [];
        wave.destroy();
        return false;
      }
      return true;
    });
  });
}

/**
 * 빛 한 줄기: (x0,y0)에서 목표(x1,y1)로 포물선을 그리며 FLY ms 동안 날아간다.
 *
 * 꼬리는 매 프레임 지나온 자리를 이어 붙이지 않고 **비행 곡선 자체**에서 고른 간격으로 뽑는다 -
 * 프레임 기록으로 잇으면 출발 직후 점이 한곳에 몰려 리본이 뭉개지고 울퉁불퉁했다.
 * 리본은 한 줄(테두리 또렷한 무지개), 머리는 작고 밝은 반짝이. 닿으면 채소가 그 색 빛에 감싸이고
 * 꼬리는 목표 쪽으로 빨려 들어간다. popIn ms 뒤(=한꺼번에 팡) 빛이 사라진다.
 */
/**
 * 꽃잎이 닿은 자리: 작은 꽃잎 여섯 장이 꽃 모양으로 동그랗게 퍼지며 팔랑 뒤집히다 사라지고,
 * 가운데서 그 색 빛이 번쩍한다.
 */
function petalBloom(engine: Engine, x: number, y: number, cell: number, hue: number) {
  const { pixi, tex, root } = engine;
  const flash = new pixi.Sprite(tex.glow);
  flash.anchor.set(0.5);
  flash.blendMode = 'add';
  flash.tint = hue;
  flash.x = x;
  flash.y = y;
  sizeTo(flash, cell * 0.9);
  particle(engine, flash, { vx: 0, vy: 0, life: 220, grow: 0.8, fadeFrom: 0.2 });
  // 그 색을 흰빛과 섞어 꽃잎을 물들인다(분홍 그림이 탁해지지 않게)
  const r = (hue >> 16) & 255;
  const g = (hue >> 8) & 255;
  const b = hue & 255;
  const w = 0.55;
  const soft = (Math.round(r + (255 - r) * w) << 16) | (Math.round(g + (255 - g) * w) << 8) | Math.round(b + (255 - b) * w);
  const COUNT = 6;
  const turn = rand(0, Math.PI * 2);
  for (let i = 0; i < COUNT; i++) {
    const a = turn + (i / COUNT) * Math.PI * 2;
    const pe = new pixi.Sprite(tex.debris.petal);
    pe.anchor.set(0.5, 0.85); // 꽃잎 끝이 가운데를 향하게(꽃 모양으로 핀다)
    pe.tint = soft;
    sizeTo(pe, cell * 0.32);
    pe.x = x;
    pe.y = y;
    pe.rotation = a + Math.PI / 2;
    const v = cell * 0.0028;
    particle(engine, pe, {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      gravity: 0.000006 * cell,
      spin: (i % 2 === 0 ? 1 : -1) * 0.004,
      life: rand(380, 480),
      fadeFrom: 0.45,
      tumble: rand(0.008, 0.013),
    });
  }
}

function petalFlight(
  engine: Engine,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hue: number,
  FLY: number,
  popIn: number,
  cell: number,
  i: number,
  morph = false,
) {
  const { pixi, tex, root } = engine;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  // 포물선 조절점: 가운데에서 위로, 번갈아 좌우로 살짝 휘게
  const side = i % 2 === 0 ? 1 : -1;
  const cx = (x0 + x1) / 2 + side * Math.min(cell * 1.1, dist * 0.22);
  const cy = Math.min(y0, y1) - (cell * 0.8 + dist * 0.4);
  const pos = (t: number) => {
    const u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  };
  // 비행 진행(0~1): 출발은 톡 빠르게, 끝은 목표로 쏙
  const ease = (t0: number) => (t0 < 0.5 ? 0.5 * Math.pow(t0 * 2, 0.85) : 1 - 0.5 * Math.pow((1 - t0) * 2, 1.5));
  const TAIL = 0.65; // 꼬리 길이(곡선 진행 비율)
  const N = 28;
  const pts = Array.from({ length: N }, () => new pixi.Point(x0, y0));
  const rope = new pixi.MeshRope({ texture: tex.trail, points: pts, width: cell * 0.2 });
  root.addChild(rope);

  // 머리: 작고 밝은 반짝이 + 그 색 빛
  const headGlow = new pixi.Sprite(tex.glow);
  headGlow.anchor.set(0.5);
  headGlow.blendMode = 'add';
  headGlow.tint = hue;
  sizeTo(headGlow, cell * 0.7);
  const head = new pixi.Sprite(tex.sparkle);
  head.anchor.set(0.5);
  sizeTo(head, cell * 0.42);
  root.addChild(headGlow);
  root.addChild(head);

  let age = 0;
  let landed = false;
  engine.updaters.push(dt => {
    age += dt;
    const tHead = Math.min(1, ease(Math.min(1, age / FLY)));
    // 닿은 뒤에는 꼬리 끝이 머리(목표)로 빨려 들어간다
    const after = Math.max(0, age - FLY);
    const tTail = Math.min(tHead, Math.max(0, tHead - TAIL) + (after > 0 ? Math.min(TAIL, after / 220) : 0));
    for (let j = 0; j < N; j++) {
      const p = pos(tTail + ((tHead - tTail) * j) / (N - 1));
      pts[j].set(p.x, p.y);
    }
    // 꼬리가 거의 없을 때(출발 직후·다 빨려 든 뒤)는 점이 겹쳐 리본이 깨지므로 숨긴다
    rope.visible = tHead - tTail > 0.015;
    const h = pos(tHead);
    head.x = headGlow.x = h.x;
    head.y = headGlow.y = h.y;
    head.rotation += dt * 0.012;

    if (age >= FLY && !landed) {
      landed = true;
      // 채소가 그 색 빛에 감싸인다(한꺼번에 팡 할 때까지)
      const halo = new pixi.Sprite(tex.glow);
      halo.anchor.set(0.5);
      halo.blendMode = 'add';
      halo.tint = hue;
      halo.x = x1;
      halo.y = y1;
      root.addChild(halo);
      let hAge = 0;
      const hold = Math.max(0, popIn - FLY);
      engine.updaters.push(d2 => {
        hAge += d2;
        const k = Math.min(1, hAge / 100);
        sizeTo(halo, cell * (1.6 - 0.4 * k + 0.06 * Math.sin(hAge * 0.04)));
        halo.alpha = hAge < hold ? 0.9 - 0.25 * k : Math.max(0, 0.65 * (1 - (hAge - hold) / 160));
        if (hAge > hold + 160) {
          halo.destroy();
          return false;
        }
        return true;
      });
      if (morph) {
        // 변신: 채소가 아이템으로 뿅 - 빛이 번쩍하고 반짝이가 튄다
        sparkleBurst(engine, x1, y1, cell, 5, 0.9);
        hitStar(engine, x1, y1, cell, 0.4, 0xffffff);
      } else {
        petalBloom(engine, x1, y1, cell, hue);
      }
    }
    if (landed) {
      // 머리는 채소 속으로 쏙, 꼬리는 빨려 들며 옅어진다
      const k = Math.min(1, after / 220);
      head.alpha = headGlow.alpha = 1 - Math.min(1, after / 90);
      rope.alpha = 1 - k;
      if (k >= 1) {
        rope.destroy();
        head.destroy();
        headGlow.destroy();
        return false;
      }
    }
    return true;
  });
}

function spawnRainbow(engine: Engine, sb: ScheduledBlast, step: TurnStep, cell: number) {
  if (step.kind !== 'clear') return;
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const from = centerOf(b.row, b.col, cell);
  const color = b.targetColor;
  // 변신 합체(무지개꽃+도토리 등): 바뀌는 칸으로 뿌리고, 닿으면 꽃잎 대신 아이템이 뿅
  const morph = !!b.combo && !!b.into;
  // 빛줄기를 뻗을 채소: 이번에 사라지는 칸 중 지목된 색(가까운 것부터)
  const targets = morph
    ? transformTargets(step, b).map(k => {
        const p = parseKey(k);
        return { p, c: centerOf(p.row, p.col, cell) };
      })
    : step.cells
        .map(k => parseKey(k))
        .filter(p => !(p.row === b.row && p.col === b.col))
        .filter(p => {
          const g = cellAt(step.board, p.row, p.col).gem;
          return !!g && !g.special && !g.inert && g.color === color;
        })
        .map(p => ({ p, c: centerOf(p.row, p.col, cell) }))
        .sort((u, v) => Math.hypot(u.c.x - from.x, u.c.y - from.y) - Math.hypot(v.c.x - from.x, v.c.y - from.y));
  const RISE = FX_TIMING.lightRise;
  // 하나씩 천천히: 간격·시각은 시간표(schedule.ts)와 같은 공식
  const gap = lightGapFor(targets.length);
  const POP = lightballPopMs(targets.length);
  const LIFT = cell * 0.35;

  at(engine, sb.start, () => {
    // 꽃: 빙글 돌며 떠올라 활짝(넘쳤다 돌아오며) - 터질 때까지 천천히 돈다
    const glow = new pixi.Sprite(tex.glow);
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = 0xfff2c0;
    glow.alpha = 0;
    root.addChild(glow);
    const flower = new pixi.Sprite(tex.items.lightball);
    flower.anchor.set(0.5);
    flower.x = from.x;
    flower.y = from.y;
    sizeTo(flower, cell);
    root.addChild(flower);
    let age = 0;
    engine.updaters.push(dt => {
      age += dt;
      const u = Math.min(1, age / RISE);
      const open = u < 1 ? easeOut(u) : 1;
      const k = 1 + 0.35 * open + (age < RISE ? 0 : 0.05 * Math.sin((age - RISE) * 0.02));
      sizeTo(flower, cell * k);
      flower.y = from.y - LIFT * open;
      flower.rotation += dt * (0.02 - 0.012 * open);
      glow.x = flower.x;
      glow.y = flower.y;
      glow.alpha = 0.8 * open;
      sizeTo(glow, cell * (1.6 + 0.3 * Math.sin(age * 0.015)));
      if (age >= POP) {
        // 팡! 꽃도 함께 터진다
        sparkleBurst(engine, flower.x, flower.y, cell, 8, 1.3);
        hitStar(engine, flower.x, flower.y, cell, 0.8);
        flower.destroy();
        glow.destroy();
        return false;
      }
      return true;
    });

    // 꽃잎: 꽃 가운데서 하나씩 튀어나와 무지개 꼬리를 끌며 포물선으로 목표 채소에 날아간다
    const FLY = FX_TIMING.lightFly;
    targets.forEach((t, i) => {
      const hue = RAINBOW[i % RAINBOW.length];
      at(engine, RISE + i * gap, () =>
        petalFlight(engine, from.x, from.y - LIFT, t.c.x, t.c.y, hue, FLY, POP - RISE - i * gap, cell, i, morph),
      );
    });
  });
}

/** 합체 "뿅": 두 아이템이 감기며 사라진 자리에 빛이 번쩍이고 고리가 퍼지며 반짝이가 튄다 */
function mergePop(engine: Engine, x: number, y: number, cell: number) {
  const { pixi, tex, root } = engine;
  const flash = new pixi.Sprite(tex.glow);
  flash.anchor.set(0.5);
  flash.blendMode = 'add';
  flash.tint = 0xfff1b0;
  flash.x = x;
  flash.y = y;
  sizeTo(flash, cell * 1.4);
  particle(engine, flash, { vx: 0, vy: 0, life: 260, grow: 1.2, fadeFrom: 0.15 });
  const ring = new pixi.Graphics();
  root.addChild(ring);
  let age = 0;
  engine.updaters.push(dt => {
    age += dt;
    const t = Math.min(1, age / 300);
    ring.clear();
    ring
      .circle(x, y, cell * (0.35 + 0.95 * easeOut(t)))
      .stroke({ width: Math.max(1.5, cell * 0.1 * (1 - t)), color: 0xfff6d0, alpha: 0.95 * (1 - t) });
    if (t >= 1) {
      ring.destroy();
      return false;
    }
    return true;
  });
  sparkleBurst(engine, x, y, cell, 6, 1);
}

// ───────────────────────── 도토리 (프로펠러) ─────────────────────────
//
// 웅크렸다가 톡 튀어 오른다(이때 주변 십자가 튕겨 나간다) → 빙글빙글 돌며 포물선으로
// 날아간다(그림자가 땅을 따라온다) → 목표에 "딱!" 맞고 납작해진다 → 옆으로 통통 튀며
// 굴러가 사라진다. 그림 한 장을 옮기고·돌리고·늘이기만 한다(날갯짓 같은 장 바꾸기 없음).

function spawnAcorn(engine: Engine, sb: ScheduledBlast, cell: number) {
  const { pixi, tex, root } = engine;
  const b = sb.blast;
  const target = flightTargets(b)[0];
  const from = centerOf(b.row, b.col, cell);
  const to = centerOf(target.row, target.col, cell);
  const launch = FX_TIMING.acornLaunch;
  // 도토리 떼(도토리+도토리 합체) = 도토리 꾸러미: 꾸러미가 부르르 떨다 툭 터지며 세 마리가
  // 부채꼴로 동시에 튀어 나가 각자 목표로 휘어 날아간다. 도착은 순번만큼 시차(같은 돌이면 딱·딱·딱).
  // 순번(0·1·2) = 왼쪽·가운데·오른쪽. 시간표의 출발 시차(swarmGap)만큼 일찍 만들어 같이 터져 나오게 한다.
  const popcorn = !!b.combo && !sb.payload && !sb.carried;
  const order = popcorn ? Math.round(sb.start / FX_TIMING.swarmGap) : 0;
  const flockIdx = order % 3;
  const lead = order * FX_TIMING.swarmGap;
  const arrive = arrivalMs(b, target) + lead;
  const fly = Math.max(80, arrive - launch);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // 포물선 꼭대기: 멀수록 높게 - 짧게 날면 낮게 톡, 멀리 날면 크게 휙
  const PEAK = Math.max(cell * 0.9, Math.min(cell * 2.6, dist * 0.42));
  const LIFT = cell * 0.35; // 튀어 오른 높이(여기서 비행이 시작된다)
  const SQUASH = 130; // 맞고 납작해지는 시간
  const BOUNCE = 460; // 통통 튀며 떠나는 시간
  const dir = to.x < from.x - 1 ? -1 : to.x > from.x + 1 ? 1 : Math.random() < 0.5 ? -1 : 1;
  // 한 바퀴 반~세 바퀴: 멀리 갈수록 많이 돈다
  const SPIN = dir * Math.PI * 2 * Math.min(3, 1.5 + dist / (cell * 4));
  const POP_X = (flockIdx - 1) * cell * 0.8;
  const POP_H = cell * (0.9 + 0.2 * (flockIdx % 2));
  const SPREAD = Math.min(160, fly * 0.35); // 툭 터져 부채꼴로 퍼지는 시간

  // 꾸러미: 한 번만(첫 순번) 그린다 - 뿅 나타나 부르르 떨다가 툭 터진다
  if (popcorn && order === 0) {
    at(engine, sb.start, () => {
      const bundle = new pixi.Sprite(tex.combo.bundle);
      bundle.anchor.set(0.5, 0.6);
      const full = cell * 1.3;
      sizeTo(bundle, full * 0.2);
      bundle.x = from.x;
      bundle.y = from.y + cell * 0.1;
      root.addChild(bundle);
      let age = 0;
      engine.updaters.push(dt => {
        age += dt;
        if (age < launch) {
          // 뿅 나타났다가(넘쳤다 돌아오며) 점점 세게 부르르
          const k = age < 90 ? easeOut(age / 90) * 1.12 : 1.12 - 0.12 * Math.min(1, (age - 90) / 60);
          const u = age / launch;
          sizeTo(bundle, full * k * (1 + 0.06 * u));
          bundle.rotation = Math.sin(age * (0.06 + 0.12 * u)) * 0.12 * u;
          bundle.x = from.x + Math.sin(age * 0.5) * cell * 0.03 * u;
          return true;
        }
        // 툭! 터진다
        bundle.destroy();
        debrisBurst(engine, from.x, from.y, cell, 6, ['leaf-green', 'leaf-green', 'leaf-orange'], 0.8);
        sparkleBurst(engine, from.x, from.y, cell, 6, 1.1);
        dustPuff(engine, from.x, from.y + cell * 0.2, cell, 4, 0.8);
        return false;
      });
    });
  }

  at(engine, sb.start - lead, () => {
    const shadow = new pixi.Sprite(tex.glow);
    shadow.anchor.set(0.5);
    shadow.tint = 0x2a1a0c;
    shadow.alpha = 0;
    root.addChild(shadow);

    // 합체: 삽·거름포대는 전용 합체 그림(삽을 멘·포대를 안은 도토리) 하나로 난다.
    // 그 밖의 아이템은 도토리 뒤에 붙여 함께 날린다(도착하면 그 자리에서 터진다)
    const comboTex =
      sb.payload === 'rocket-h' || sb.payload === 'rocket-v'
        ? tex.combo.shovel
        : sb.payload === 'tnt'
          ? tex.combo.bag
          : null;
    const cargo = sb.payload && !comboTex ? new pixi.Sprite(tex.items[itemFile(sb.payload)]) : null;
    if (cargo) {
      cargo.anchor.set(0.5);
      sizeTo(cargo, cell * 0.85);
      root.addChild(cargo);
    }
    const s = new pixi.Sprite(comboTex ?? tex.acorn);
    s.anchor.set(0.5);
    sizeTo(s, cell * (comboTex ? 1.2 : 1.05));
    const base = s.scale.y;
    s.x = from.x;
    s.y = from.y;
    root.addChild(s);

    // 튀어 오르는 순간 퍼지는 고리(주변 십자가 이 충격에 튕겨 나간다)
    const ring = new pixi.Graphics();
    root.addChildAt(ring, 0);
    let rAge = 0;
    const ringAt = launch * 0.35;
    engine.updaters.push(dt => {
      rAge += dt;
      if (rAge < ringAt) return true;
      const t = Math.min(1, (rAge - ringAt) / 260);
      ring.clear();
      ring
        .circle(from.x, from.y, cell * (0.4 + 1.2 * easeOut(t)))
        .stroke({ width: Math.max(1.5, cell * 0.08 * (1 - t)), color: 0xfff3c8, alpha: 0.9 * (1 - t) });
      if (t >= 1) {
        ring.destroy();
        return false;
      }
      return true;
    });

    let age = 0;
    let hit = false;
    let popped = false;
    let trailClock = 0;
    let lastX = from.x;
    let lastY = from.y;
    engine.updaters.push(dt => {
      age += dt;
      let gx = from.x; // 땅 위 위치(그림자 자리)
      let gy = from.y;
      let alt = 0;
      let rot = 0;
      let sx = 1; // 가로 늘이기(납작·길쭉)
      let sy = 1;
      let alpha = 1;

      if (popcorn && age < launch) {
        // 아직 꾸러미 속 - 안 보인다
        alpha = 0;
      } else if (popcorn && age < arrive) {
        const t2 = age - launch;
        if (t2 < SPREAD) {
          // 툭 튀어 나가 부채꼴로 퍼진다
          const e = easeOut(t2 / SPREAD);
          gx = from.x + POP_X * e;
          alt = cell * 0.2 + (POP_H - cell * 0.2) * e;
          rot = Math.sign(POP_X || 1) * 0.5 * e;
          sx = sy = 0.85 + 0.25 * e;
        } else {
          // 각자 목표로 휘어 날아간다
          const u = (t2 - SPREAD) / Math.max(1, fly - SPREAD);
          const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          gx = from.x + POP_X + (to.x - from.x - POP_X) * e;
          gy = from.y + (to.y - from.y) * e;
          alt = POP_H * (1 - e) + 4 * cell * 0.7 * e * (1 - e);
          rot = Math.sign(POP_X || 1) * 0.5 + SPIN * easeOut(u);
          sx = sy = 1.1 - 0.1 * e;
        }
      } else if (age < launch) {
        // 웅크렸다가(납작) 톡 튀어 오르며 길쭉해진다
        const u = age / launch;
        if (u < 0.35) {
          const k = Math.sin((u / 0.35) * Math.PI * 0.5);
          sx = 1 + 0.22 * k;
          sy = 1 - 0.22 * k;
        } else {
          const t = easeOut((u - 0.35) / 0.65);
          alt = LIFT * t;
          sx = 1 - 0.12 * (1 - t);
          sy = 1 + 0.16 * (1 - t);
          rot = -dir * 0.25 * t; // 날아갈 쪽 반대로 살짝 젖힌다(던지기 전 예비 동작)
          if (!popped) {
            popped = true;
            dustPuff(engine, from.x, from.y + cell * 0.25, cell, 6, 0.9);
            debrisBurst(engine, from.x, from.y + cell * 0.15, cell, 4, ['crumb', 'leaf-orange'], 0.55);
          }
        }
      } else if (age < arrive) {
        // 비행: 빙글빙글 돌며 포물선. 출발은 또렷하게, 가운데서 빨라지고, 끝은 꽂히듯
        const t = (age - launch) / fly;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        gx = from.x + (to.x - from.x) * e;
        gy = from.y + (to.y - from.y) * e;
        // 시작 높이 LIFT에서 꼭대기 PEAK를 지나 목표 위(0)로 떨어진다
        alt = LIFT * (1 - e) + 4 * PEAK * e * (1 - e);
        rot = -dir * 0.25 + SPIN * easeOut(t);
        sx = sy = 1 + 0.12 * Math.sin(Math.PI * e); // 높이 뜰수록 살짝 커져 가까워 보인다
      } else if (age < arrive + SQUASH) {
        // 딱! 목표에 맞고 납작해졌다가 돌아온다
        gx = to.x;
        gy = to.y;
        const u = (age - arrive) / SQUASH;
        const k = Math.sin(Math.PI * u);
        sx = 1 + 0.32 * k;
        sy = 1 - 0.3 * k;
        rot = dir * 0.15 * (1 - u);
        if (!hit) {
          hit = true;
          hitStar(engine, to.x, to.y - cell * 0.05, cell, 0.75);
          debrisBurst(engine, to.x, to.y + cell * 0.1, cell, 7, ['crumb', 'leaf-orange', 'dirt'], 0.7);
          dustPuff(engine, to.x, to.y + cell * 0.3, cell, 5, 0.8);
          bubble(engine, to.x - dir * cell * 0.4, to.y - cell * 0.75, cell, '딱!');
        }
      } else {
        // 통통: 진행 방향으로 두 번 튀며 굴러가 사라진다
        const t = Math.min(1, (age - arrive - SQUASH) / BOUNCE);
        gx = to.x + dir * cell * 1.3 * t;
        gy = to.y;
        alt =
          t < 0.6
            ? Math.sin((t / 0.6) * Math.PI) * cell * 0.55
            : Math.sin(((t - 0.6) / 0.4) * Math.PI) * cell * 0.22;
        rot = dir * Math.PI * 2.2 * t;
        alpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
        if (t >= 1) {
          s.destroy();
          shadow.destroy();
          if (cargo && !cargo.destroyed) cargo.destroy();
          return false;
        }
      }

      s.x = gx;
      s.y = gy - alt;
      s.scale.set(base * sx, base * sy);
      s.rotation = rot;
      s.alpha = alpha;

      // 빠르게 나는 구간에는 꼬리 줄기를 남겨 속도감을 준다
      trailClock += dt;
      const vx = s.x - lastX;
      const vy = s.y - lastY;
      if (trailClock > 24 && age > launch && age < arrive) {
        trailClock = 0;
        const sp = Math.hypot(vx, vy);
        if (sp > cell * 0.02) {
          const w = new pixi.Sprite(tex.glow);
          w.anchor.set(0.5);
          w.tint = 0xffe2a0;
          w.alpha = Math.min(0.55, sp / (cell * 0.12));
          w.x = s.x - (vx / sp) * cell * 0.4;
          w.y = s.y - (vy / sp) * cell * 0.4;
          w.rotation = Math.atan2(vy, vx);
          w.width = cell * 0.7;
          w.height = cell * 0.12;
          root.addChildAt(w, Math.max(0, root.getChildIndex(s)));
          particle(engine, w, { vx: 0, vy: 0, life: 200, fadeFrom: 0 });
        }
      }
      lastX = s.x;
      lastY = s.y;

      if (cargo && !cargo.destroyed) {
        if (age < arrive) {
          // 도토리 뒤에 바짝 붙어 따라온다(돌지는 않고 살짝 흔들린다)
          cargo.x = s.x - dir * cell * 0.28;
          cargo.y = s.y + cell * 0.05;
          cargo.rotation = (sb.payload === 'rocket-v' ? Math.PI / 2 : 0) + Math.sin(age * 0.012) * 0.2;
        } else {
          cargo.destroy(); // 도착: 실린 아이템의 이펙트가 이어받는다
        }
      }

      const lift = Math.min(1, alt / (PEAK * 1.2));
      shadow.x = gx;
      shadow.y = gy + cell * 0.3;
      shadow.width = cell * (0.7 - 0.3 * lift);
      shadow.height = cell * (0.2 - 0.08 * lift);
      shadow.alpha = (0.32 - 0.14 * lift) * alpha * Math.min(1, age / 60);
      return true;
    });
  });
}

/** "딱!"·"개굴!" 같은 소리 글자가 톡 튀어나왔다 사라진다 */
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
        // 두 장은 같은 캔버스에 몸이 같은 자리로 그려져 있다(위로 친 그림을 펼친 그림에서 고쳐 만듦)

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
    s.anchor.set(0.5, 0.93); // 앉은 그림은 발 언저리를 기준으로 눌리고 펴진다(발끝이 높이 97% 지점)
    sizeTo(s, cell * 1.15);
    const sitBase = s.scale.y;
    // 점프 그림은 몸이 길어서 같은 몸 크기로 보이게 조금 더 크게
    const leapBase = sitBase * 1.25;
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
      s.anchor.set(0.5, leap ? 0.5 : 0.93);
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
