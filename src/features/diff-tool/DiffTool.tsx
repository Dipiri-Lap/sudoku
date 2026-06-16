import React, { useState, useCallback } from 'react';

const IMG_W = 1020;
const IMG_H = 770;
const HALF_W = IMG_W / 2;
const HALF_H = IMG_H / 2;

interface Spot {
  x: number;
  y: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

function getScaledImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H);
  return ctx.getImageData(0, 0, IMG_W, IMG_H);
}

/** Direct pixel comparison — returns binary mask (1 = different, 0 = same) */
function buildDiffMask(a: ImageData, b: ImageData, threshold: number): Uint8Array {
  const mask = new Uint8Array(IMG_W * IMG_H);
  const t = threshold * 255 * Math.sqrt(3); // Euclidean RGB distance cutoff
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    const dr = a.data[i * 4]     - b.data[i * 4];
    const dg = a.data[i * 4 + 1] - b.data[i * 4 + 1];
    const db = a.data[i * 4 + 2] - b.data[i * 4 + 2];
    mask[i] = Math.sqrt(dr * dr + dg * dg + db * db) > t ? 1 : 0;
  }
  return mask;
}

/** Render diff mask as a red-on-black image, return data URL */
function maskToDataUrl(mask: Uint8Array): string {
  const canvas = document.createElement('canvas');
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(IMG_W, IMG_H);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    if (mask[i]) {
      out.data[i * 4]     = 255;
      out.data[i * 4 + 1] = 60;
      out.data[i * 4 + 2] = 60;
      out.data[i * 4 + 3] = 255;
    } else {
      out.data[i * 4 + 3] = 40; // dark transparent background
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL();
}

function detectSpots(mask: Uint8Array, minPx: number, mergeRadius: number): Spot[] {
  const visited = new Uint8Array(IMG_W * IMG_H);
  const raw: Spot[] = [];

  for (let i = 0; i < IMG_W * IMG_H; i++) {
    if (visited[i] || !mask[i]) continue;

    const stack = [i];
    visited[i] = 1;
    let sumX = 0, sumY = 0, count = 0;

    while (stack.length) {
      const idx = stack.pop()!;
      const px = idx % IMG_W;
      const py = Math.floor(idx / IMG_W);
      sumX += px; sumY += py; count++;

      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= IMG_W || ny >= IMG_H) continue;
        const ni = ny * IMG_W + nx;
        if (visited[ni] || !mask[ni]) continue;
        visited[ni] = 1;
        stack.push(ni);
      }
    }

    if (count < minPx) continue;
    raw.push({ x: sumX / count - HALF_W, y: HALF_H - sumY / count });
  }

  // Merge nearby cluster centroids
  const used = new Array(raw.length).fill(false);
  const merged: Spot[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (used[i]) continue;
    const group = [raw[i]];
    used[i] = true;
    for (let j = i + 1; j < raw.length; j++) {
      if (used[j]) continue;
      const dx = raw[i].x - raw[j].x;
      const dy = raw[i].y - raw[j].y;
      if (dx * dx + dy * dy < mergeRadius * mergeRadius) {
        group.push(raw[j]);
        used[j] = true;
      }
    }
    merged.push({
      x: Math.round(group.reduce((s, p) => s + p.x, 0) / group.length),
      y: Math.round(group.reduce((s, p) => s + p.y, 0) / group.length),
    });
  }
  return merged;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const BTN: React.CSSProperties = {
  border: 'none', borderRadius: '6px', padding: '0.5rem 1.1rem',
  cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
};
const NUM_INPUT: React.CSSProperties = {
  background: '#222', color: '#fff', border: '1px solid #444',
  borderRadius: '4px', padding: '0.25rem 0.4rem',
};

