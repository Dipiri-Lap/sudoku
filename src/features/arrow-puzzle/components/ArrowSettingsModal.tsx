import React, { useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { getSfxVolume, setSfxVolume, playEscapeSfx } from '../utils/sound';

interface Props {
  onClose: () => void;
}

const ArrowSettingsModal: React.FC<Props> = ({ onClose }) => {
  const [sfxVol, setSfxVol] = useState(getSfxVolume);

  return (
    <div className="ap-settings-backdrop" onClick={onClose}>
      <div className="ap-settings" onClick={e => e.stopPropagation()}>
        <button className="ap-settings-close" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <h3>설정</h3>

        <div className="ap-vol-row">
          <span className="ap-vol-icon">{sfxVol > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}</span>
          <span className="ap-vol-name">효과음</span>
          <span className="ap-vol-value">{Math.round(sfxVol * 100)}%</span>
        </div>
        <input
          className="ap-vol-slider"
          type="range" min={0} max={1} step={0.05}
          value={sfxVol}
          onChange={e => {
            const v = parseFloat(e.target.value);
            setSfxVol(v);
            setSfxVolume(v);
            // 움직이는 즉시 크기를 귀로 확인할 수 있게 한 번 들려준다
            if (v > 0) playEscapeSfx();
          }}
        />
      </div>
    </div>
  );
};

export default ArrowSettingsModal;
