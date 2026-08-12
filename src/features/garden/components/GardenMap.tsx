import React, { useState } from 'react';
import '../styles/GardenMap.css';
import type { GardenAssetDef, PlacedAsset } from '../types';

const GRID_ROWS = 6;
const GRID_COLS = 8;

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

  const cells = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const item = placedAt(row, col);
      const asset = item ? assetById(item.assetId) : null;
      cells.push(
        <button
          key={`${row}-${col}`}
          className="garden-cell"
          onClick={() => handleCellClick(row, col)}
          title={asset ? `${asset.label} (클릭해서 제거)` : '클릭해서 배치'}
        >
          {asset && <span className="garden-cell-asset">{asset.emoji}</span>}
        </button>
      );
    }
  }

  return (
    <div className="garden-map-page">
      <h1 className="garden-title">가든 맵 테스트</h1>

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

      <div
        className="garden-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        }}
      >
        {cells}
      </div>

      <p className="garden-hint">
        팔레트에서 에셋 선택 후 빈 칸을 클릭해 배치하세요. 배치된 칸을 다시 클릭하면 제거됩니다.
      </p>
    </div>
  );
};

export default GardenMap;
