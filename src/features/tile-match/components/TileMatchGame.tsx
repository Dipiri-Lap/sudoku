import React, { useEffect } from 'react';
import { TileMatchProvider, useTileMatch } from '../context/TileMatchContext';
import { generateLevel, BOARD_WIDTH, BOARD_HEIGHT } from '../constants';
import Tile from './Tile';
import { Crown, RotateCcw, XCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const TileMatchContent: React.FC = () => {
    const { state, dispatch } = useTileMatch();

    useEffect(() => {
        const initialTiles = generateLevel(state.level);
        dispatch({ type: 'START_GAME', tiles: initialTiles });
    }, [dispatch, state.level]);

    const handleReset = () => {
        const newTiles = generateLevel(state.level);
        dispatch({ type: 'START_GAME', tiles: newTiles });
    };

    useEffect(() => {
        if (state.status === 'won') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FF6B6B', '#48DBFB']
            });
        }
    }, [state.status]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '500px',
                marginBottom: '30px',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={24} color="#FFD700" />
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>TILE MATCH</h1>
                </div>
                <button 
                    onClick={handleReset}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    <RotateCcw size={20} />
                </button>
            </header>

            {/* Game Board */}
            <div style={{
                position: 'relative',
                width: `${BOARD_WIDTH * 45}px`,
                height: `${BOARD_HEIGHT * 45}px`,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                marginBottom: '40px',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)'
            }}>
                {state.tiles
                    .filter(t => t.status === 'board')
                    .map(tile => (
                        <Tile 
                            key={tile.id}
                            {...tile}
                            onClick={() => dispatch({ type: 'SELECT_TILE', tileId: tile.id })}
                        />
                    ))
                }
            </div>

            {/* Selection Tray */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '70px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 15px',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
                position: 'relative'
            }}>
                {state.tray.map((tile, idx) => (
                    <div 
                        key={`${tile.id}-${idx}`}
                        style={{
                            width: '42px',
                            height: '52px',
                            background: 'white',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            color: '#333',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                            animation: 'tray-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards'
                        }}
                    >
                        {tile.type}
                    </div>
                ))}
                {/* Empty slots placeholders */}
                {Array.from({ length: 7 - state.tray.length }).map((_, i) => (
                    <div 
                        key={`empty-${i}`}
                        style={{
                            width: '42px',
                            height: '52px',
                            background: 'rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            border: '1px dashed rgba(255,255,255,0.2)'
                        }}
                    />
                ))}
            </div>

            {/* Overlays */}
            {state.status === 'won' && (
                <div className="overlay" style={overlayStyle}>
                    <Sparkles size={60} color="#FFD700" />
                    <h2>CLEAR!</h2>
                    <button onClick={handleReset} style={buttonStyle}>NEXT LEVEL</button>
                </div>
            )}

            {state.status === 'gameover' && (
                <div className="overlay" style={overlayStyle}>
                    <XCircle size={60} color="#FF6B6B" />
                    <h2>GAME OVER</h2>
                    <button onClick={handleReset} style={buttonStyle}>RETRY</button>
                </div>
            )}

            <style>{`
                @keyframes tray-in {
                    from { transform: scale(0.5) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                }
            `}</style>
        </div>
    );
};

const overlayStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
};

const buttonStyle: React.CSSProperties = {
    background: '#FFD700',
    color: '#333',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '30px',
    fontSize: '1.1rem',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #b8860b'
};

const TileMatchGame: React.FC = () => (
    <TileMatchProvider>
        <TileMatchContent />
    </TileMatchProvider>
);

export default TileMatchGame;
