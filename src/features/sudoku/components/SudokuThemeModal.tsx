import React, { useState } from 'react';
import { useSudokuTheme, SUDOKU_THEMES, THEME_GRADE_CONFIG, type SudokuTheme, type ThemeGrade } from '../context/SudokuThemeContext';
import { useCoins } from '../../../context/CoinContext';
import { X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './SudokuThemeModal.css';

const GRADE_ORDER: ThemeGrade[] = ['free', 'common', 'rare', 'epic', 'legendary'];

/** 전설 테마: 정지 그림 대신 실제 배경 이펙트가 움직이는 작은 장면 위에 미니 판을 띄운다 */
const LivePreview: React.FC<{ theme: SudokuTheme; size: number }> = ({ theme, size }) => {
    const p = theme.preview;
    const inner = Math.round(size * 0.62);
    const cell = (inner - 6) / 3;
    return (
        <div className={`st-prev st-live st-live-${theme.id}`} style={{ width: size, height: size }}>
            <div className="st-live-board" style={{
                width: inner, height: inner, background: p.line,
                gridTemplateColumns: `repeat(3, ${cell}px)`, gridTemplateRows: `repeat(3, ${cell}px)`,
            }}>
                {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} style={{
                        background: i === 4 ? p.accent : p.cell, color: p.text, fontSize: size * 0.12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    }}>{i === 4 ? '5' : ''}</div>
                ))}
            </div>
        </div>
    );
};

const ThemePreview: React.FC<{ theme: SudokuTheme; size?: number }> = ({ theme, size = 58 }) => {
    if (theme.grade === 'legendary') return <LivePreview theme={theme} size={size} />;
    const p = theme.preview;
    const cellSize = (size - 8) / 3;
    return (
        <div className="st-prev" style={{
            width: size, height: size, overflow: 'hidden',
            background: p.bg, border: `2px solid ${p.line}`, position: 'relative',
            display: 'grid', gridTemplateColumns: `repeat(3, ${cellSize}px)`,
            gridTemplateRows: `repeat(3, ${cellSize}px)`,
            gap: 1, padding: 3, boxSizing: 'border-box', flexShrink: 0,
        }}>
            {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{
                    background: i === 4 ? p.accent : p.cell,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: size * 0.13, fontWeight: 700, color: p.text,
                    fontFamily: theme.id === 'gameboy' || theme.id === 'chalkboard' ? 'monogram' : 'system-ui, sans-serif',
                }}>
                    {i === 4 ? '5' : ''}
                </div>
            ))}
        </div>
    );
};

interface Props { onClose: () => void; }

const SudokuThemeModal: React.FC<Props> = ({ onClose }) => {
    const { t: tr } = useTranslation('sudoku');
    const { selectedThemeId, hasUnlocked, unlockTheme, selectTheme, startPreview, previewThemeId } = useSudokuTheme();
    const { coins } = useCoins();
    const [confirmTheme, setConfirmTheme] = useState<SudokuTheme | null>(null);

    const handleAction = (theme: SudokuTheme) => {
        if (hasUnlocked(theme.id)) {
            selectTheme(theme.id);
        } else {
            // 코인이 모자라도 열어 준다 — 미리 써보기는 누구나 할 수 있다
            setConfirmTheme(theme);
        }
    };

    const handleTry = () => {
        if (!confirmTheme) return;
        startPreview(confirmTheme.id);
        setConfirmTheme(null);
        onClose();
    };

    const handleConfirm = async () => {
        if (!confirmTheme) return;
        await unlockTheme(confirmTheme.id);
        setConfirmTheme(null);
    };

    return (
        <div className="st-shop" onClick={onClose}>
            <div className="st-panel" onClick={e => e.stopPropagation()}>
                <div className="st-head">
                    <h2>{tr('themeModal.title')}</h2>
                    <span className="st-coins" title={tr('themeModal.coins')}>
                        <img src="/coin_Icon.png" alt="" />
                        {coins.toLocaleString()}
                    </span>
                    <button className="st-x" onClick={onClose} aria-label="close">
                        <X size={22} strokeWidth={3} />
                    </button>
                </div>

                <div className="st-scroll">
                    {GRADE_ORDER.map(grade => {
                        const cfg = THEME_GRADE_CONFIG[grade];
                        const items = SUDOKU_THEMES.filter(t => t.grade === grade);
                        if (items.length === 0) return null;
                        return (
                            <section key={grade}>
                                <div className="st-grade">
                                    <i style={{ background: cfg.color }} />
                                    {cfg.label}
                                    {cfg.cost > 0 && (
                                        <small><img src="/coin_Icon.png" alt="" />{cfg.cost}</small>
                                    )}
                                </div>
                                <div className="st-grid">
                                    {items.map(theme => {
                                        const unlocked = hasUnlocked(theme.id);
                                        const using = selectedThemeId === theme.id;
                                        const canAfford = cfg.cost === 0 || coins >= cfg.cost;
                                        const tagClass = using ? 'using' : unlocked ? 'owned' : cfg.cost === 0 ? 'free' : canAfford ? 'price' : 'short';
                                        return (
                                            <button
                                                key={theme.id}
                                                className={`st-card g-${grade} ${using ? 'using' : ''} ${unlocked ? '' : 'locked'}`}
                                                onClick={() => handleAction(theme)}
                                            >
                                                <div className="st-prev-wrap">
                                                    <ThemePreview theme={theme} size={64} />
                                                    {!unlocked && (
                                                        <div className="st-lock"><Lock size={18} strokeWidth={3} /></div>
                                                    )}
                                                </div>
                                                <span className="nm">{theme.name}</span>
                                                <span className={`tag ${tagClass}`}>
                                                    {using ? tr('themeModal.applied')
                                                        : unlocked ? tr('themeModal.select')
                                                            : cfg.cost === 0 ? tr('themeModal.free')
                                                                : <><img src="/coin_Icon.png" alt="" />{cfg.cost}</>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {confirmTheme && (() => {
                const cost = THEME_GRADE_CONFIG[confirmTheme.grade].cost;
                const affordable = coins >= cost;
                return (
                    <div className="st-confirm" onClick={e => { e.stopPropagation(); setConfirmTheme(null); }}>
                        <div className={`box ${confirmTheme.grade === 'legendary' ? 'legendary' : ''}`} onClick={e => e.stopPropagation()}>
                            <ThemePreview theme={confirmTheme} size={120} />
                            <p>
                                <b>{confirmTheme.name}</b>
                                <br />
                                <img src="/coin_Icon.png" alt="" /> {tr('themeModal.confirmSpend', { cost })}
                            </p>
                            <div className="row">
                                <button className="try" onClick={handleTry} disabled={previewThemeId === confirmTheme.id}>
                                    {tr('themeModal.try')}
                                </button>
                                <button className="yes" onClick={handleConfirm} disabled={!affordable}>
                                    {affordable ? tr('themeModal.ok') : tr('themeModal.notEnough')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default SudokuThemeModal;
