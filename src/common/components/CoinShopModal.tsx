import React, { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import * as PortOne from '@portone/browser-sdk/v2';
import { httpsCallable } from 'firebase/functions';
const CoinImg = ({ size = 16 }: { size?: number }) => <img src="/coin_Icon.png" alt="coin" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useCoins } from '../../context/CoinContext';
import { auth, db, functions } from '../../firebase';

const PORTONE_STORE_ID = 'store-5fe3aecd-4b34-4afd-8010-c04757231e1a';
const PORTONE_CHANNEL_KEY = 'channel-key-67141cfa-6abd-40c7-8646-ea2e64b082ef'; // 실연동(퍼즐가든) 채널

const COIN_PACKAGES = [
    { coins: 500,   price: '₩2,200',  amount: 2200,  label: null,     img: '/500coin.png' },
    { coins: 1200,  price: '₩4,400',  amount: 4400,  label: '베스트', img: '/1200coin.png' },
    { coins: 3500,  price: '₩11,000', amount: 11000, label: null,     img: '/3500coin.png' },
    { coins: 10000, price: '₩25,000', amount: 25000, label: null,     img: '/10000coin.png' },
] as const;

/**
 * 첫 구매 전용 특가. ₩2,200짜리와 같은 500코인을 절반 값에 준다.
 * 이득이 한눈에 보여야 첫 결제를 넘기므로 일부러 최고 할인보다도 싸게 잡았고,
 * 그래서 계정당 1회로 막는다(실제 차단은 서버에서 한다).
 */
const STARTER_PACK = { coins: 500, price: '₩1,100', amount: 1100 } as const;

const AD_COOLDOWN_MS = 30 * 60 * 1000; // 30분
const AD_STORAGE_KEY = 'lastAdWatchTime';

interface CoinShopModalProps {
    onClose: () => void;
    showToast: (msg: string) => void;
}


const CoinShopModal: React.FC<CoinShopModalProps> = ({ onClose, showToast }) => {
    const { coins, addCoins, applyServerGrant } = useCoins();
    const [adCooldownLeft, setAdCooldownLeft] = useState(0);
    const [adWatching, setAdWatching] = useState(false);
    const [pendingShowAd, setPendingShowAd] = useState<(() => void) | null>(null);
    // null = 아직 모름(깜빡임 방지로 그동안 배너를 숨긴다)
    const [starterPackUsed, setStarterPackUsed] = useState<boolean | null>(null);

    useEffect(() => {
        // auth.currentUser 를 한 번만 읽으면 로그인 처리가 끝나기 전에 상점을 연
        // 사용자에게는 배너가 영영 안 보인다. 상태를 구독해야 한다.
        let cancelled = false;
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (cancelled) return;
            if (!user) { setStarterPackUsed(true); return; }
            getDoc(doc(db, 'users', user.uid))
                .then(snap => { if (!cancelled) setStarterPackUsed(snap.data()?.starterPackUsed === true); })
                // 못 읽었으면 숨긴다 - 서버가 어차피 막으므로 실패할 결제를 띄우는 것보다 낫다.
                .catch(() => { if (!cancelled) setStarterPackUsed(true); });
        });
        return () => { cancelled = true; unsubscribe(); };
    }, []);

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

    const handlePurchase = async (pkg: { coins: number; amount: number }) => {
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

            // 결제 성공 → 서버(Cloud Functions)에서 PortOne API로 실제 결제 여부를
            // 검증한 뒤에만 코인을 지급한다 (클라이언트만 믿고 지급하지 않음)
            const verifyPortOnePayment = httpsCallable<{ paymentId: string }, { coins: number; alreadyProcessed: boolean }>(
                functions,
                'verifyPortOnePayment'
            );
            const result = await verifyPortOnePayment({ paymentId: response.paymentId });
            applyServerGrant(result.data.coins);
            if (pkg.amount === STARTER_PACK.amount) setStarterPackUsed(true);
            showToast(`🪙 ${result.data.coins.toLocaleString()} 코인 지급 완료!`);
            onClose();
        } catch (e) {
            console.error('Payment error:', e);
            showToast('결제 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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

                    {/* 스타터 팩 - 계정당 1회. 이미 샀으면 자리를 비운다 */}
                    {starterPackUsed === false && (
                        <button
                            onClick={() => handlePurchase(STARTER_PACK)}
                            disabled={purchasing}
                            style={{
                                position: 'relative', display: 'block', width: '100%',
                                aspectRatio: '1020 / 510',
                                // 글자를 뷰포트가 아니라 배너 폭에 맞춘다.
                                containerType: 'inline-size',
                                padding: 0, border: 'none', borderRadius: '14px',
                                overflow: 'hidden',
                                backgroundImage: 'url(/images/shop/starterPack.webp)',
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                cursor: purchasing ? 'default' : 'pointer',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                            }}
                        >
                            {/* 그림 왼쪽 아래가 비어 있어 글자를 얹는다 */}
                            <div style={{
                                // 그림에서 리본 아래·상자 왼쪽이 비어 있다. 그 안에만 들어가야 겹치지 않는다.
                                position: 'absolute', left: '5%', right: '50%', bottom: '9%',
                                textAlign: 'left',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25em',
                                    color: '#fde047', fontWeight: 900, fontSize: '5.4cqw',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                                }}>
                                    <CoinImg size={15} />
                                    {STARTER_PACK.coins.toLocaleString()}
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'baseline', gap: '0.4em',
                                    marginTop: '0.25em',
                                }}>
                                    <span style={{
                                        color: 'white', fontWeight: 900, fontSize: '6.4cqw',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                                    }}>{STARTER_PACK.price}</span>
                                    <span style={{
                                        color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontSize: '3.6cqw',
                                        textDecoration: 'line-through',
                                    }}>₩2,200</span>
                                </div>
                                <div style={{
                                    display: 'inline-block', marginTop: '0.4em',
                                    padding: '0.25em 0.7em', borderRadius: '999px',
                                    background: 'linear-gradient(to bottom, #ef4444, #b91c1c)',
                                    color: 'white', fontWeight: 800, fontSize: '3.4cqw',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                }}>50% 할인</div>
                            </div>
                        </button>
                    )}

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
