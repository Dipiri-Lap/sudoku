import React, { useState } from 'react';
import { ELEMENTS, type ElementCategory } from '../data/elements';
import { BlockerSprite } from './sprites';

/**
 * 샌드박스 팔레트 — 카탈로그 요소를 판에 찍어 시험한다.
 *
 * 레벨 하나에 몇 개 심어놓고 보는 것과 다르다. 여기서는 **아무 조합이나
 * 그 자리에서 만들어** 볼 수 있다: 방패 8겹 옆에 골렘, 얼음 아래 잔디,
 * 벽으로 가둔 방 안의 그릇 같은 것들.
 *
 * 카탈로그가 늘어나면 팔레트도 자동으로 늘어난다 - 표를 읽어 그리기 때문이다.
 */
export type PaintTool =
  | { kind: 'element'; id: string; layers: number }
  | { kind: 'wall'; side: 'top' | 'left' }
  | { kind: 'gem' }
  | { kind: 'erase' };

const CATEGORY_LABEL: Record<ElementCategory, string> = {
  lower: '하단 레이어',
  upper: '상단 레이어',
  blocker: '막는 장애물',
  generator: '생성',
  container: '그릇',
  special: '특수',
};

const ORDER: ElementCategory[] = ['blocker', 'upper', 'lower', 'generator', 'container', 'special'];

interface Props {
  tool: PaintTool | null;
  layers: number;
  onPick: (tool: PaintTool | null) => void;
  onLayers: (n: number) => void;
}

const SandboxPalette: React.FC<Props> = ({ tool, layers, onPick, onLayers }) => {
  const [tab, setTab] = useState<ElementCategory>('blocker');
  const list = ELEMENTS.filter(e => e.category === tab);

  const isActive = (t: PaintTool) => {
    if (!tool) return false;
    if (t.kind === 'element' && tool.kind === 'element') return t.id === tool.id;
    if (t.kind === 'wall' && tool.kind === 'wall') return t.side === tool.side;
    return t.kind === tool.kind;
  };

  return (
    <div className="jk-palette">
      <div className="jk-palette-tabs">
        {ORDER.map(c => (
          <button key={c} className={c === tab ? 'active' : ''} onClick={() => setTab(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="jk-palette-items">
        {list.map(def => {
          const t: PaintTool = { kind: 'element', id: def.id, layers };
          return (
            <button
              key={def.id}
              className={`jk-palette-item${isActive(t) ? ' active' : ''}`}
              onClick={() => onPick(isActive(t) ? null : t)}
              title={`${def.note}${def.verified ? '' : ' (동작 미확인)'}`}
            >
              <BlockerSprite kind={def.id} layers={layers} />
              <span className="jk-palette-label">
                {def.label}
                {!def.verified && <i title="레퍼런스 확인 전">?</i>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="jk-palette-tools">
        <label>
          겹
          <input
            type="range"
            min={1}
            max={8}
            value={layers}
            onChange={e => onLayers(Number(e.target.value))}
          />
          <b>{layers}</b>
        </label>
        <button
          className={isActive({ kind: 'wall', side: 'top' }) ? 'active' : ''}
          onClick={() => onPick(isActive({ kind: 'wall', side: 'top' }) ? null : { kind: 'wall', side: 'top' })}
        >
          벽 ▔
        </button>
        <button
          className={isActive({ kind: 'wall', side: 'left' }) ? 'active' : ''}
          onClick={() => onPick(isActive({ kind: 'wall', side: 'left' }) ? null : { kind: 'wall', side: 'left' })}
        >
          벽 ▏
        </button>
        <button
          className={isActive({ kind: 'erase' }) ? 'active' : ''}
          onClick={() => onPick(isActive({ kind: 'erase' }) ? null : { kind: 'erase' })}
        >
          지우개
        </button>
      </div>
    </div>
  );
};

export default SandboxPalette;
