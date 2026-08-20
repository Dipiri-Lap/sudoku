import React, { useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import {
  CROSSUM_THEMES,
  GRADE_CONFIG,
  GRADE_ORDER,
  themeCost,
  type CrossumTheme,
  type ThemeGrade,
} from '../stage/theme';

/**
 * 테마 상점.
 *
 * 미리보기는 실제 판을 축소한 모양(주어진 칸 · 연산자 · 빈칸 · 완성 칸)이라
 * 색만 늘어놓는 것보다 고르기 쉽다.
 */
const Preview: React.FC<{ theme: CrossumTheme }> = ({ theme }) => {
  const p = theme.preview;
  return (
    <div className="cm-shop-preview" style={{ background: p.bg }}>
      <span style={{ background: p.given }} />
      <span style={{ background: 'transparent' }}>+</span>
      <span style={{ background: p.tile }} />
      <span style={{ background: 'transparent' }}>=</span>
      <span style={{ background: p.solved }} />
    </div>
  );
};

interface Props {
  themeId: string;
  coins: number;
  hasUnlocked: (id: string) => boolean;
  selectTheme: (id: string) => void;
  unlockTheme: (id: string) => Promise<boolean>;
  onClose: () => void;
}

const CrossumThemeModal: React.FC<Props> = ({
  themeId, coins, hasUnlocked, selectTheme, unlockTheme, onClose,
}) => {
  const [confirm, setConfirm] = useState<CrossumTheme | null>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = (theme: CrossumTheme) => {
    if (hasUnlocked(theme.id)) {
      selectTheme(theme.id);
      return;
    }
    if (coins >= themeCost(theme)) setConfirm(theme);
  };

  const handleConfirm = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    await unlockTheme(confirm.id);
    setBusy(false);
    setConfirm(null);
  };

  return (
    <div className="cm-modal-backdrop" onClick={onClose}>
      <div className="cm-modal cm-shop" onClick={e => e.stopPropagation()}>
        <button className="cm-settings-close" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <h3>테마</h3>
        <p className="cm-modal-sub">
          <img src="/coin_Icon.png" alt="코인" />
          보유 {coins}개
        </p>

        <div className="cm-shop-list">
          {GRADE_ORDER.map((grade: ThemeGrade) => {
            const themes = CROSSUM_THEMES.filter(t => t.grade === grade);
            if (themes.length === 0) return null;
            const cfg = GRADE_CONFIG[grade];
            return (
              <section key={grade}>
                <h4 style={{ color: cfg.color }}>
                  {cfg.label}
                  {cfg.cost > 0 && <span className="cm-shop-price">{cfg.cost} 코인</span>}
                </h4>
                <div className="cm-shop-grid">
                  {themes.map(theme => {
                    const owned = hasUnlocked(theme.id);
                    const active = theme.id === themeId;
                    const affordable = owned || coins >= themeCost(theme);
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        className={`cm-shop-card${active ? ' is-active' : ''}${affordable ? '' : ' is-locked'}`}
                        onClick={() => handlePick(theme)}
                        disabled={!affordable}
                      >
                        <Preview theme={theme} />
                        <span className="cm-shop-name">{theme.name}</span>
                        {active && <span className="cm-shop-badge"><Check size={12} /></span>}
                        {!owned && <span className="cm-shop-badge cm-shop-badge-lock"><Lock size={12} /></span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {confirm && (
        <div className="cm-modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <h3>{confirm.name} 테마</h3>
            <p className="cm-modal-sub">
              {themeCost(confirm)} 코인을 사용해 해금할까요? (보유 {coins}개)
            </p>
            <div className="cm-modal-actions">
              <button className="cm-modal-btn" onClick={() => setConfirm(null)} disabled={busy}>
                취소
              </button>
              <button className="cm-modal-btn cm-modal-btn-primary" onClick={handleConfirm} disabled={busy}>
                {busy ? '처리 중…' : '해금'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossumThemeModal;