// ── Component ─────────────────────────────────────────────────────────────────
export const DiffTool: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [urlA, setUrlA]   = useState<string | null>(null);
  const [urlB, setUrlB]   = useState<string | null>(null);

  const [spots, setSpots]       = useState<Spot[]>([]);
  const [diffUrl, setDiffUrl]   = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);

  const [colSize,      setColSize]      = useState(120);
  const [threshold,    setThreshold]    = useState(0.1);
  const [minPx,        setMinPx]        = useState(30);
  const [mergeRadius,  setMergeRadius]  = useState(80);
  const [imageID,      setImageID]      = useState(1);

  const [step,      setStep]      = useState<'upload' | 'review'>('upload');
  const [analyzing, setAnalyzing] = useState(false);

  const pickFile = useCallback((idx: 0 | 1) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      if (idx === 0) { setFileA(f); setUrlA(url); }
      else           { setFileB(f); setUrlB(url); }
    };
    input.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, idx: 0 | 1) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    if (idx === 0) { setFileA(f); setUrlA(url); }
    else           { setFileB(f); setUrlB(url); }
  }, []);

  const runAnalysis = async (fA: File, fB: File) => {
    setAnalyzing(true);
    try {
      const [imgA, imgB] = await Promise.all([loadImage(fA), loadImage(fB)]);
      const dataA = getScaledImageData(imgA);
      const dataB = getScaledImageData(imgB);
      const mask = buildDiffMask(dataA, dataB, threshold);
      setDiffUrl(maskToDataUrl(mask));
      setSpots(detectSpots(mask, minPx, mergeRadius));
      setStep('review');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyze = () => { if (fileA && fileB) runAnalysis(fileA, fileB); };

  // Re-run analysis from review step with current params
  const reAnalyze = () => { if (fileA && fileB) runAnalysis(fileA, fileB); };

  const addSpot = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top)  / rect.height;
    setSpots(prev => [...prev, {
      x: Math.round(px * IMG_W - HALF_W),
      y: Math.round(HALF_H - py * IMG_H),
    }]);
  };

  const removeSpot = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpots(prev => prev.filter((_, idx) => idx !== i));
  };

  const exportJSON = () => {
    const json = JSON.stringify({
      imageID,
      differences: spots.map(s => ({
        topPosition:    { x: s.x, y: s.y },
        bottomPosition: { x: s.x, y: s.y },
        colSize: { x: colSize, y: colSize },
      })),
    }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(imageID).padStart(4, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const spotOverlay = (enableClick: boolean) =>
    spots.map((s, i) => {
      const left = (s.x + HALF_W) / IMG_W * 100;
      const top  = (HALF_H - s.y) / IMG_H * 100;
      const w    = colSize / IMG_W * 100;
      const h    = colSize / IMG_H * 100;
      return (
        <div
          key={i}
          title={enableClick ? `#${i + 1} (${s.x}, ${s.y}) — 클릭 삭제` : undefined}
          onClick={enableClick ? (e) => removeSpot(i, e) : undefined}
          style={{
            position: 'absolute',
            left: `${left}%`, top: `${top}%`,
            width: `${w}%`, paddingBottom: `${h}%`,
            transform: 'translate(-50%, -50%)',
            border: '3px solid #ff4444',
            borderRadius: '50%',
            background: 'rgba(255,68,68,0.2)',
            cursor: enableClick ? 'pointer' : 'default',
            pointerEvents: enableClick ? 'auto' : 'none',
            boxSizing: 'border-box',
          }}
        >
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff4444', fontWeight: 'bold', fontSize: '0.75rem', userSelect: 'none',
          }}>
            {i + 1}
          </span>
        </div>
      );
    });

  // ── Upload step ──────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div style={{ minHeight: '100vh', background: '#111', color: '#fff', padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.4rem' }}>SnapSpot Diff Tool</h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.88rem' }}>
          두 이미지를 업로드하면 차이점을 자동 감지하고 JSON을 생성합니다.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {(['원본 이미지', '변경 이미지'] as const).map((label, idx) => {
            const url = idx === 0 ? urlA : urlB;
            return (
              <div
                key={idx}
                style={{
                  flex: 1, border: '2px dashed #444', borderRadius: '8px', padding: '1rem',
                  textAlign: 'center', cursor: 'pointer', minHeight: '180px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem',
                  background: url ? '#1a1a1a' : 'transparent',
                }}
                onClick={() => pickFile(idx as 0 | 1)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, idx as 0 | 1)}
              >
                {url
                  ? <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '4px' }} />
                  : <>
                      <div style={{ fontSize: '2rem', opacity: 0.4 }}>🖼</div>
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>드래그 또는 클릭</div>
                    </>
                }
              </div>
            );
          })}
        </div>

        {/* Params */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Threshold', val: threshold, min: 0.01, max: 0.5,  step: 0.01, set: setThreshold, float: true,  hint: '낮을수록 민감 (0.05~0.15 권장)' },
            { label: 'Min pixels', val: minPx,   min: 5,    max: 500,  step: 5,    set: setMinPx,     float: false, hint: '이하 클러스터 무시 (노이즈 제거)' },
            { label: 'Merge radius', val: mergeRadius, min: 20, max: 300, step: 10, set: setMergeRadius, float: false, hint: '이내 클러스터 병합 (Unity 단위)' },
          ].map(({ label, val, min, max, step: s, set, float, hint }) => (
            <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {label}: <span style={{ color: '#4a90e2' }}>{val}</span>
              </span>
              <input
                type="range" min={min} max={max} step={s} value={val}
                onChange={e => (set as (v: number) => void)(float ? parseFloat(e.target.value) : parseInt(e.target.value))}
                style={{ width: '180px' }}
              />
              <span style={{ color: '#555', fontSize: '0.75rem' }}>{hint}</span>
            </label>
          ))}
        </div>

        <button
          disabled={!fileA || !fileB || analyzing}
          onClick={analyze}
          style={{ ...BTN, background: fileA && fileB ? '#4a90e2' : '#2a2a2a', color: '#fff', padding: '0.75rem 2rem', fontSize: '1rem', opacity: analyzing ? 0.7 : 1 }}
        >
          {analyzing ? '분석 중…' : '차이점 감지'}
        </button>
      </div>
    );
  }

  // ── Review step ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#111', color: '#fff', padding: '1.25rem', fontFamily: 'sans-serif' }}>
      {/* Toolbar row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        <button onClick={() => setStep('upload')} style={{ ...BTN, background: '#333', color: '#fff' }}>
          ← 다시 업로드
        </button>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>감지 결과 — {spots.length}개 차이점</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#aaa' }}>
            Image ID:
            <input type="number" value={imageID} min={1} style={{ ...NUM_INPUT, width: '60px' }}
              onChange={e => setImageID(parseInt(e.target.value) || 1)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#aaa' }}>
            ColSize:
            <input type="number" value={colSize} min={20} style={{ ...NUM_INPUT, width: '70px' }}
              onChange={e => setColSize(parseInt(e.target.value) || 120)} />
          </label>
          <button onClick={exportJSON} style={{ ...BTN, background: '#4a90e2', color: '#fff' }}>
            JSON 다운로드
          </button>
        </div>
      </div>

      {/* Toolbar row 2 — re-analyze params */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginBottom: '0.75rem', flexWrap: 'wrap', padding: '0.6rem 0.75rem', background: '#1a1a1a', borderRadius: '8px' }}>
        {[
          { label: 'Threshold', val: threshold, min: 0.01, max: 0.5,  step: 0.01, set: setThreshold, float: true },
          { label: 'Min px',    val: minPx,     min: 5,    max: 500,  step: 5,    set: setMinPx,     float: false },
          { label: 'Merge r',   val: mergeRadius,min: 20,  max: 300,  step: 10,   set: setMergeRadius,float: false },
        ].map(({ label, val, min, max, step: s, set, float }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <span style={{ color: '#aaa', whiteSpace: 'nowrap' }}>{label}: <b style={{ color: '#4a90e2' }}>{val}</b></span>
            <input type="range" min={min} max={max} step={s} value={val}
              onChange={e => (set as (v: number) => void)(float ? parseFloat(e.target.value) : parseInt(e.target.value))}
              style={{ width: '120px' }} />
          </label>
        ))}
        <button onClick={reAnalyze} disabled={analyzing} style={{ ...BTN, background: '#4a90e2', color: '#fff', opacity: analyzing ? 0.6 : 1 }}>
          {analyzing ? '분석 중…' : '재분석'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#aaa', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showDiff} onChange={e => setShowDiff(e.target.checked)} />
          Diff 미리보기
        </label>
      </div>

      <p style={{ color: '#555', fontSize: '0.78rem', margin: '0 0 0.6rem' }}>
        원본 클릭 → 스팟 추가 &nbsp;|&nbsp; 번호 클릭 → 삭제
      </p>

      {/* Images */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {/* Original */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.3rem' }}>원본</div>
          <div style={{ position: 'relative', cursor: 'crosshair' }} onClick={addSpot}>
            <img src={urlA!} alt="원본" style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />
            {showDiff && diffUrl && (
              <img src={diffUrl} alt="diff" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', opacity: 0.7, pointerEvents: 'none' }} />
            )}
            {spotOverlay(true)}
          </div>
        </div>

        {/* Modified */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.3rem' }}>변경본</div>
          <div style={{ position: 'relative' }}>
            <img src={urlB!} alt="변경본" style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />
            {spotOverlay(false)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffTool;
