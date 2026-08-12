export interface GardenAssetDef {
  id: string;
  label: string;
  emoji?: string;
  image?: string;
  /** 'ground'는 타일 표면에 딱 맞춰 깔리는 바닥재, 'object'는 타일 위에 서 있는 오브젝트 */
  kind?: 'ground' | 'object';
}

export interface PlacedAsset {
  assetId: string;
  row: number;
  col: number;
}
