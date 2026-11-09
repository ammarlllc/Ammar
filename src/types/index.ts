export interface VideoItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  blob?: Blob;
  blobUrl?: string;
  duration: number; // in seconds
  sizeBytes: number;
  mimeType: string;
  thumbnailDataUrl?: string;
  createdAt: number;
  views: number;
  isFavorite: boolean;
  isDemo?: boolean;
}

export interface ObbExportMetadata {
  magic: 'AMMAR_HACKER_OBB_V1';
  appName: 'AMMAR H4CKER';
  version: string;
  exportedAt: number;
  videoCount: number;
  totalSizeBytes: number;
  author: string;
}

export interface SerializedVideoRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  duration: number;
  sizeBytes: number;
  mimeType: string;
  thumbnailDataUrl?: string;
  createdAt: number;
  views: number;
  isFavorite: boolean;
  base64Data: string; // Packed video binary
}

export interface ObbPackageFile {
  meta: ObbExportMetadata;
  records: SerializedVideoRecord[];
  categories?: string[];
}

export type VaultViewMode = 'grid' | 'cinema' | 'list';
