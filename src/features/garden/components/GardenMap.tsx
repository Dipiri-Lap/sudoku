import React, { useState } from 'react';
import '../styles/GardenMap.css';
import type { GardenAssetDef, PlacedAsset } from '../types';

const GRID_ROWS = 6;
const GRID_COLS = 8;

// 다이아몬드 타일 하나의 화면상 크기 (아이소메트릭 2:1 비율)
const TILE_W = 56;
const TILE_H = 28;

// row/col 그리드 원점을 화면 좌상단(0,0)으로 맞추기 위한 오프셋
const ORIGIN_X = (GRID_ROWS - 1) * (TILE_W / 2) + TILE_W / 2;
const ORIGIN_Y = TILE_H / 2;

// 격자 전체 외곽선의 실제 꼭짓점 4개 (행/열 개수가 다르면 대칭 다이아몬드가
// 아니라 기울어진 평행사변형이 된다 — 각 변을 만들어내는 모서리 타일의
// 바깥쪽 꼭짓점을 그대로 계산해야 한다).
const A = TILE_W / 2;
const B = TILE_H / 2;
const BOARD_CORNERS = [
  { x: 0, y: -B }, // 맨 위: tile(0,0)의 top 꼭짓점
  { x: GRID_COLS * A, y: (GRID_COLS - 1) * B }, // 맨 오른쪽: tile(0,COLS-1)의 right 꼭짓점
  { x: (GRID_COLS - GRID_ROWS) * A, y: (GRID_COLS + GRID_ROWS - 1) * B }, // 맨 아래: tile(ROWS-1,COLS-1)의 bottom 꼭짓점
  { x: -GRID_ROWS * A, y: (GRID_ROWS - 1) * B }, // 맨 왼쪽: tile(ROWS-1,0)의 left 꼭짓점
];

const CORNER_MIN_X = Math.min(...BOARD_CORNERS.map((c) => c.x));
const CORNER_MAX_X = Math.max(...BOARD_CORNERS.map((c) => c.x));
const CORNER_MIN_Y = Math.min(...BOARD_CORNERS.map((c) => c.y));
const CORNER_MAX_Y = Math.max(...BOARD_CORNERS.map((c) => c.y));

const STAGE_W = CORNER_MAX_X - CORNER_MIN_X;
const STAGE_H = CORNER_MAX_Y - CORNER_MIN_Y;

// 격자 외곽 꼭짓점을 %로 변환한 clip-path. 보드를 이 비율 그대로 키우면
// (같은 % 값, 더 큰 박스) 안쪽 타일 모양과 평행한 테두리가 나와서
// 네 변 모두 두께가 균일해진다.
const BOARD_CLIP_PATH = `polygon(${BOARD_CORNERS.map(
  (c) =>
    `${(((c.x - CORNER_MIN_X) / STAGE_W) * 100).toFixed(3)}% ${(
      ((c.y - CORNER_MIN_Y) / STAGE_H) *
      100
    ).toFixed(3)}%`
).join(', ')})`;

const BOARD_SCALE = 1.1;
const BOARD_W = STAGE_W * BOARD_SCALE;
const BOARD_H = STAGE_H * BOARD_SCALE;
const STAGE_LEFT = (BOARD_W - STAGE_W) / 2;
const STAGE_TOP = (BOARD_H - STAGE_H) / 2;

// row/col 그리드 좌표를 다이아몬드 화면 좌표(타일 중심)로 변환
const tileCenter = (row: number, col: number) => ({
  x: ORIGIN_X + (col - row) * (TILE_W / 2),
  y: ORIGIN_Y + (col + row) * (TILE_H / 2),
});

// 임시 플레이스홀더 에셋 (실제 아트 나오면 emoji -> 이미지로 교체)
const PLACEHOLDER_ASSETS: GardenAssetDef[] = [
  { id: 'tree', label: '나무', emoji: '🌳' },
  { id: 'flower', label: '꽃', emoji: '🌷' },
  { id: 'fence', label: '울타리', emoji: '🚧' },
  { id: 'bench', label: '벤치', emoji: '🪑' },
  { id: 'pond', label: '연못', emoji: '💧' },
  { id: 'path', label: '길', emoji: '🟫' },
];

