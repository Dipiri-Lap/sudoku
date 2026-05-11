import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLevel, generateDoubleLevel, type GeneratedLevel } from '../utils/generator';
import '../styles/QueensGame.css';
import '../styles/QueensGenerator.css';

type Status = 'idle' | 'generating' | 'done' | 'failed';

const QueensGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [size, setSize] = useState(7);
  const [isDouble, setIsDouble] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<GeneratedLevel | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [levelName, setLevelName] = useState('');

  const handleGenerate = async () => {
    setStatus('generating');
    setResult(null);
    setShowSolution(false);
    setLevelName('');
    await new Promise(r => setTimeout(r, 30));
    const level = isDouble ? generateDoubleLevel(size) : generateLevel(size);
    if (level) {
      setResult(level);
      setStatus('done');
    } else {
      setStatus('failed');
    }
  };

  // JSON for levels.json (without internal solution field)
  const exportJson = result
    ? JSON.stringify({
        id: result.id,
        name: levelName || result.name,
        size: result.size,
        ...(result.queensPerColor && result.queensPerColor > 1 ? { queensPerColor: result.queensPerColor } : {}),
        grid: result.grid,
        colors: result.colors,
      }, null, 2)
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="qgen-page">
      <div className="qgen-header">
        <button onClick={() => navigate('/')}>← 홈</button>
        <h1>Queens 레벨 생성기</h1>
      </div>

      <div className="qgen-controls">
        <div className="qgen-size-row">
          <span>크기</span>
          {[5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              className={`qgen-size-btn${size === n ? ' active' : ''}`}
              onClick={() => setSize(n)}
            >
              {n}×{n}
            </button>
          ))}
        </div>

        <div className="qgen-size-row">
          <span>모드</span>
          <button
            className={`qgen-size-btn${!isDouble ? ' active' : ''}`}
            onClick={() => setIsDouble(false)}
          >
            일반
          </button>
          <button
            className={`qgen-size-btn${isDouble ? ' active' : ''}`}
            onClick={() => setIsDouble(true)}
          >
            더블
          </button>
        </div>

        <button
          className="qgen-generate-btn"
          onClick={handleGenerate}
          disabled={status === 'generating'}
        >
          {status === 'generating' ? '생성 중...' : '생성하기'}
        </button>
      </div>

      {status === 'failed' && (
        <p className="qgen-fail">
          유일 해를 가진 맵 생성에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}

      {status === 'idle' && (
        <p className="qgen-hint">크기를 선택하고 생성 버튼을 눌러주세요.</p>
      )}

      {result && status === 'done' && (
        <div className="qgen-result">

          <div className="qgen-stats">
            {result.size}×{result.size} · 색상 {result.size}개
            {result.queensPerColor && result.queensPerColor > 1 ? ` · 색상당 퀸 ${result.queensPerColor}개 (더블)` : ''}
            {' · '}유일 해 검증 완료
          </div>

          <div className="qgen-board-wrapper">
            <div
              className="queens-board-container"
              style={{
                width: `min(${result.size * 54}px, calc(100vw - 4rem))`,
                height: `min(${result.size * 54}px, calc(100vw - 4rem))`,
                aspectRatio: '1 / 1',
              }}
            >
              <div
                className="queens-board"
                style={{
                  gridTemplateColumns: `repeat(${result.size}, 1fr)`,
                  gridTemplateRows: `repeat(${result.size}, 1fr)`,
                }}
              >
                {result.grid.map((row, r) =>
                  row.map((colorIdx, c) => {
                    const k = result.queensPerColor ?? 1;
                    const isQueen = showSolution && Array.from({ length: k }, (_, s) => result.solution[colorIdx * k + s])
                      .some(pos => pos && pos[0] === r && pos[1] === c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="queens-cell"
                        style={{ backgroundColor: result.colors[colorIdx] }}
                      >
                        {isQueen && <span className="cell-queen">♛</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="qgen-actions">
            <button
              className="qgen-solution-btn"
              onClick={() => setShowSolution(s => !s)}
            >
              {showSolution ? '정답 숨기기' : '정답 보기'}
            </button>
            <button className="qgen-copy-btn" onClick={handleCopy}>
              {copied ? '✓ 복사됨!' : 'JSON 복사'}
            </button>
          </div>

          <div className="qgen-json-section">
            <div className="qgen-json-label">
              <span>levels.json 에 붙여넣기</span>
              <input
                type="text"
                placeholder="레벨 이름 (예: 레벨 2)"
                value={levelName}
                onChange={e => setLevelName(e.target.value)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.78rem',
                  outline: 'none',
                  width: '180px',
                }}
              />
            </div>
            <textarea
              className="qgen-json"
              readOnly
              value={exportJson}
              rows={result.size + 8}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QueensGenerator;
