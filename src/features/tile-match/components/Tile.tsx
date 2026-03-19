import React from 'react';

/**
 * Tile Component
 * Premium 3D look with glassmorphism and smooth transitions
 */

interface TileProps {
    type: string;
    x: number;
    y: number;
    z: number;
    isBlocked: boolean;
    status: 'board' | 'tray' | 'cleared';
    onClick: () => void;
}

const Tile: React.FC<TileProps> = ({ type, x, y, z, isBlocked, status, onClick }) => {
    // Basic scaling for a grid-like layout
    const unit = 45;
    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${y * unit}px`,
        left: `${x * unit}px`,
        width: `${unit - 2}px`,
        height: `${unit * 1.2}px`,
        zIndex: z + 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        cursor: isBlocked ? 'default' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
        
        // 3D Effect / Tile styling
        background: isBlocked ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: '6px',
        boxShadow: isBlocked 
            ? '0 2px 4px rgba(0,0,0,0.1)' 
            : `0 ${3 + z}px 0 rgba(180, 180, 180, 1), 0 8px 15px rgba(0,0,0,0.15)`,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        transform: isBlocked ? `translateY(${-z * 2}px) scale(0.98)` : `translateY(${-z * 3}px)`,
        filter: isBlocked ? 'brightness(0.7) grayscale(0.5)' : 'none',
    };

    if (status === 'cleared') return null;

    return (
        <div 
            style={style} 
            onClick={isBlocked ? undefined : onClick}
            className="tile-match-tile"
        >
            <span style={{ transform: 'translateY(-2px)' }}>{type}</span>
            {/* Subtle highlight to enhance 3D feel */}
            {!isBlocked && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    right: '2px',
                    height: '40%',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)',
                    borderRadius: '4px',
                    pointerEvents: 'none'
                }} />
            )}
        </div>
    );
};

export default Tile;
