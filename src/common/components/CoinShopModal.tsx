import React, { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import * as PortOne from '@portone/browser-sdk/v2';
const CoinImg = ({ size = 16 }: { size?: number }) => <img src="/coin_Icon.png" alt="coin" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
import { useCoins } from '../../context/CoinContext';
import { auth } from '../../firebase';

const PORTONE_STORE_ID = 'store-5fe3aecd-4b34-4afd-8010-c04757231e1a';
const PORTONE_CHANNEL_KEY = 'channel-key-8112f1af-1321-4f01-9a04-abdf11417a32';

const COIN_PACKAGES = [
    { coins: 500,   price: '₩2,200',  amount: 2200,  label: null,     img: '/500coin.png' },
    { coins: 1200,  price: '₩4,400',  amount: 4400,  label: '베스트', img: '/1200coin.png' },
    { coins: 3500,  price: '₩11,000', amount: 11000, label: null,     img: '/3500coin.png' },
    { coins: 10000, price: '₩25,000', amount: 25000, label: null,     img: '/10000coin.png' },
] as const;

const AD_COOLDOWN_MS = 30 * 60 * 1000; // 30분
const AD_STORAGE_KEY = 'lastAdWatchTime';

interface CoinShopModalProps {
    onClose: () => void;
    showToast: (msg: string) => void;
}


const CoinShopModal: React.FC<CoinShopModalProps> = ({ onClose, showToast }) => {
    const { coins, addCoins } = useCoins();
    const [adCooldownLeft, setAdCooldownLeft] = useState(0);
    const [adWatching, setAdWatching] = useState(false);
    const [pendingShowAd, setPendingShowAd] = useState<(() => void) | null>(null);

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
            beforeReward: (showAdFn: () => void) => {
                setPendingShowAd(() => showAdFn);
            },
            beforeAd: () => {
                setAdWatching(true);
                setPendingShowAd(null);
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
                setPendingShowAd(null);
                if (info.status === 'noAdPreloaded') {
                    showToast('현재 준비된 광고가 없습니다. 잠시 후 다시 시도해주세요.');
                }
            },
        });
    };

    const handleConfirmAd = () => {
        if (pendingShowAd) pendingShowAd();
    };

    const [purchasing, setPurchasing] = useState(false);

    const handlePurchase = async (pkg: typeof COIN_PACKAGES[number]) => {
        if (purchasing) return;
        setPurchasing(true);
        try {
            const uid = auth.currentUser?.uid ?? 'guest';
            const customerId = uid.slice(0, 20);

            const response = await PortOne.requestPayment({
                storeId: PORTONE_STORE_ID,
                channelKey: PORTONE_CHANNEL_KEY,
                paymentId: `coin-${pkg.coins}-${Date.now()}`,
                orderName: `퍼즐가든 코인 ${pkg.coins.toLocaleString()}개`,
                totalAmount: pkg.amount,
                currency: 'CURRENCY_KRW',
                payMethod: 'CARD',
                customer: { customerId },
            });

            if (!response || response.code) {
                showToast(response?.message || '결제가 취소되었습니다.');
                return;
            }

            // 결제 성공 → 코인 지급 (테스트 중 비활성화)
            // TODO: 실서비스에서는 서버에서 response.paymentId 검증 후 지급
            // await addCoins(pkg.coins);
            showToast(`결제 완료 (테스트 모드 — 코인 미지급)`);
            onClose();
        } catch (e) {
            console.error('Payment error:', e);
            showToast('결제 중 오류가 발생했습니다.');
        } finally {
            setPurchasing(false);
        }
    };


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
                            <CoinImg size={16} />
                            <span style={{ color: '#fde047', fontWeight: 'bold', fontSize: '1rem' }}>{coins.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* 코인 구매 */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>코인 구매</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {COIN_PACKAGES.map(pkg => (
                                <button
                                    key={pkg.coins}
                                    onClick={() => handlePurchase(pkg)}
                                    disabled={purchasing}
                                    style={{
                                        position: 'relative',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '0.6rem 0.5rem 0.6rem',
                                        borderRadius: '14px',
                                        border: pkg.label ? '2px solid #f59e0b' : '2px solid #2d4a7a',
                                        background: pkg.label
                                            ? 'linear-gradient(160deg, #1e3a5f, #2a5298)'
                                            : 'linear-gradient(160deg, #1a3158, #1e4080)',
                                        cursor: 'pointer',
                                        width: '100%',
                                        boxShadow: pkg.label
                                            ? '0 4px 16px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                                            : '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                                        overflow: 'visible',
                                        gap: '0.3rem',
                                    }}
                                >
                                    {/* HOT 뱃지 */}
                                    {pkg.label && (
                                        <div style={{
                                            position: 'absolute', top: '-8px', right: '-8px',
                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                            color: 'white', fontSize: '0.6rem', fontWeight: 900,
                                            borderRadius: '50%', width: 38, height: 38,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
                                            border: '2px solid white',
                                            zIndex: 2,
                                        }}>BEST</div>
                                    )}
                                    {/* 코인 수량 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <CoinImg size={12} />
                                        <span style={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                            {pkg.coins.toLocaleString()}
                                        </span>
                                    </div>
                                    {/* 코인 이미지 */}
                                    <img
                                        src={pkg.img}
                                        alt={`${pkg.coins} coins`}
                                        style={{
                                            width: '85%', height: 'auto', objectFit: 'contain',
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                                        }}
                                    />
                                    {/* 가격 버튼 */}
                                    <div style={{
                                        background: 'linear-gradient(to bottom, #5ecb3a, #3a9e1e)',
                                        borderRadius: '20px',
                                        padding: '0.3rem 0.8rem',
                                        width: '100%',
                                        textAlign: 'center',
                                        boxShadow: '0 3px 0 #2a7a10, inset 0 1px 0 rgba(255,255,255,0.3)',
                                        color: 'white', fontWeight: 800, fontSize: '0.9rem',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                    }}>{pkg.price}</div>
                                </button>
                            ))}
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
                                onClick={pendingShowAd ? handleConfirmAd : handleWatchAd}
                                disabled={adWatching || adCooldownLeft > 0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: (adWatching || adCooldownLeft > 0)
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'linear-gradient(to bottom, #4ade80, #22c55e)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: (adWatching || adCooldownLeft > 0) ? 'not-allowed' : 'pointer',
                                    boxShadow: (adWatching || adCooldownLeft > 0) ? 'none' : '0 4px 6px rgba(0,0,0,0.15), inset 0 2px 2px rgba(255,255,255,0.3)',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {adWatching ? '로딩...' : pendingShowAd ? <><Play size={13} fill="white" /> 광고 시청</> : <><Play size={13} fill="white" /> 보기</>}
                            </button>
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
