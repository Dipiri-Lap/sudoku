import React, { useState } from 'react';
import { useQueensIcon, queenIconDesigns, GRADE_CONFIG, getIconUrl, type QueensIconDesign, type IconGrade } from '../context/QueensIconContext';
import { useCoins } from '../../../context/CoinContext';
import { X, Lock, Check } from 'lucide-react';

const CoinImg = ({ size = 16 }: { size?: number }) => (
    <img src="/coin_Icon.png" alt="" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
);

const GRADE_ORDER: IconGrade[] = ['common', 'rare', 'epic', 'legendary'];

interface Props { onClose: () => void; }

const QueensIconShopModal: React.FC<Props> = ({ onClose }) => {
    const { selectedIconId, hasUnlocked, unlockIcon, selectIcon } = useQueensIcon();
    const { coins } = useCoins();
    const [confirmDesign, setConfirmDesign] = useState<QueensIconDesign | null>(null);

    const handleAction = (design: QueensIconDesign) => {
        if (hasUnlocked(design.id)) {
            selectIcon(design.id);
        } else {
            const cost = GRADE_CONFIG[design.grade].cost;
            if (cost === 0 || coins >= cost) setConfirmDesign(design);
        }
    };

    const handleConfirmUnlock = async () => {
        if (!confirmDesign) return;
        await unlockIcon(confirmDesign.id);
        setConfirmDesign(null);
    };

    return (
        <div className="qs-overlay" onClick={onClose}>
            <div className="qs-panel" onClick={e => e.stopPropagation()}>
                <header className="qs-head">
                    <h2>크라운 상점</h2>
                    <button className="qs-close" onClick={onClose} aria-label="닫기">
                        <X size={22} strokeWidth={3} />
                    </button>
                </header>

                <div className="qs-wallet">
                    <span>보유 코인</span>
                    <b><CoinImg size={20} />{coins.toLocaleString()}</b>
                </div>

                <div className="qs-body">
                    {GRADE_ORDER.map(grade => {
                        const cfg = GRADE_CONFIG[grade];
                        const items = queenIconDesigns.filter(d => d.grade === grade);
                        return (
                            <section key={grade}>
                                <div className="qs-grade" style={{ '--grade': cfg.color } as React.CSSProperties}>
                                    {cfg.cost === 0 ? '무료' : <><CoinImg size={16} />{cfg.cost}</>}
                                </div>
                                <div className="qs-grid">
                                    {items.map(design => {
                                        const unlocked = hasUnlocked(design.id);
                                        const isSelected = selectedIconId === design.id;
                                        const canAfford = cfg.cost === 0 || coins >= cfg.cost;
                                        return (
                                            <button
                                                key={design.id}
                                                className={`qs-tile${isSelected ? ' selected' : ''}${unlocked ? '' : ' locked'}${!unlocked && !canAfford ? ' poor' : ''}`}
                                                onClick={() => handleAction(design)}
                                                aria-label={isSelected ? '적용 중인 왕관' : unlocked ? '왕관 선택' : `${cfg.cost}코인으로 잠금 해제`}
                                            >
                                                <span className="qs-tile-img">
                                                    <img src={getIconUrl(design.id)} alt="" />
                                                    {!unlocked && <span className="qs-lock"><Lock size={16} strokeWidth={3} /></span>}
                                                    {isSelected && <span className="qs-check"><Check size={11} strokeWidth={4} /></span>}
                                                </span>
                                                <span className="qs-tile-label">
                                                    {isSelected ? '적용 중' : unlocked ? '선택' : cfg.cost === 0 ? '무료' : <><CoinImg size={12} />{cfg.cost}</>}
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

            {confirmDesign && (
                <div className="qs-confirm-scrim" onClick={e => { e.stopPropagation(); setConfirmDesign(null); }}>
                    <div className="qs-confirm" onClick={e => e.stopPropagation()}>
                        <span className="qs-confirm-title">잠금 해제</span>
                        <img src={getIconUrl(confirmDesign.id)} alt="" />
                        <p><CoinImg size={18} />{GRADE_CONFIG[confirmDesign.grade].cost}코인을 쓸까요?</p>
                        <div className="qs-confirm-btns">
                            <button className="qs-btn ghost" onClick={() => setConfirmDesign(null)}>취소</button>
                            <button className="qs-btn gold" onClick={handleConfirmUnlock}>해제하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueensIconShopModal;
