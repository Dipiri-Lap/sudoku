import React from 'react';
import { X, Check } from 'lucide-react';
import { ARROW_CONCEPTS, type ArrowConcept } from '../hooks/useArrowConcept';

interface Props {
  concept: ArrowConcept;
  onSelect: (c: ArrowConcept) => void;
  onClose: () => void;
}

const ConceptPreview: React.FC<{ id: ArrowConcept }> = ({ id }) => {
  if (id === 'mono') {
    return (
      <div style={{
        width: 58, height: 58, borderRadius: 10, flexShrink: 0,
        background: '#111', border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>➜</span>
      </div>
    );
  }
  if (id === 'way-tile') {
    return (
      <div style={{
        width: 58, height: 58, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #22375c, #1a2b4a)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src="/images/arrow-puzzle/icon.png"
          alt="ArrowWay Tile"
          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
        />
      </div>
    );
  }
  return (
    <img
      src="/images/arrow-puzzle/icon.png"
      alt="ArrowWay"
      style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
    />
  );
};

const ArrowConceptShopModal: React.FC<Props> = ({ concept, onSelect, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e293b', borderRadius: '20px',
          width: '100%', maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '1rem 1.25rem', textAlign: 'center', position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(96,165,250,0.15))',
        }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>컨셉 상점</h2>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {ARROW_CONCEPTS.map(c => {
            const selected = c.id === concept;
            return (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                  padding: '0.75rem', borderRadius: 14, textAlign: 'left',
                  background: selected ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                  border: selected ? '1.5px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                <ConceptPreview id={c.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>{c.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: 2 }}>{c.desc}</div>
                </div>
                {selected && (
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="#1e293b" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ArrowConceptShopModal;
