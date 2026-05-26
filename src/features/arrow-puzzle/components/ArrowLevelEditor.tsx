import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { LevelData, Direction } from '../data/levels';
import { type Difficulty, DIFFICULTY_CONFIGS, generateLevel, formatLevelTs, extractLevelFromImage } from '../utils/levelGenerator';
import '../styles/ArrowLevelEditor.css';

const DIFFICULTIES: Difficulty[] = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'];

// ── Inline SVG preview ──────────────────────────────────────────────────────

const CS = 44;
const PAD = 14;
const NECK = CS * 0.32;
const CR = CS * 0.42;
const SW = 2.5;

function previewCenter(c: number, r: number): [number, number] {
  return [PAD + c * CS + CS / 2, PAD + r * CS + CS / 2];
}

function dirOff(dir: Direction, amt: number): [number, number] {
  switch (dir) {
    case 'right': return [amt, 0];
    case 'left':  return [-amt, 0];
    case 'up':    return [0, -amt];
    case 'down':  return [0, amt];
  }
}

function buildPath(cells: [number, number][], dir: Direction): string {
  const pts: [number, number][] = cells.map(([c, r]) => previewCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOff(dir, NECK);
  pts.push([hx + dx, hy + dy]);
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i];
    const next = pts[i + 1];
    if (!next) { d += ` L${cx} ${cy}`; continue; }
    const dx1 = cx - px, dy1 = cy - py, l1 = Math.sqrt(dx1*dx1 + dy1*dy1);
    const dx2 = next[0] - cx, dy2 = next[1] - cy, l2 = Math.sqrt(dx2*dx2 + dy2*dy2);
    if (!l1 || !l2) { d += ` L${cx} ${cy}`; continue; }
    const r = Math.min(CR, l1 * .5, l2 * .5);
    d += ` L${cx-(dx1/l1)*r} ${cy-(dy1/l1)*r} Q${cx} ${cy} ${cx+(dx2/l2)*r} ${cy+(dy2/l2)*r}`;
  }
  return d;
}

function buildArrow(head: [number, number], dir: Direction): string {
  const [hx, hy] = previewCenter(head[0], head[1]);
  const [dx, dy] = dirOff(dir, NECK);
  const [nx, ny] = [hx + dx, hy + dy];
  const fwd = CS * 0.26, sp = CS * 0.16;
  switch (dir) {
    case 'right': return `${nx},${ny-sp} ${nx+fwd},${ny} ${nx},${ny+sp}`;
    case 'left':  return `${nx},${ny-sp} ${nx-fwd},${ny} ${nx},${ny+sp}`;
    case 'up':    return `${nx-sp},${ny} ${nx},${ny-fwd} ${nx+sp},${ny}`;
    case 'down':  return `${nx-sp},${ny} ${nx},${ny+fwd} ${nx+sp},${ny}`;
  }
}

