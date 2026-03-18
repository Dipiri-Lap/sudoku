import React from 'react';
import { useCardBacks, cardBackDesigns, type CardBackDesign } from '../context/CardBackContext';
import { useCoins } from '../../../context/CoinContext';
import { X, Lock, Check, Coins } from 'lucide-react';

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
                await unlockBack(design.id);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#64748b',
                borderRadius: '16px',
                width: '100%', maxWidth: '500px', maxHeight: '90vh',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        카드 뒷면 상점
                    </h2>
                    <button onClick={onClose} style={{
                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', color: '#ef4444',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={24} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1, overflowY: 'auto' }}>
                    {/* Stats Row */}
                    <div style={{
                        display: 'flex', gap: '0.8rem'
                    }}>
                        {/* Coins */}
                        <div style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.7rem 1rem', backgroundColor: '#1e293b',
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>보유 코인</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Coins size={16} color="#fde047" />
                                <span style={{ color: '#fde047', fontWeight: 'bold', fontSize: '1rem' }}>{coins.toLocaleString()}</span>
                            </div>
                        </div>

                    </div>

                    {/* Card Grid */}
                    <div style={{
                        backgroundColor: '#475569', borderRadius: '16px', padding: '1rem'
                    }}>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem'
                        }}>
                            {cardBackDesigns.map((design) => {
                                const unlocked = hasUnlocked(design.id);
                                const isSelected = selectedBackId === design.id;
                                const canAfford = coins >= 200;

                                return (
                                    <div key={design.id} style={{
                                        backgroundColor: '#334155',
                                        border: isSelected ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', padding: '1rem',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        transition: 'transform 0.2s', cursor: 'default'
                                    }}>
                                        {/* Card Preview */}
                                        <div style={{
                                            width: '60px', height: '84px', borderRadius: '4px',
                                            backgroundImage: design.pattern,
                                            backgroundSize: design.isImage ? '100% 100%' : '16px 16px',
                                            backgroundPosition: design.isImage ? 'center' : '0 0',
                                            backgroundRepeat: design.isImage ? 'no-repeat' : 'repeat',
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

                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.2rem', textAlign: 'center', color: 'white' }}>
                                            {design.name}
                                        </div>

                                        <button
                                            onClick={() => handleAction(design)}
                                            disabled={!unlocked && !canAfford}
                                            style={{
                                                marginTop: 'auto', width: '100%', padding: '0.5rem', borderRadius: '6px',
                                                border: 'none', fontWeight: 'bold', fontSize: '0.85rem',
                                                cursor: (!unlocked && !canAfford) ? 'not-allowed' : 'pointer',
                                                background: isSelected
                                                    ? 'linear-gradient(to bottom, #4ade80, #22c55e)'
                                                    : unlocked
                                                        ? '#475569'
                                                        : canAfford
                                                            ? 'linear-gradient(135deg, #f6d365, #fda085)'
                                                            : '#1e293b',
                                                color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                boxShadow: isSelected ? '0 4px 6px rgba(0,0,0,0.1), inset 0 2px 2px rgba(255,255,255,0.3)' : 'none',
                                                opacity: (!unlocked && !canAfford) ? 0.5 : 1
                                            }}
                                        >
                                            {isSelected ? (
                                                <><Check size={14} /> 적용됨</>
                                            ) : unlocked ? (
                                                '선택'
                                            ) : (
                                                <><Coins size={13} /> 200</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardBackShopModal;
