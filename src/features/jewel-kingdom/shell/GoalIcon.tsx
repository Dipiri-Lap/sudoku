import React from 'react';
import type { Goal } from '../engine/goals';
import { BlockerSprite, CollectorSprite, CoverSprite, GroundSprite } from '../ui/sprites';

/** 목표 그림(시작 전 창). 판 위 정보판(JewelKingdomGame의 목표 칸)과 같은 그림을 쓴다 */
const GoalIcon: React.FC<{ goal: Goal }> = ({ goal }) => {
  if (goal.kind === 'color') return <img className="pg-goal-img" src={`/assets/3match/gems/gem-${goal.color}.png`} alt="" />;
  return (
    <span className="jk-goal-icon pg-goal-img">
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
  );
};

export default GoalIcon;
