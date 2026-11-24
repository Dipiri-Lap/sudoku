import React, { useState } from 'react';
import { Globe, HelpCircle, Mail, Music, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { isMusicMuted, isMuted, setMusicMuted, setMuted } from '../ui/sound';
import { ModalShell } from './Lobby';

/**
 * 설정: 효과음 · 배경음악은 바로 동작한다.
 * 진동 · 언어 · 도움말 · 문의는 자리만 잡아 두었다(누르면 "준비 중").
 * 개발 서버에서는 진행 초기화(레벨 1로)도 보인다.
 */
const SettingsModal: React.FC<{
  onClose: () => void;
  onReset: () => void;
  /** 개발용: 별 받기 · 농장 다음 단계 바로 열기 */
  onDevStars?: () => void;
  onDevBuildAll?: () => void;
  onDevRipen?: () => void;
}> = ({ onClose, onReset, onDevStars, onDevBuildAll, onDevRipen }) => {
  const [sfxOff, setSfxOff] = useState(isMuted);
  const [musicOff, setMusicOff] = useState(isMusicMuted);
  const [note, setNote] = useState<string | null>(null);

  return (
    <ModalShell onClose={onClose}>
      <h2>설정</h2>
      <div className="jk-modal-toggles">
        <button
          className={`jk-toggle${sfxOff ? '' : ' on'}`}
          onClick={() => {
            setMuted(!sfxOff);
            setSfxOff(!sfxOff);
          }}
        >
          {sfxOff ? <VolumeX size={20} /> : <Volume2 size={20} />} 효과음
        </button>
        <button
          className={`jk-toggle${musicOff ? '' : ' on'}`}
          onClick={() => {
            setMusicMuted(!musicOff);
            setMusicOff(!musicOff);
          }}
        >
          <Music size={20} /> 배경음악
        </button>
      </div>
      <div className="pg-settings-list">
        {[
          { icon: <Smartphone size={20} />, label: '진동' },
          { icon: <Globe size={20} />, label: '언어 · 한국어' },
          { icon: <HelpCircle size={20} />, label: '도움말' },
          { icon: <Mail size={20} />, label: '문의하기' },
        ].map(row => (
          <button key={row.label} className="pg-settings-row" onClick={() => setNote(row.label)}>
            {row.icon}
            <span>{row.label}</span>
          </button>
        ))}
      </div>
      {note && <p className="pg-settings-note">{note}: 준비 중이에요</p>}
      {import.meta.env.DEV && (
        <div className="jk-modal-actions">
          {onDevStars && (
            <button
              onClick={() => {
                onDevStars();
                onClose();
              }}
            >
              별 10개 받기 · 개발용
            </button>
          )}
          {onDevBuildAll && (
            <button
              onClick={() => {
                onDevBuildAll();
                onClose();
              }}
            >
              농장 다음 단계 바로 열기 · 개발용
            </button>
          )}
          {onDevRipen && (
            <button
              onClick={() => {
                onDevRipen();
                onClose();
              }}
            >
              심은 작물 다 익히기 · 개발용
            </button>
          )}
          <button
            className="danger"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            진행 초기화(레벨 1로) · 개발용
          </button>
        </div>
      )}
      <small className="pg-version">Pop Garden v0.1</small>
    </ModalShell>
  );
};

export default SettingsModal;
