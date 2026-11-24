/**
 * 턴 단계마다 효과음을 연출 시간표(fx/schedule.ts)에 맞춰 낸다.
 * 소리를 내는 시각이 이펙트와 같은 시간표에서 나오므로, 터지는 순간과 소리가 어긋나지 않는다.
 */
import type { TurnStep } from '../engine/resolve';
import { parseKey } from '../engine/board';
import {
  FX_TIMING,
  arrivalMs,
  blastHasFx,
  flightTargets,
  hitTimes,
  lightGapFor,
  lightballPopMs,
  scheduleClear,
} from './fx/schedule';
import { playSfx, playSfxAt } from './sound';

/** 채소가 줄어들다 즙이 튀는 순간(FxLayer의 JUICE_AT과 같다) */
const POP_AT = 70;

export function playStepSounds(step: TurnStep): void {
  switch (step.kind) {
    case 'swap':
      playSfx(step.merge ? 'merge' : 'swap');
      return;
    case 'revert':
      playSfx('invalid');
      return;
    case 'fall':
      if (step.moves.length > 0) playSfxAt('land', 180);
      return;
    case 'clear':
      clearSounds(step);
      return;
    case 'board-effect':
      // 버섯이 자라남: 채소가 톡 터지고 버섯이 띠옹
      if (step.effects.some(e => e.kind === 'regrow')) {
        playSfxAt('dig', 0, 1.25); // 밑에서 밀고 올라오는 흙 소리
        playSfxAt('pop', 220, 0.9); // 쩍 갈라짐
        playSfxAt('spawn', 300, 0.8); // 띠옹
      }
      return;
    default:
      return;
  }
}

function clearSounds(step: Extract<TurnStep, { kind: 'clear' }>) {
  const sch = scheduleClear(step);
  // 연쇄가 이어질수록 톡 소리가 높아진다(시원하게 올라가는 맛)
  const comboPitch = 1 + Math.min(step.combo - 1, 8) * 0.07;

  // 1) 채소 톡: 같은 순간에 터지는 칸은 한 번만(60ms 단위로 묶고 많아도 열 번)
  const buckets = new Set<number>();
  step.cells.forEach(k => {
    const { row, col } = parseKey(k);
    const g = step.board.cells[row * step.board.width + col]?.gem;
    if (!g || g.special || g.inert) return;
    buckets.add(Math.round((sch.delays.get(k) ?? 0) / 60));
  });
  [...buckets]
    .sort((a, b) => a - b)
    .slice(0, 10)
    .forEach((b, i) => playSfxAt('pop', b * 60 + POP_AT, comboPitch * (1 + i * 0.015)));

  // 짚단 바스락: 같은 순간(60ms 단위)에 맞는 짚단은 한 번만, 많아도 네 번.
  // 하나라도 통째로 깨지면 크게, 겹만 털리면 작게
  const hits = hitTimes(step);
  const straw = new Map<number, boolean>();
  step.damage.forEach(d => {
    if (d.kind !== 'box' || d.target !== 'blocker') return;
    const b = Math.round((hits.get(d.key) ?? 0) / 60);
    straw.set(b, (straw.get(b) ?? false) || d.destroyed);
  });
  [...straw]
    .sort((x, y) => x[0] - y[0])
    .slice(0, 4)
    .forEach(([b, broken], i) => playSfxAt('straw', b * 60, (broken ? 1 : 0.8) * (1 + i * 0.03)));

  // 2) 새 아이템이 생기는 순간
  if (step.spawned.length > 0) playSfxAt('spawn', 120);

  // 3) 아이템마다
  const { width, height } = step.board;
  /** 거름포대가 터지는 시각 → 크게(합체·여럿 동시) 낼지 */
  const tntAt = new Map<number, boolean>();
  sch.blasts.forEach(sb => {
    const b = sb.blast;
    if (!blastHasFx(b)) return;
    const t = sb.start;
    switch (b.kind) {
      case 'tnt': {
        // 같은 순간에 여러 포대가 터지면(무지개꽃+포대) 소리는 한 번만, 대신 더 묵직하게
        const at = Math.round(t);
        const big = (b.combo && !sb.carried) || tntAt.has(at);
        tntAt.set(at, big);
        return;
      }
      case 'rocket-h':
      case 'rocket-v': {
        if (sb.clash && b.kind === 'rocket-h') {
          if ((b.band ?? 1) > 1) {
            playSfxAt('fuse', t - FX_TIMING.crossBoom);
            playSfxAt('boom', t - 60);
          } else {
            playSfxAt('clash', t - FX_TIMING.crossClash + 130);
          }
        }
        playSfxAt('dig', t + FX_TIMING.rocketLaunch);
        // 판 끝에 탕 꽂히는 순간(먼 쪽 기준)
        const far = b.kind === 'rocket-h' ? Math.max(b.col, width - 1 - b.col) : Math.max(b.row, height - 1 - b.row);
        playSfxAt('stick', t + FX_TIMING.rocketLaunch + far * FX_TIMING.rocketCell);
        return;
      }
      case 'propeller': {
        playSfxAt('acornLaunch', t);
        const dest = flightTargets(b)[0];
        if (dest) playSfxAt('acornHit', t + arrivalMs(b, dest));
        return;
      }
      case 'butterfly':
        playSfxAt('chirp', t);
        flightTargets(b).forEach(d => playSfxAt('acornHit', t + arrivalMs(b, d)));
        return;
      case 'ladybug': {
        playSfxAt('ribbit', t);
        const dest = flightTargets(b)[0];
        if (dest) playSfxAt('stick', t + arrivalMs(b, dest));
        return;
      }
      case 'scarecrow':
        playSfxAt('swap', t);
        return;
      case 'lightball': {
        if (b.wipe) {
          // 판 쓸기: 차임이 점점 높아지다(빛 모으기) 큰 펑
          playSfxAt('chime', t);
          playSfxAt('chime', t + 180, 1.25);
          playSfxAt('chime', t + 360, 1.5);
          playSfxAt('boom', t + FX_TIMING.wipeCharge, 0.8);
          return;
        }
        playSfxAt('chime', t);
        if (b.combo && b.into) {
          // 변신: 꽃잎이 닿을 때마다 뿅(음이 차례로 올라간다)
          let i = 0;
          sch.morphAt.forEach(at => playSfxAt('morph', at, 1 + Math.min(i++, 12) * 0.04));
          return;
        }
        // 꽃잎이 하나씩 닿을 때마다 딩 - 다 닿으면 한꺼번에 팡
        const n = step.cells.filter(k => {
          const { row, col } = parseKey(k);
          if (row === b.row && col === b.col) return false;
          const g = step.board.cells[row * step.board.width + col]?.gem;
          return !!g && !g.special && !g.inert && g.color === b.targetColor;
        }).length;
        const gap = lightGapFor(n);
        for (let i = 0; i < n; i++) {
          playSfxAt('petal', t + FX_TIMING.lightRise + i * gap + FX_TIMING.lightFly, 1 + Math.min(i, 12) * 0.05);
        }
        playSfxAt('boom', t + lightballPopMs(n), 1.4);
        return;
      }
      default:
        return;
    }
  });
  tntAt.forEach((big, at) => {
    playSfxAt('fuse', at);
    playSfxAt('boom', at + FX_TIMING.tntCharge + FX_TIMING.tntHitstop, big ? 0.8 : 1);
  });
}
