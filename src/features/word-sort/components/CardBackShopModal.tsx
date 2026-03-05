import React from 'react';
import { X, Lock, CheckCircle2, Coins } from 'lucide-react';
import { useCardBack, AVAILABLE_CARD_BACKS, type CardBack } from '../context/CardBackContext';

import { useCoins } from '../../../context/CoinContext';

interface CardBackShopModalProps {
    onClose: () => void;
}

const CardBackShopModal: React.FC<CardBackShopModalProps> = ({ onClose }) => {
    const { unlockedIds, selectedId, unlockCardBack, selectCardBack } = useCardBack();
    const { coins, spendCoins } = useCoins();
    const [confirmingPurchase, setConfirmingPurchase] = React.useState<CardBack | null>(null);

    const handleAction = async (item: CardBack) => {
        const isUnlocked = unlockedIds.includes(item.id);

        if (isUnlocked) {
            await selectCardBack(item.id);
        } else {
            setConfirmingPurchase(item);
        }
    };

    const confirmPurchase = async () => {
        if (!confirmingPurchase) return;

        if (coins < confirmingPurchase.price) {
            return;
        }

        const success = await spendCoins(confirmingPurchase.price);
        if (success) {
            const unlocked = await unlockCardBack(confirmingPurchase.id, confirmingPurchase.price);
            if (unlocked) {
                await selectCardBack(confirmingPurchase.id);
            }
        }
        setConfirmingPurchase(null);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 2000, background: 'rgba(0, 0, 0, 0.7)' }}>
            <div className="modal-content shop-modal" style={{
                maxWidth: '460px',
                width: '95%',
                background: '#6a82b3', // Solid blue-gray from image
                borderRadius: '30px',
                padding: '0',
                overflow: 'hidden',
                border: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                position: 'relative'
            }}>
                <header style={{
                    padding: '1.2rem',
                    position: 'relative',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{
                        margin: 0,
                        color: 'white',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>스킨</h2>
                    <button onClick={onClose} style={{
                        position: 'absolute', right: '1.2rem', top: '1.2rem',
                        background: '#e15b5b', border: '2px solid white', borderRadius: '50%',
                        color: 'white', width: '32px', height: '32px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}>
                        <X size={20} strokeWidth={3} />
                    </button>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        background: '#3d4d75',
                        borderRadius: '25px',
                        marginTop: '1.2rem',
                        padding: '3px'
                    }}>
                        <div style={{ flex: 1, padding: '8px', color: '#a0afcd', fontWeight: 'bold', fontSize: '1rem' }}>배경</div>
                        <div style={{
                            flex: 1, padding: '8px', background: '#849dc9', color: 'white',
                            borderRadius: '22px', fontWeight: 'bold', fontSize: '1rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>카드</div>
                    </div>
                </header>

                <div className="shop-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    padding: '1.2rem',
                    maxHeight: '60vh',
                    overflowY: 'auto'
                }}>
                    {AVAILABLE_CARD_BACKS.map((item) => {
                        const isUnlocked = unlockedIds.includes(item.id);
                        const isSelected = selectedId === item.id;

                        return (
                            <div key={item.id}
                                onClick={() => handleAction(item)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}>
                                <div className="card-preview" style={{
                                    aspectRatio: '0.72',
                                    borderRadius: '12px',
                                    backgroundImage: item.pattern,
                                    backgroundSize: '100% 100%',
                                    border: isSelected ? '4px solid #4ade80' : '4px solid white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {!isUnlocked && (
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexDirection: 'column', gap: '4px'
                                        }}>
                                            <Lock size={20} color="white" />
                                            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 'bold' }}>
                                                🪙 {item.price}
                                            </div>
                                        </div>
                                    )}
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute', top: '6px', right: '6px',
                                            background: '#4ade80', borderRadius: '50%',
                                            width: '24px', height: '24px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <CheckCircle2 size={16} color="white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{
                    padding: '1rem 1.2rem',
                    background: 'rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Coins size={20} className="text-yellow-400" />
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{coins}</span>
                </div>

                {/* Purchase Confirmation Modal (Overlay inside the shop modal) */}
                {confirmingPurchase && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, padding: '1rem'
                    }}>
                        <div style={{
                            background: '#3a3c5a', borderRadius: '25px', padding: '2rem',
                            textAlign: 'center', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔓</div>
                            <div style={{ fontWeight: '900', fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>잠금 해제</div>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', lineHeight: 1.5 }}>
                                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>🪙 {confirmingPurchase.price} 코인</span>을 사용하여<br />
                                이 카드를 구매하시겠습니까?
                            </div>

                            {coins < confirmingPurchase.price && (
                                <div style={{ fontSize: '0.85rem', color: '#ff6b6b', marginBottom: '1rem', fontWeight: 'bold' }}>
                                    코인이 부족합니다! (보유: {coins})
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setConfirmingPurchase(null)}
                                    style={{
                                        padding: '0.6rem 1.2rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)',
                                        background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >취소</button>
                                <button
                                    onClick={confirmPurchase}
                                    disabled={coins < confirmingPurchase.price}
                                    style={{
                                        padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none',
                                        background: coins >= confirmingPurchase.price ? 'linear-gradient(135deg, #f6d365, #fda085)' : 'rgba(255,255,255,0.15)',
                                        color: 'white', fontWeight: '900', cursor: coins >= confirmingPurchase.price ? 'pointer' : 'not-allowed'
                                    }}
                                >확인</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};



export default CardBackShopModal;
