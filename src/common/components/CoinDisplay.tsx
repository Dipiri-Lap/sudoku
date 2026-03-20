import React from 'react';
import { useCoins } from '../../context/CoinContext';

interface CoinDisplayProps {
    style?: React.CSSProperties;
    onClick?: () => void;
}

const GoldCoinIcon = () => (
    <img
        src="/coin_Icon.png"
        alt="coin"
        style={{ width: '40px', height: '40px', objectFit: 'contain', position: 'relative', zIndex: 2, flexShrink: 0 }}
    />
);

const CoinDisplay: React.FC<CoinDisplayProps> = ({ style, onClick }) => {
    const { coins } = useCoins();

    return (
        <div onClick={onClick} style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            height: '40px',
            cursor: onClick ? 'pointer' : 'default',
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
                marginLeft: '-19px',
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
