import React, { useEffect, useRef, useState } from 'react';
import { CROPS, FARM_LIFE, FARM_RATIO, PLOTS, PLOTS_FROM_STAGE, farmStage, type Plot } from './farm';
import { formatCountdown } from './profile';

/**
 * 로비 가운데 농장 장면.
 *  - 걸음이 바뀌면 "짓는 순간" 연출: 바뀌는 자리에 먼지 + 밤톨이 망치질(약 1.2초) →
 *    새 그림이 서서히 나타나며 반짝이가 터진다
 *  - 걸음이 쌓일수록 생물(나비·무당벌레·개구리·꽃잎)이 하나씩 늘어난다
 *  - 밭 걸음부터: 밭마다 빈 흙 / 자라는 중 / 다 익음 조각을 바꿔 끼우고 표시를 띄운다
 */
export type PlotState = 'empty' | 'growing' | 'ripe';

export function plotState(plantedAt: number | undefined, crop: string, now: number): PlotState {
  if (plantedAt === undefined) return 'empty';
  return now - plantedAt >= CROPS[crop].growMs ? 'ripe' : 'growing';
}

/** 망치질 시간(ms) - 이 뒤에 새 그림이 나타난다 */
const HAMMER_MS = 1200;
const REVEAL_MS = 1000;

type Build = { from: number; to: number; phase: 'hammer' | 'reveal' };

