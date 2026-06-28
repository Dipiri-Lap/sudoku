import React, { useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import {
  useSnapSpotMarker,
  markerDesigns,
  MARKER_GRADE_CONFIG,
  getMarkerContent,
  type MarkerDesign,
  type MarkerGrade,
} from '../context/SnapSpotMarkerContext';
import { useCoins } from '../../../context/CoinContext';

const GRADE_ORDER: MarkerGrade[] = ['common', 'rare', 'elite', 'unique', 'epic', 'legendary'];

const CoinImg = ({ size = 16 }: { size?: number }) => (
  <img src="/coin_Icon.png" alt="coin" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
);

function MarkerPreview({ markerId, size = 44 }: { markerId: string; size?: number }) {
  return (
    <div
      className={`snapspot-marker-preview snapspot-marker-${markerId}`}
      style={{ width: size, height: size }}
    >
      {getMarkerContent(markerId)}
    </div>
  );
}

interface Props { onClose: () => void; onPlayBtnSfx?: () => void; }

const SnapSpotMarkerShopModal: React.FC<Props> = ({ onClose, onPlayBtnSfx }) => {
  const { selectedMarkerId, hasUnlocked, unlockMarker, selectMarker } = useSnapSpotMarker();
  const { coins } = useCoins();
  const [confirmDesign, setConfirmDesign] = useState<MarkerDesign | null>(null);

  const handleAction = (design: MarkerDesign) => {
    onPlayBtnSfx?.();
    if (hasUnlocked(design.id)) {
      selectMarker(design.id);
    } else {
      const cost = MARKER_GRADE_CONFIG[design.grade].cost;
      if (cost === 0) {
        unlockMarker(design.id);
      } else if (coins >= cost) {
        setConfirmDesign(design);
      }
    }
  };

  const handleConfirmUnlock = async () => {
    if (!confirmDesign) return;
    onPlayBtnSfx?.();
    await unlockMarker(confirmDesign.id);
    setConfirmDesign(null);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#1e293b', borderRadius: '20px',
        width: '100%', maxWidth: '420px', maxHeight: '90vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'relative', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(168,85,247,0.15))',
        }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>
            🎨 마커 상점
          </h2>
          <button onClick={() => { onPlayBtnSfx?.(); onClose(); }} style={{
            position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer',
          }}>
            <X size={22} />
          </button>
        </div>

        {/* Coin row */}
        <div style={{ padding: '0.75rem 1.25rem', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 1rem', backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>보유 코인</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CoinImg size={16} />
              <span style={{ color: '#fde047', fontWeight: 800, fontSize: '1rem' }}>{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Grade sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {GRADE_ORDER.map(grade => {
            const cfg = MARKER_GRADE_CONFIG[grade];
            const items = markerDesigns.filter(d => d.grade === grade);
            return (
              <div key={grade}>
                {/* Grade divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${cfg.color}60, transparent)` }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {cfg.cost === 0
                      ? <span style={{ color: '#4ade80' }}>FREE</span>
                      : <><CoinImg size={12} />{cfg.cost}</>
                    }
                  </span>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${cfg.color}60, transparent)` }} />
                </div>

                {/* 3-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {items.map(design => {
                    const unlocked = hasUnlocked(design.id);
                    const isSelected = selectedMarkerId === design.id;
                    const canAfford = cfg.cost === 0 || coins >= cfg.cost;

                    return (
                      <div
                        key={design.id}
                        onClick={() => handleAction(design)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '14px',
                          padding: '0.75rem 0.5rem',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                          cursor: unlocked || canAfford ? 'pointer' : 'not-allowed',
                          position: 'relative',
                          transition: 'background 0.15s, border 0.15s',
                        }}
                      >
                        {/* Marker preview */}
                        <div style={{
                          width: 56, height: 56,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.07)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                          opacity: unlocked ? 1 : 0.35,
                        }}>
                          <MarkerPreview markerId={design.id} size={44} />
                          {!unlocked && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Lock size={16} color="white" strokeWidth={2.5} />
                            </div>
                          )}
                          {isSelected && (
                            <div style={{
                              position: 'absolute', top: -2, right: -2,
                              width: 16, height: 16, borderRadius: '50%',
                              background: '#4ade80', border: '2px solid #1e293b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Check size={9} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div style={{
                          fontSize: '0.68rem', fontWeight: 700,
                          color: isSelected ? '#4ade80' : unlocked ? '#94a3b8' : canAfford ? '#fde047' : '#475569',
                          display: 'flex', alignItems: 'center', gap: '2px',
                        }}>
                          {isSelected
                            ? '적용됨'
                            : unlocked
                              ? '선택'
                              : cfg.cost === 0
                                ? '무료'
                                : <><CoinImg size={11} />{cfg.cost}</>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm unlock modal */}
      {confirmDesign && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: '20px', padding: '1.75rem 1.5rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
            width: '240px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>잠금 해제</span>
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MarkerPreview markerId={confirmDesign.id} size={52} />
            </div>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}>
              {confirmDesign.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '0.88rem', textAlign: 'center' }}>
              <CoinImg size={16} />
              <span>{MARKER_GRADE_CONFIG[confirmDesign.grade].cost} 코인을 사용하시겠습니까?</span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', width: '100%' }}>
              <button onClick={() => { onPlayBtnSfx?.(); setConfirmDesign(null); }} style={{
                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}>취소</button>
              <button onClick={handleConfirmUnlock} style={{
                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #f6d365, #fda085)',
                color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapSpotMarkerShopModal;
