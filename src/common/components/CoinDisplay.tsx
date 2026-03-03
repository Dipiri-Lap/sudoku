import React from 'react';
import { Coins } from 'lucide-react';
import { useCoins } from '../../context/CoinContext';

interface CoinDisplayProps {
    style?: React.CSSProperties;
}

const CoinDisplay: React.FC<CoinDisplayProps> = ({ style }) => {
    const { coins } = useCoins();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '2rem',
            background: 'linear-gradient(135deg, #f6d365, #fda085)',
            color: 'white',
            fontWeight: '900',
            fontSize: '0.9rem',
            boxShadow: '0 2px 6px rgba(253,160,133,0.35)',
            ...style
        }}>
            <Coins size={16} />
            {coins}
        </div>
    );
};

export default CoinDisplay;
