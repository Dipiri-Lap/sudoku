import React from 'react';
import { X, Volume2, Music } from 'lucide-react';

interface Props {
  bgmVolume: number;
  sfxVolume: number;
  onBgmChange: (v: number) => void;
  onSfxChange: (v: number) => void;
  onClose: () => void;
  onPlayBtnSfx?: () => void;
}

const SnapSpotSettingsModal: React.FC<Props> = ({ bgmVolume, sfxVolume, onBgmChange, onSfxChange, onClose, onPlayBtnSfx }) => (
  <div
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: '1rem',
    }}
    onClick={() => { onPlayBtnSfx?.(); onClose(); }}
  >
    <div
      style={{
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: '16px', width: '100%', maxWidth: '360px',
        padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        position: 'relative', color: 'white',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onPlayBtnSfx?.(); onClose(); }}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', padding: '0.5rem', display: 'flex',
        }}
      >
        <X size={22} />
      </button>

      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>사운드 설정</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* BGM */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={16} color="#f6d365" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>BGM</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(bgmVolume * 100)}%
            </span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={bgmVolume}
            onChange={(e) => onBgmChange(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#f6d365' }}
          />
        </div>

        {/* SFX */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={16} color="#84fab0" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>효과음</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={sfxVolume}
            onChange={(e) => onSfxChange(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#84fab0' }}
          />
        </div>
      </div>
    </div>
  </div>
);

export default SnapSpotSettingsModal;
