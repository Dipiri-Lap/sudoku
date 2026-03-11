import React from 'react';
import { useCardBacks, cardBackDesigns, type CardBackDesign } from '../context/CardBackContext';
import { useCoins } from '../../../context/CoinContext';
import { X, Lock, Check } from 'lucide-react';

interface ShopProps {
    onClose: () => void;
}

const CardBackShopModal: React.FC<ShopProps> = ({ onClose }) => {
    const { selectedBackId, hasUnlocked, unlockBack, selectBack } = useCardBacks();
    const { coins } = useCoins();

    const handleAction = async (design: CardBackDesign) => {
        if (hasUnlocked(design.id)) {
            selectBack(design.id);
        } else {
            if (coins >= 200) {
                // Let the Context handle deduction via spendCoins
                await unlockBack(design.id);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
            padding: '1rem'
        }}>
            <div style={{
                background: '#23253a', borderRadius: '16px', padding: '1.5rem',
                width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)', position: 'relative',
                color: 'white', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '15px', right: '15px', background: 'none',
                    border: 'none', color: '#aaa', cursor: 'pointer', padding: '5px'
                }}>
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem', textAlign: 'center', fontSize: '1.5rem', color: '#ffba75' }}>
                    카드 뒷면 상점
                </h2>
                
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#ddd' }}>
                    보유 코인: <strong style={{ color: '#f1c40f', fontSize: '1.1rem' }}>🪙 {coins}</strong>
                </div>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem'
                }}>
                    {cardBackDesigns.map((design) => {
                        const unlocked = hasUnlocked(design.id);
                        const isSelected = selectedBackId === design.id;
                        const canAfford = coins >= 200;

                        return (
                            <div key={design.id} style={{
                                backgroundColor: '#1a1c2e', border: isSelected ? '2px solid #ffba75' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', transition: 'transform 0.2s',
                                cursor: 'default'
                            }}>
                                {/* Card Preview */}
                                <div style={{
                                    width: '60px', height: '84px', borderRadius: '4px',
                                    backgroundImage: design.pattern, backgroundSize: design.isImage ? '100% 100%' : '16px 16px',
                                    backgroundPosition: design.isImage ? 'center' : '0 0', backgroundRepeat: design.isImage ? 'no-repeat' : 'repeat',
                                    marginBottom: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                    border: '1.5px solid #999999', position: 'relative'
                                }}>
                                    {!unlocked && (
                                        <div style={{
                                            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px'
                                        }}>
                                            <Lock size={20} color="white" />
                                        </div>
                                    )}
                                </div>

                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.2rem', textAlign: 'center' }}>
                                    {design.name}
                                </div>

                                <button 
                                    onClick={() => handleAction(design)}
                                    disabled={!unlocked && !canAfford}
                                    style={{
                                        marginTop: 'auto', width: '100%', padding: '0.5rem', borderRadius: '6px',
                                        border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: (!unlocked && !canAfford) ? 'not-allowed' : 'pointer',
                                        background: isSelected ? 'rgba(255, 186, 117, 0.2)' : (unlocked ? '#3a3c5a' : (canAfford ? 'linear-gradient(135deg, #f6d365, #fda085)' : '#333')),
                                        color: isSelected ? '#ffba75' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                    }}
                                >
                                    {isSelected ? (
                                        <><Check size={14} /> 적용됨</>
                                    ) : unlocked ? (
                                        '선택'
                                    ) : (
                                        <>🪙 200</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CardBackShopModal;
