export interface GardenAssetDef {
  id: string;
  label: string;
  emoji: string;
}

export interface PlacedAsset {
  assetId: string;
  row: number;
  col: number;
}