const FarmScene: React.FC<{
  stage: number;
  plots: Record<string, number>;
  onPlot: (p: Plot, state: PlotState) => void;
  /** 방금 수확한 밭 - "+코인"이 떠오른다 */
  harvested?: { id: string; coins: number; at: number } | null;
  /** 짓는 연출이 끝났을 때(효과음 등) */
  onBuilt?: () => void;
}> = ({ stage, plots, onPlot, harvested, onBuilt }) => {
  const [build, setBuild] = useState<Build | null>(null);
  const last = useRef(stage);
  // 남은 시간 표시와 다 익는 순간을 위해 1초마다 다시 그린다
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (last.current === stage) return;
    const from = last.current;
    last.current = stage;
    // 걸음을 되돌리는 경우(개발용 초기화)는 연출 없이 바로 바꾼다
    if (stage < from) return;
    setBuild({ from, to: stage, phase: 'hammer' });
    const t1 = window.setTimeout(() => {
      setBuild({ from, to: stage, phase: 'reveal' });
      onBuilt?.();
    }, HAMMER_MS);
    const t2 = window.setTimeout(() => setBuild(null), HAMMER_MS + REVEAL_MS + 200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // 망치질하는 동안에는 아직 옛 그림이다
  const shown = build?.phase === 'hammer' ? build.from : stage;
  const cur = farmStage(shown);
  const focus = farmStage(build?.to ?? stage).focus;
  const showPlots = shown >= PLOTS_FROM_STAGE && !build;

  return (
    <div className="pg-scene" style={{ aspectRatio: `${FARM_RATIO}` }}>
      {build?.phase === 'reveal' && <img className="pg-scene-bg" src={farmStage(build.from).img} alt="" draggable={false} />}
      <img
        key={cur.id}
        className={`pg-scene-bg${build?.phase === 'reveal' ? ' reveal' : ''}`}
        src={cur.img}
        alt=""
        draggable={false}
      />

      <FarmLife stage={shown} />

      {showPlots &&
        PLOTS.map(p => {
          const st = plotState(plots[p.id], p.crop, now);
          const layer = st === 'empty' ? 'soil' : st === 'growing' ? 'grow' : 'ripe';
          return (
            <img
              key={`${p.id}-${layer}`}
              className={`pg-plot ${layer}`}
              src={`/assets/3match/farm/plot-${p.id}-${layer}.webp`}
              alt=""
              draggable={false}
              style={{ left: `${p.left * 100}%`, top: `${p.top * 100}%`, width: `${p.width * 100}%` }}
            />
          );
        })}

      {showPlots &&
        PLOTS.map(p => {
          const st = plotState(plots[p.id], p.crop, now);
          const crop = CROPS[p.crop];
          const left = plots[p.id] !== undefined ? plots[p.id] + crop.growMs - now : 0;
          return (
            <button
              key={`tag-${p.id}`}
              className={`pg-plot-tag ${st}`}
              style={{ left: `${p.cx * 100}%`, top: `${p.cy * 100}%` }}
              onClick={() => onPlot(p, st)}
              aria-label={`${crop.name} ${st === 'empty' ? '심기' : st === 'ripe' ? '수확' : '자라는 중'}`}
            >
              {st === 'empty' ? `${crop.name} 심기` : st === 'ripe' ? '수확!' : `⏱ ${formatCountdown(left)}`}
            </button>
          );
        })}

      {harvested &&
        (() => {
          const p = PLOTS.find(x => x.id === harvested.id);
          if (!p) return null;
          return (
            <span key={harvested.at} className="pg-plot-gain" style={{ left: `${p.cx * 100}%`, top: `${p.cy * 100}%` }}>
              <span className="pg-coin" aria-hidden />+{harvested.coins}
            </span>
          );
        })()}

      {/* 짓는 순간: 먼지 + 밤톨이 망치질 → 반짝이 */}
      {build && (
        <div className="pg-build-fx" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} aria-hidden>
          {build.phase === 'hammer' ? (
            <>
              {[0, 1, 2, 3, 4].map(i => (
                <img key={i} className="pg-dust" src="/assets/3match/fx/puff.png" alt="" style={{ ['--i' as string]: i, ['--odd' as string]: i % 2 }} />
              ))}
              <span className="pg-builder">
                <img className="pg-builder-hog" src="/assets/3match/farm/hedgehog-full.webp" alt="" />
                <img className="pg-builder-hammer" src="/assets/3match/boosters/hammer.png" alt="" />
              </span>
              {[0, 1, 2].map(i => (
                <img key={i} className="pg-bonk" src="/assets/3match/fx/star.png" alt="" style={{ ['--i' as string]: i }} />
              ))}
            </>
          ) : (
            Array.from({ length: 12 }, (_, i) => (
              <img
                key={i}
                className="pg-burst"
                src="/assets/3match/fx/sparkle.png"
                alt=""
                style={{ ['--a' as string]: `${i * 30}deg`, ['--i' as string]: i }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FarmScene;

/**
 * 걸음이 쌓일수록 늘어나는 생물. 장면 안 비율로 놓고 CSS로만 움직인다.
 * 그림은 게임에 이미 있는 것(나비·무당벌레·개구리·꽃잎)을 쓴다.
 */
const LIFE_IMG = {
  butterfly: '/assets/3match/items/butterfly.png',
  ladybug: '/assets/3match/items/ladybug.png',
  frog: '/assets/3match/fx/frog.png',
  petals: '/assets/3match/fx/petal.png',
} as const;

const FarmLife: React.FC<{ stage: number }> = ({ stage }) => (
  <div className="pg-life" aria-hidden>
    {FARM_LIFE.filter(l => stage >= l.from).map(l => {
      if (l.kind === 'butterfly') {
        return (
          <React.Fragment key={l.kind}>
            <img className="pg-life-butterfly a" src={LIFE_IMG.butterfly} alt="" />
            <img className="pg-life-butterfly b" src={LIFE_IMG.butterfly} alt="" />
          </React.Fragment>
        );
      }
      if (l.kind === 'petals') {
        return (
          <React.Fragment key={l.kind}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <img key={i} className="pg-life-petal" src={LIFE_IMG.petals} alt="" style={{ ['--i' as string]: i, left: `${20 + i * 12}%` }} />
            ))}
          </React.Fragment>
        );
      }
      return <img key={l.kind} className={`pg-life-${l.kind}`} src={LIFE_IMG[l.kind]} alt="" />;
    })}
  </div>
);