const assetById = (id: string) => PLACEHOLDER_ASSETS.find((a) => a.id === id);

const GardenMap: React.FC = () => {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(PLACEHOLDER_ASSETS[0].id);
  const [placed, setPlaced] = useState<PlacedAsset[]>([]);
  const [coins] = useState(8500);
  const [gems] = useState(586);
  const [level] = useState(7);

  const placedAt = (row: number, col: number) =>
    placed.find((p) => p.row === row && p.col === col);

  const handleCellClick = (row: number, col: number) => {
    const existing = placedAt(row, col);

    if (existing) {
      setPlaced((prev) => prev.filter((p) => !(p.row === row && p.col === col)));
      return;
    }

    if (!selectedAssetId) return;

    setPlaced((prev) => [...prev, { assetId: selectedAssetId, row, col }]);
  };

  const handleClearAll = () => setPlaced([]);

  const tiles = [];
  const assetSprites = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = tileCenter(row, col);
      const item = placedAt(row, col);
      const asset = item ? assetById(item.assetId) : null;
      const zIndex = row + col;

      tiles.push(
        <button
          key={`tile-${row}-${col}`}
          className={`garden-tile${(row + col) % 2 === 0 ? ' alt' : ''}`}
          style={{
            left: x - TILE_W / 2,
            top: y - TILE_H / 2,
            width: TILE_W,
            height: TILE_H,
            zIndex,
          }}
          onClick={() => handleCellClick(row, col)}
          title={asset ? `${asset.label} (클릭해서 제거)` : '클릭해서 배치'}
        />
      );

      if (asset) {
        assetSprites.push(
          <span
            key={`asset-${row}-${col}`}
            className="garden-asset-sprite"
            style={{ left: x, top: y, zIndex: zIndex + GRID_ROWS + GRID_COLS }}
            onClick={() => handleCellClick(row, col)}
          >
            {asset.emoji}
          </span>
        );
      }
    }
  }

  return (
    <div className="garden-map-page">
      <div className="garden-hud">
        <div className="garden-hud-left">
          <span className="garden-level-badge">
            <span className="garden-level-star">🏆</span>
            {level}
          </span>
          <div className="garden-hud-bars">
            <div className="garden-xp-bar">
              <div className="garden-xp-fill" style={{ width: '55%' }} />
            </div>
            <div className="garden-resource-pill gold">
              <span className="garden-resource-icon">🪙</span>
              {coins.toLocaleString()}
            </div>
            <div className="garden-resource-pill gem">
              <span className="garden-resource-icon">💎</span>
              {gems.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="garden-palette">
        {PLACEHOLDER_ASSETS.map((asset) => (
          <button
            key={asset.id}
            className={`garden-palette-item${selectedAssetId === asset.id ? ' selected' : ''}`}
            onClick={() => setSelectedAssetId(asset.id)}
          >
            <span className="garden-palette-emoji">{asset.emoji}</span>
            <span className="garden-palette-label">{asset.label}</span>
          </button>
        ))}
        <button className="garden-clear-btn" onClick={handleClearAll}>
          전체 초기화
        </button>
      </div>

      <div className="garden-field-frame">
        <div
          className="garden-board"
          style={{ width: BOARD_W, height: BOARD_H, clipPath: BOARD_CLIP_PATH }}
        >
          <div
            className="garden-stage"
            style={{ width: STAGE_W, height: STAGE_H, left: STAGE_LEFT, top: STAGE_TOP }}
          >
            {tiles}
            {assetSprites}
          </div>
        </div>
      </div>

      <p className="garden-hint">
        팔레트에서 에셋 선택 후 빈 칸을 클릭해 배치하세요. 배치된 칸을 다시 클릭하면 제거됩니다.
      </p>
    </div>
  );
};

export default GardenMap;
