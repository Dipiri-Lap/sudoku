import React from 'react';
import { X, Volume2, Music, Type } from 'lucide-react';
import { useWordSortUI } from '../context/WordSortUIContext';

interface WordSortSettingsModalProps {
    onClose: () => void;
}

const WordSortSettingsModal: React.FC<WordSortSettingsModalProps> = ({ onClose }) => {
    const { bgmVolume, setBgmVolume, sfxVolume, setSfxVolume, textSizeMultiplier, setTextSizeMultiplier } = useWordSortUI();

    const TEXT_SIZE_STEPS = [0.8, 0.95, 1.1, 1.25, 1.4];
    const TEXT_SIZE_LABELS = ['가', '가', '가', '가', '가'];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '1rem'
        }}
        onClick={onClose}
        >
            <div style={{
                background: 'linear-gradient(145deg, #2a2c42, #1f2133)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                position: 'relative',
                color: 'white',
                fontFamily: "'Inter', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 'bold' }}>설정</h2>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>게임 환경을 내 취향에 맞게 조절하세요</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* BGM Volume */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px', 
                                background: 'rgba(255, 255, 255, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Music size={18} color="#f6d365" />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>배경음악 (BGM)</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(bgmVolume * 100)}%
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05"
                            value={bgmVolume}
                            onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                            style={{
                                width: '100%',
                                cursor: 'pointer',
                                accentColor: '#f6d365'
                            }}
                        />
                    </div>

                    {/* SFX Volume */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px', 
                                background: 'rgba(255, 255, 255, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Volume2 size={18} color="#84fab0" />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>효과음 (SFX)</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(sfxVolume * 100)}%
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05"
                            value={sfxVolume}
                            onChange={(e) => {
                                const newVol = parseFloat(e.target.value);
                                setSfxVolume(newVol);
                                if (newVol > 0) {
                                    // Play test sound
                                    const testSfx = new Audio('/assets/word-sort/sounds/cardsfx1.wav');
                                    testSfx.volume = newVol;
                                    testSfx.play().catch(() => {});
                                }
                            }}
                            style={{
                                width: '100%',
                                cursor: 'pointer',
                                accentColor: '#84fab0'
                            }}
                        />
                    </div>

                    {/* Text Size */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Type size={18} color="#a78bfa" />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>텍스트 크기</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                            {TEXT_SIZE_STEPS.map((step, i) => {
                                const isActive = Math.abs(textSizeMultiplier - step) < 0.01;
                                const labelSize = `${0.75 + i * 0.15}rem`;
                                return (
                                    <button
                                        key={step}
                                        onClick={() => setTextSizeMultiplier(step)}
                                        style={{
                                            flex: 1,
                                            height: '48px',
                                            borderRadius: '10px',
                                            border: isActive ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                                            background: isActive ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                                            fontSize: labelSize,
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {TEXT_SIZE_LABELS[i]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WordSortSettingsModal;