const LevelPreview: React.FC<{ level: LevelData }> = ({ level }) => {
  const { gridCols: cols, gridRows: rows, pieces } = level;
  const W = PAD * 2 + cols * CS;
  const H = PAD * 2 + rows * CS;
  return (
    <svg className="ale-preview-svg" viewBox={`0 0 ${W} ${H}`}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const [x, y] = previewCenter(c, r);
          return <circle key={`${c},${r}`} cx={x} cy={y} r={2} fill="rgba(255,255,255,0.12)" />;
        })
      )}
      {pieces.map(p => {
        const head = p.cells[p.cells.length - 1];
        const d = buildPath(p.cells, p.exitDir);
        return (
          <g key={p.id}>
            <path d={d} stroke={p.color} strokeWidth={SW + 3} fill="none"
              strokeLinecap="round" strokeLinejoin="round" opacity={0.2} />
            <path d={d} stroke={p.color} strokeWidth={SW} fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
            <polygon points={buildArrow(head, p.exitDir)} fill={p.color} />
          </g>
        );
      })}
    </svg>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const ArrowLevelEditor: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'generate' | 'image'>('generate');

  // Generate tab
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(5);
  const [numPieces, setNumPieces] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  // Image tab
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('arrowLevelApiKey') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared
  const [level, setLevel] = useState<LevelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applyDifficulty = (d: Difficulty) => {
    const cfg = DIFFICULTY_CONFIGS[d];
    setDifficulty(d);
    setCols(cfg.cols);
    setRows(cfg.rows);
    setNumPieces(Math.round((cfg.minPieces + cfg.maxPieces) / 2));
  };

  const handleColsChange = (v: number) => { setCols(v); setDifficulty(null); };
  const handleRowsChange = (v: number) => { setRows(v); setDifficulty(null); };
  const handlePiecesChange = (v: number) => { setNumPieces(v); setDifficulty(null); };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setLevel(null);
    await new Promise(r => setTimeout(r, 20));
    const result = generateLevel(cols, rows, numPieces);
    if (result) {
      setLevel(result);
    } else {
      setError('레벨 생성 실패 — 파라미터를 조정하거나 다시 시도하세요.');
    }
    setIsGenerating(false);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageMediaType(file.type);
    const reader = new FileReader();
    reader.onload = e => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleExtract = async () => {
    if (!imageDataUrl || !apiKey) return;
    setIsExtracting(true);
    setError(null);
    setLevel(null);
    const base64 = imageDataUrl.split(',')[1];
    try {
      const result = await extractLevelFromImage(base64, imageMediaType, apiKey);
      setLevel(result);
    } catch (e) {
      setError(`추출 실패: ${(e as Error).message}`);
    }
    setIsExtracting(false);
  };

  const handleSaveKey = () => {
    localStorage.setItem('arrowLevelApiKey', apiKey);
  };

  const handleCopy = () => {
    if (!level) return;
    navigator.clipboard.writeText(formatLevelTs(level));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPlay = () => {
    if (!level) return;
    sessionStorage.setItem('arrowTestLevel', JSON.stringify(level));
    navigate('/arrow-puzzle');
  };

  return (
    <div className="ale-page">
      <header className="ale-header">
        <button className="ale-icon-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <span className="ale-title">Arrow Level Editor</span>
        <div style={{ width: 36 }} />
      </header>

      <div className="ale-body">
        {/* ── Left panel ── */}
        <div className="ale-panel">
          <div className="ale-tabs">
            <button className={`ale-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
              자동 생성
            </button>
            <button className={`ale-tab ${tab === 'image' ? 'active' : ''}`} onClick={() => setTab('image')}>
              이미지 추출
            </button>
          </div>

          {tab === 'generate' && (
            <div className="ale-section">
              {/* Difficulty selector */}
              <div className="ale-field-col">
                <label>난이도</label>
                <div className="ale-diff-grid">
                  {DIFFICULTIES.map(d => {
                    const cfg = DIFFICULTY_CONFIGS[d];
                    const isActive = difficulty === d;
                    return (
                      <button
                        key={d}
                        className="ale-diff-btn"
                        onClick={() => applyDifficulty(d)}
                        style={isActive ? { background: `${cfg.color}22`, borderColor: cfg.color, color: cfg.color } : undefined}
                      >
                        <span className="ale-diff-label">{cfg.label}</span>
                        <span className="ale-diff-desc">{cfg.cols}×{cfg.rows}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual overrides */}
              <div className="ale-field-row">
                <label>격자{difficulty === null ? '' : ' (수동)'}</label>
                <div className="ale-num-row">
                  <input type="number" className="ale-num" min={3} max={50} value={cols}
                    onChange={e => handleColsChange(Math.max(3, Math.min(50, +e.target.value)))} />
                  <span>×</span>
                  <input type="number" className="ale-num" min={3} max={50} value={rows}
                    onChange={e => handleRowsChange(Math.max(3, Math.min(50, +e.target.value)))} />
                </div>
              </div>
              <div className="ale-field-row">
                <label>피스 수</label>
                <input type="number" className="ale-num" min={2} max={Math.floor(cols * rows / 2)} value={numPieces}
                  onChange={e => handlePiecesChange(Math.max(2, +e.target.value))} />
              </div>
              <div className="ale-hint">
                피스당 약 {Math.round(cols * rows / numPieces)}칸
              </div>
              <button className="ale-btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? '생성 중...' : '레벨 생성'}
              </button>
            </div>
          )}

          {tab === 'image' && (
            <div className="ale-section">
              <div className="ale-field-col">
                <label>Anthropic API 키</label>
                <div className="ale-key-row">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="ale-input"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onBlur={handleSaveKey}
                  />
                  <button className="ale-icon-btn-sm" onClick={() => setShowKey(v => !v)}>
                    {showKey ? '숨김' : '표시'}
                  </button>
                </div>
              </div>

              <div
                className={`ale-dropzone ${imageDataUrl ? 'has-image' : ''}`}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageDataUrl
                  ? <img src={imageDataUrl} className="ale-drop-img" alt="uploaded" />
                  : <span>클릭 또는 드래그해서 이미지 업로드</span>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

              <button
                className="ale-btn-primary"
                onClick={handleExtract}
                disabled={isExtracting || !imageDataUrl || !apiKey}
              >
                {isExtracting ? 'AI 분석 중...' : '레벨 추출'}
              </button>
              <p className="ale-hint">
                Claude Vision이 경로를 분석합니다. 복잡한 이미지는 수동 수정이 필요할 수 있습니다.
              </p>
            </div>
          )}

          {error && <div className="ale-error">{error}</div>}
        </div>

        {/* ── Right panel: preview ── */}
        <div className="ale-preview-panel">
          {level ? (
            <>
              <div className="ale-preview-wrap">
                <LevelPreview level={level} />
              </div>
              <div className="ale-meta">
                {level.gridCols}×{level.gridRows} · {level.pieces.length}피스
              </div>
            </>
          ) : (
            <div className="ale-empty">레벨을 생성하거나 이미지를 추출하면 미리보기가 표시됩니다</div>
          )}
        </div>
      </div>

      {/* ── Output ── */}
      {level && (
        <div className="ale-output-wrap">
          <div className="ale-output-header">
            <span>levels.ts 에 붙여넣기</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="ale-btn-test" onClick={handleTestPlay}>
                테스트 플레이
              </button>
              <button className="ale-btn-copy" onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '클립보드에 복사'}
              </button>
            </div>
          </div>
          <pre className="ale-output-code">{formatLevelTs(level)}</pre>
        </div>
      )}
    </div>
  );
};

export default ArrowLevelEditor;
