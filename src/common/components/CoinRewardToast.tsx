import React, { useEffect, useState } from 'react';
import { useCoins } from '../../context/CoinContext';

const CoinRewardToast: React.FC = () => {
    const { pendingReward, clearPendingReward } = useCoins();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (pendingReward === null) return;
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(clearPendingReward, 400);
        }, 2200);
        return () => clearTimeout(timer);
    }, [pendingReward]);

    if (pendingReward === null) return null;

    return (
        <>
            <style>{`
                @keyframes coinToastSlideUp {
                    0% { transform: translateX(-50%) translateY(40px); opacity: 0; }
                    15% { transform: translateX(-50%) translateY(0); opacity: 1; }
                    80% { transform: translateX(-50%) translateY(0); opacity: 1; }
                    100% { transform: translateX(-50%) translateY(40px); opacity: 0; }
                }
                .coin-toast-enter {
                    animation: coinToastSlideUp 2.6s ease forwards;
                }
            `}</style>
            <div
                className={visible ? 'coin-toast-enter' : ''}
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #f6d365, #fda085)',
                    color: 'white',
                    fontWeight: '900',
                    fontSize: '1.1rem',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '2rem',
                    boxShadow: '0 4px 16px rgba(253,160,133,0.5)',
                    zIndex: 1500,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    pointerEvents: 'none',
                }}
            >
                🪙 +{pendingReward} 코인
            </div>
        </>
    );
};

export default CoinRewardToast;
