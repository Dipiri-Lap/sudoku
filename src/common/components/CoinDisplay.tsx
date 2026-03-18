import React from 'react';
import { useCoins } from '../../context/CoinContext';

interface CoinDisplayProps {
    style?: React.CSSProperties;
}

const GoldCoinIcon = () => (
    <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #FFD700, #FFA500)',
        border: '3px solid #CC8E00', // Slightly darker border for depth
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.6)',
        position: 'relative',
        zIndex: 2,
        flexShrink: 0
    }}>
        {/* Shine effect */}
        <div style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            width: '30%',
            height: '30%',
            background: 'rgba(255,255,255,0.4)',
            borderRadius: '50%',
            filter: 'blur(1px)'
        }} />
    </div>
);

const CoinDisplay: React.FC<CoinDisplayProps> = ({ style }) => {
    const { coins } = useCoins();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            height: '32px',
            ...style
        }}>
            <GoldCoinIcon />
            <div style={{
                background: 'rgba(255, 245, 220, 0.6)', // Even brighter, more opaque background
                border: '1.5px solid rgba(255, 215, 0, 0.5)', // Golden border
                backdropFilter: 'blur(8px)',
                color: 'white',
                height: '26px', // Slightly taller
                padding: '0 12px 0 20px',
                marginLeft: '-15px',
                borderRadius: '0 6px 6px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '55px',
                fontWeight: '900',
                fontSize: '16px',
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
                letterSpacing: '0.2px',
                zIndex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                {coins}
            </div>
        </div>
    );
};

export default CoinDisplay;
