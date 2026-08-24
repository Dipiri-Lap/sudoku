import React from 'react';
import { BOARD_SIZE, parseCellKey } from '../utils/boardEngine';
import { EFFECT_ASSETS, spriteStyle } from '../effects';
import type { Blast } from '../types';

const CELL_PCT = 100 / BOARD_SIZE;

interface Props {
  /** 이번에 터지는 칸들("r,c") */
  clearing: Set<string>;
  /** 이번에 새로 생긴 아이템 칸들 */
  spawned: Set<string>;
  /** 이번에 발사된 로켓들 */
  blasts: Blast[];
  /** clearing 라운드 번호 - key에 섞어 같은 칸에서 연속으로 터져도 재생되게 한다 */
  round: number;
}

// 타일과 같은 좌표계(보드 기준 %)를 쓰는 이펙트 전용 레이어.
// 타일 DOM에 이펙트를 붙이면 타일이 사라질 때 이펙트도 같이 잘려나가므로,
// 별도 레이어로 띄워서 타일 수명과 분리한다.
const RoyalMatchEffects: React.FC<Props> = ({ clearing, spawned, blasts, round }) => {
  const cellBox = (row: number, col: number, scale: number): React.CSSProperties => {
    const size = CELL_PCT * scale;
    const offset = (size - CELL_PCT) / 2;
    return {
      left: `${col * CELL_PCT - offset}%`,
      top: `${row * CELL_PCT - offset}%`,
      width: `${size}%`,
      height: `${size}%`,
    };
  };

  const burst = EFFECT_ASSETS.burst;
  const charge = EFFECT_ASSETS.charge;

  return (
    <div className="royal-match-fx" aria-hidden="true">
      {/* 로켓 궤적: 발사된 칸을 원점으로 행/열 전체로 뻗어나간다. */}
      {blasts.map(({ row, col, kind }) => {
        const horizontal = kind === 'rocket-h';
        return (
          <div
            key={`trail-${round}-${row}-${col}`}
            className={`royal-match-fx-trail ${horizontal ? 'h' : 'v'}`}
            style={
              horizontal
                ? {
                    left: 0,
                    width: '100%',
                    top: `${row * CELL_PCT}%`,
                    height: `${CELL_PCT}%`,
                    transformOrigin: `${(col + 0.5) * CELL_PCT}% 50%`,
                  }
                : {
                    top: 0,
                    height: '100%',
                    left: `${col * CELL_PCT}%`,
                    width: `${CELL_PCT}%`,
                    transformOrigin: `50% ${(row + 0.5) * CELL_PCT}%`,
                  }
            }
          />
        );
      })}

      {/* 터지는 칸: 에셋이 있으면 스프라이트, 없으면 CSS 충격파 링. */}
      {[...clearing].map(key => {
        const { row, col } = parseCellKey(key);
        return burst ? (
          <div
            key={`burst-${round}-${key}`}
            className="royal-match-fx-sprite"
            style={{ ...cellBox(row, col, burst.scale), ...spriteStyle(burst) }}
          />
        ) : (
          <div
            key={`burst-${round}-${key}`}
            className="royal-match-fx-ring"
            style={cellBox(row, col, 1)}
          />
        );
      })}

      {/* 아이템이 생기는 칸 */}
      {[...spawned].map(key => {
        const { row, col } = parseCellKey(key);
        return charge ? (
          <div
            key={`charge-${round}-${key}`}
            className="royal-match-fx-sprite"
            style={{ ...cellBox(row, col, charge.scale), ...spriteStyle(charge) }}
          />
        ) : (
          <div
            key={`charge-${round}-${key}`}
            className="royal-match-fx-flare"
            style={cellBox(row, col, 2)}
          />
        );
      })}
    </div>
  );
};

export default RoyalMatchEffects;
