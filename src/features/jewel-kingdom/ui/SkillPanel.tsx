import React, { useState } from 'react';
import { MAX_SKILL_SLOTS, SKILLS } from '../engine/skills';
import type { SpecialKind } from '../engine/types';

interface Props {
  equipped: SpecialKind[];
  /** 지금 열려 있는 칸 수 */
  slots: number;
  /** 다음 칸이 열리는 레벨(다 열렸으면 null) */
  nextSlotLevel: number | null;
  spriteFor: (kind: SpecialKind) => string;
  onSave: (next: SpecialKind[]) => void;
  onClose: () => void;
}

/**
 * 스킬 장착 화면. 열린 칸 수만큼 골라 끼운다.
 *
 * 고르는 동안은 초안만 바꾸고 "적용"을 눌러야 반영된다. 판 도중에 바꾸면
 * 게이지가 섞여 비교가 안 되므로 적용하면 판을 새로 시작한다.
 */
const SkillPanel: React.FC<Props> = ({ equipped, slots, nextSlotLevel, spriteFor, onSave, onClose }) => {
  const [draft, setDraft] = useState<SpecialKind[]>(equipped.slice(0, slots));
  const full = draft.length >= slots;

  const toggle = (kind: SpecialKind) =>
    setDraft(d => {
      if (d.includes(kind)) return d.filter(k => k !== kind);
      // 칸이 하나뿐이면 누른 것으로 바로 바꿔 끼운다(빼고 다시 고르는 두 번 손이 안 가게)
      if (slots === 1) return [kind];
      return d.length >= slots ? d : [...d, kind];
    });

  const changed = draft.length !== equipped.length || draft.some((k, i) => equipped[i] !== k);

  return (
    <div className="jk-skillpanel-backdrop" onClick={onClose}>
      <div className="jk-skillpanel" onClick={e => e.stopPropagation()} role="dialog" aria-label="스킬 장착">
        <h2>스킬 장착</h2>
        <p className="jk-skillpanel-hint">블록을 지울수록 게이지가 차요. 꽉 차면 원하는 칸에 써요</p>

        {/* 장착 칸: 열린 칸 + 잠긴 칸 */}
        <div className="jk-skill-slots">
          {Array.from({ length: MAX_SKILL_SLOTS }, (_, i) => {
            const kind = draft[i];
            const locked = i >= slots;
            return (
              <div key={i} className={`jk-skill-slot${locked ? ' locked' : ''}${kind ? ' filled' : ''}`}>
                {locked ? (
                  <span className="jk-skill-lock">🔒{i === slots && nextSlotLevel ? <small>레벨 {nextSlotLevel}</small> : null}</span>
                ) : kind ? (
                  <img src={spriteFor(kind)} alt="" draggable={false} />
                ) : (
                  <span className="jk-skill-empty">빈 칸</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="jk-skill-list">
          {SKILLS.map(skill => {
            const index = draft.indexOf(skill.kind);
            const active = index >= 0;
            const blocked = !active && full && slots > 1;
            return (
              <button
                key={skill.kind}
                className={`jk-skillpanel-item${active ? ' active' : ''}${blocked ? ' blocked' : ''}`}
                onClick={() => toggle(skill.kind)}
                aria-pressed={active}
              >
                <img src={spriteFor(skill.kind)} alt="" draggable={false} />
                <b>{skill.label}</b>
                <small>{skill.desc}</small>
                <span className="jk-skill-cost" title="게이지 크기">
                  ⚡{skill.cost}
                </span>
              </button>
            );
          })}
        </div>

        <div className="jk-skillpanel-actions">
          <button onClick={onClose}>닫기</button>
          <button className="primary" onClick={() => onSave(draft)} disabled={!changed || draft.length === 0}>
            적용하고 다시 시작
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillPanel;
