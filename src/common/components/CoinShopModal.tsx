import React, { useState, useEffect, useCallback } from 'react';
import { X, Lock, Play, Coins } from 'lucide-react';
import { useCoins } from '../../context/CoinContext';

const AD_COOLDOWN_MS = 30 * 1000; // 30초
const AD_STORAGE_KEY = 'lastAdWatchTime';

interface CoinShopModalProps {
    onClose: () => void;
    showToast: (msg: string) => void;
}

const purchasePackages = [
    { coins: 100, price: '₩990' },
    { coins: 550, price: '₩4,900', badge: '인기' },
    { coins: 1200, price: '₩9,900', badge: '최고' },
];

const CoinShopModal: React.FC<CoinShopModalProps> = ({ onClose, showToast }) => {
    const { coins, addCoins } = useCoins();
    const [adCooldownLeft, setAdCooldownLeft] = useState(0);
    const [adWatching, setAdWatching] = useState(false);

    const getAdCooldownLeft = useCallback(() => {
        const last = Number(localStorage.getItem(AD_STORAGE_KEY) || 0);
        return Math.max(0, last + AD_COOLDOWN_MS - Date.now());
    }, []);

    useEffect(() => {
        setAdCooldownLeft(getAdCooldownLeft());
        const timer = setInterval(() => setAdCooldownLeft(getAdCooldownLeft()), 1000);
        return () => clearInterval(timer);
    }, [getAdCooldownLeft]);

    const formatCooldown = (ms: number) => {
        const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleWatchAd = () => {
        if (adCooldownLeft > 0 || adWatching) return;

        // 개발 환경: 광고 API 없으면 시뮬레이션
        if (import.meta.env.DEV || !window.adBreak) {
            setAdWatching(true);
            setTimeout(async () => {
                await addCoins(50);
                localStorage.setItem(AD_STORAGE_KEY, String(Date.now()));
                setAdCooldownLeft(AD_COOLDOWN_MS);
                setAdWatching(false);
                showToast('🪙 50 코인 획득! (개발 모드)');
            }, 1500);
            return;
        }

        window.adBreak({
            type: 'reward',
            name: 'coin-reward',
            beforeAd: () => {
                setAdWatching(true);
            },
            beforeReward: (showAdFn: () => void) => {
                showAdFn();
            },
            afterAd: () => {
                setAdWatching(false);
            },
            adViewed: async () => {
                await addCoins(50);
                localStorage.setItem(AD_STORAGE_KEY, String(Date.now()));
                setAdCooldownLeft(AD_COOLDOWN_MS);
                showToast('🪙 50 코인 획득!');
            },
            adDismissed: () => {
                showToast('광고를 끝까지 시청해야 코인을 받을 수 있어요.');
            },
            adBreakDone: (info: { status: string }) => {
                setAdWatching(false);
                if (info.status === 'noAdPreloaded') {
                    showToast('현재 준비된 광고가 없습니다. 잠시 후 다시 시도해주세요.');
                }
            },
        });
    };

    const canWatchAd = adCooldownLeft === 0 && !adWatching;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 3000,
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: '#64748b',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '400px',
                    position: 'relative',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>코인 상점</h2>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <X size={24} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* 보유 코인 */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.7rem 1rem',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>보유 코인</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Coins size={16} color="#fde047" />
                            <span style={{ color: '#fde047', fontWeight: 'bold', fontSize: '1rem' }}>{coins.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* 광고 보기 */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>무료 코인</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>광고 보고 🪙 50 받기</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                                    {adCooldownLeft > 0
                                        ? `다음 광고까지 ${formatCooldown(adCooldownLeft)}`
                                        : '지금 바로 받을 수 있어요'}
                                </div>
                            </div>
                            <button
                                onClick={handleWatchAd}
                                disabled={!canWatchAd}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: canWatchAd
                                        ? 'linear-gradient(to bottom, #4ade80, #22c55e)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: canWatchAd ? 'pointer' : 'not-allowed',
                                    boxShadow: canWatchAd ? '0 4px 6px rgba(0,0,0,0.15), inset 0 2px 2px rgba(255,255,255,0.3)' : 'none',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {adWatching ? '로딩...' : <><Play size={13} fill="white" /> 보기</>}
                            </button>
                        </div>
                    </div>

                    {/* 구매 패키지 */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>코인 구매</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {purchasePackages.map(pkg => (
                                <div
                                    key={pkg.coins}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '10px',
                                        backgroundColor: '#334155',
                                        opacity: 0.6,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <Coins size={16} color="#fde047" />
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
                                            {pkg.coins.toLocaleString()} 코인
                                        </span>
                                        {pkg.badge && (
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 700,
                                                backgroundColor: '#f59e0b', color: 'white',
                                                padding: '1px 6px', borderRadius: '2rem',
                                            }}>
                                                {pkg.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.9rem' }}>{pkg.price}</span>
                                        <Lock size={14} color="#64748b" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0 1.5rem 1.5rem', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '0.8rem',
                            borderRadius: '12px',
                            background: '#475569',
                            border: 'none', color: 'white',
                            fontSize: '1rem', fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoinShopModal;
