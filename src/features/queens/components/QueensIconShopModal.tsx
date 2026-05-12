import React, { useState } from 'react';
import { useQueensIcon, queenIconDesigns, GRADE_CONFIG, getIconUrl, type QueensIconDesign, type IconGrade } from '../context/QueensIconContext';
import { useCoins } from '../../../context/CoinContext';
import { X, Lock, Check } from 'lucide-react';

const CoinImg = ({ size = 16 }: { size?: number }) => (
    <img src="/coin_Icon.png" alt="coin" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
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
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem',
        }}>
            <div style={{
                backgroundColor: '#1e293b', borderRadius: '20px',
                width: '100%', maxWidth: '480px', maxHeight: '90vh',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem', textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(74,144,226,0.15), rgba(124,58,237,0.15))',
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: 800 }}>
                        👑 크라운 상점
                    </h2>
                    <button onClick={onClose} style={{
                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer',
                    }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Coin row */}
                <div style={{ padding: '0.75rem 1.25rem', flexShrink: 0 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.6rem 1rem', backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>보유 코인</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CoinImg size={16} />
                            <span style={{ color: '#fde047', fontWeight: 800, fontSize: '1rem' }}>{coins.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Grade sections */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {GRADE_ORDER.map(grade => {
                        const cfg = GRADE_CONFIG[grade];
                        const items = queenIconDesigns.filter(d => d.grade === grade);
                        return (
                            <div key={grade}>
                                {/* Grade divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${cfg.color}60, transparent)` }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {cfg.cost === 0
                                            ? <span style={{ color: '#4ade80' }}>FREE</span>
                                            : <><CoinImg size={12} />{cfg.cost}</>
                                        }
                                    </span>
                                    <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${cfg.color}60, transparent)` }} />
                                </div>

                                {/* 4-column grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {items.map(design => {
                                        const unlocked = hasUnlocked(design.id);
                                        const isSelected = selectedIconId === design.id;
                                        const canAfford = cfg.cost === 0 || coins >= cfg.cost;

                                        return (
                                            <div
                                                key={design.id}
                                                onClick={() => handleAction(design)}
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                                                    border: isSelected
                                                        ? '2px solid #4ade80'
                                                        : '1px solid rgba(255,255,255,0.07)',
                                                    borderRadius: '12px',
                                                    padding: '0.55rem 0.4rem',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                                                    cursor: unlocked || canAfford ? 'pointer' : 'not-allowed',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Crown image */}
                                                <div style={{ position: 'relative', width: 60, height: 60 }}>
                                                    <img
                                                        src={getIconUrl(design.id)}
                                                        alt={`crown ${design.id}`}
                                                        style={{
                                                            width: '100%', height: '100%',
                                                            objectFit: 'contain',
                                                            opacity: unlocked ? 1 : 0.35,
                                                        }}
                                                    />
                                                    {!unlocked && (
                                                        <div style={{
                                                            position: 'absolute', inset: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            <Lock size={16} color="white" strokeWidth={2.5} />
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div style={{
                                                            position: 'absolute', top: -3, right: -3,
                                                            width: 16, height: 16, borderRadius: '50%',
                                                            background: '#4ade80', border: '2px solid #1e293b',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            <Check size={9} color="#fff" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action label */}
                                                <div style={{
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    color: isSelected ? '#4ade80' : unlocked ? '#94a3b8' : canAfford ? '#fde047' : '#475569',
                                                    display: 'flex', alignItems: 'center', gap: '2px',
                                                }}>
                                                    {isSelected ? '적용됨' : unlocked ? '선택' : cfg.cost === 0 ? '무료' : <><CoinImg size={11} />{cfg.cost}</>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confirm unlock modal */}
            {confirmDesign && (
                <div style={{
                    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                }}>
                    <div style={{
                        backgroundColor: '#1e293b', borderRadius: '20px', padding: '1.75rem 1.5rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                        width: '240px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>잠금 해제</span>
                        <img
                            src={getIconUrl(confirmDesign.id)}
                            alt={`crown ${confirmDesign.id}`}
                            style={{ width: 80, height: 80, objectFit: 'contain' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '0.88rem', textAlign: 'center' }}>
                            <CoinImg size={16} />
                            <span>{GRADE_CONFIG[confirmDesign.grade].cost} 코인을 사용하시겠습니까?</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
                            <button onClick={() => setConfirmDesign(null)} style={{
                                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                            }}>취소</button>
                            <button onClick={handleConfirmUnlock} style={{
                                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                                background: 'linear-gradient(135deg, #f6d365, #fda085)',
                                color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                            }}>확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueensIconShopModal;
