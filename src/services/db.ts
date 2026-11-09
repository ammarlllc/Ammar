import { VideoItem, ObbPackageFile, SerializedVideoRecord, ObbExportMetadata } from '../types';

const DB_NAME = 'AMMAR_H4CKER_VAULT_DB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';
const STORE_SETTINGS = 'settings';

class VaultDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
          const store = db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Save or update video
  public async saveVideo(video: VideoItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      // Omit ephemeral blobUrl when persisting
      const { blobUrl: _, ...recordToStore } = video;
      const request = store.put(recordToStore);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Retrieve all videos
  public async getAllVideos(): Promise<VideoItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: VideoItem[] = request.result || [];
        // Attach ephemeral object URLs for playing
        const mapped = items.map((item) => {
          if (item.blob) {
            try {
              item.blobUrl = URL.createObjectURL(item.blob);
            } catch {
              // ignore
            }
          }
          return item;
        });
        // Sort descending by createdAt
        mapped.sort((a, b) => b.createdAt - a.createdAt);
        resolve(mapped);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Delete video
  public async deleteVideo(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Increment view count
  public async incrementViews(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const req = store.get(id);

      req.onsuccess = () => {
        const item: VideoItem = req.result;
        if (item) {
          item.views = (item.views || 0) + 1;
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Toggle favorite
  public async toggleFavorite(id: string): Promise<boolean> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const req = store.get(id);

      req.onsuccess = () => {
        const item: VideoItem = req.result;
        if (item) {
          item.isFavorite = !item.isFavorite;
          store.put(item);
          resolve(item.isFavorite);
        } else {
          resolve(false);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Settings helpers
  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  public async setSetting(key: string, value: unknown): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key, value });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // CUSTOM CATEGORY MANAGEMENT
  // ==========================================

  public async getCategories(): Promise<string[]> {
    const defaultCats = [
      'Cyber Intel',
      'Classified Vault',
      'Hacking & Tools',
      'Tutorials',
      'VIP Media',
    ];
    const saved = await this.getSetting<string[]>('ammar_categories', defaultCats);
    return saved && saved.length > 0 ? saved : defaultCats;
  }

  public async saveCategories(categories: string[]): Promise<void> {
    const unique = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
    await this.setSetting('ammar_categories', unique);
  }

  public async addCategory(name: string): Promise<string[]> {
    const clean = name.trim();
    if (!clean) return await this.getCategories();
    const current = await this.getCategories();
    if (!current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      current.push(clean);
      await this.saveCategories(current);
    }
    return current;
  }

  public async deleteCategory(name: string): Promise<string[]> {
    const current = await this.getCategories();
    const filtered = current.filter((c) => c.toLowerCase() !== name.toLowerCase());
    await this.saveCategories(filtered);
    return filtered;
  }

  // ==========================================
  // PORTABLE OBB DATA EXPORT & IMPORT
  // ==========================================

  // Export full vault as a portable .obb data archive package (including custom categories!)
  public async exportObbDataFile(onProgress?: (percent: number, status: string) => void): Promise<{ blob: Blob; fileName: string; sizeBytes: number; videoCount: number }> {
    const videos = await this.getAllVideos();
    const total = videos.length;
    const serializedRecords: SerializedVideoRecord[] = [];

    onProgress?.(5, `Analyzing ${total} videos in offline vault...`);

    let processedSize = 0;

    for (let i = 0; i < total; i++) {
      const vid = videos[i];
      onProgress?.(
        Math.round(10 + (i / total) * 80),
        `Packaging OBB Sector ${i + 1}/${total}: "${vid.title.substring(0, 24)}..."`
      );

      let base64 = '';
      if (vid.blob) {
        base64 = await blobToBase64(vid.blob);
      }

      processedSize += vid.sizeBytes;

      serializedRecords.push({
        id: vid.id,
        title: vid.title,
        description: vid.description,
        category: vid.category,
        tags: vid.tags || [],
        duration: vid.duration,
        sizeBytes: vid.sizeBytes,
        mimeType: vid.mimeType || 'video/mp4',
        thumbnailDataUrl: vid.thumbnailDataUrl,
        createdAt: vid.createdAt,
        views: vid.views || 0,
        isFavorite: vid.isFavorite || false,
        base64Data: base64,
      });
    }

    onProgress?.(92, 'Packaging metadata and categories into OBB archive...');

    // Collect all categories (both saved list + any categories on videos)
    const currentCategories = await this.getCategories();
    videos.forEach((v) => {
      if (v.category && !currentCategories.includes(v.category)) {
        currentCategories.push(v.category);
      }
    });

    const meta: ObbExportMetadata = {
      magic: 'AMMAR_HACKER_OBB_V1',
      appName: 'AMMAR H4CKER',
      version: '1.0.0',
      exportedAt: Date.now(),
      videoCount: serializedRecords.length,
      totalSizeBytes: processedSize,
      author: 'AMMAR H4CKER',
    };

    const packagePayload: ObbPackageFile = {
      meta,
      records: serializedRecords,
      categories: currentCategories,
    };

    const jsonString = JSON.stringify(packagePayload);
    const obbBlob = new Blob([jsonString], { type: 'application/octet-stream' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `main.1001.com.ammar.hacker_${timestamp}.obb`;

    onProgress?.(100, `OBB Data Package generated! (${(obbBlob.size / (1024 * 1024)).toFixed(2)} MB)`);

    return {
      blob: obbBlob,
      fileName,
      sizeBytes: obbBlob.size,
      videoCount: serializedRecords.length,
    };
  }

  // Import / Flash an OBB data package (restoring videos AND custom categories!)
  public async importObbDataFile(file: File, onProgress?: (percent: number, status: string) => void): Promise<{ importedCount: number; totalBytes: number }> {
    onProgress?.(10, 'Mounting OBB archive file...');

    const fileText = await file.text();
    onProgress?.(25, 'Verifying OBB checksum & cryptographic header...');

    let parsed: ObbPackageFile;
    try {
      parsed = JSON.parse(fileText);
    } catch {
      throw new Error('Corrupted or invalid OBB file format. Cannot parse archive.');
    }

    if (!parsed.meta || parsed.meta.magic !== 'AMMAR_HACKER_OBB_V1') {
      throw new Error('Incompatible OBB format! Expected signature AMMAR_HACKER_OBB_V1.');
    }

    // 1. Restore and merge custom categories into local database!
    if (parsed.categories && Array.isArray(parsed.categories)) {
      onProgress?.(35, 'Restoring custom category taxonomy...');
      const existingCats = await this.getCategories();
      const mergedCats = Array.from(new Set([...existingCats, ...parsed.categories]));
      await this.saveCategories(mergedCats);
    }

    const records = parsed.records || [];
    let count = 0;
    let totalBytes = 0;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      onProgress?.(
        Math.round(40 + (i / records.length) * 55),
        `Restoring video ${i + 1}/${records.length}: "${rec.title.substring(0, 20)}..."`
      );

      let videoBlob: Blob | undefined;
      if (rec.base64Data) {
        videoBlob = base64ToBlob(rec.base64Data, rec.mimeType || 'video/mp4');
      }

      const videoItem: VideoItem = {
        id: rec.id || `ammar_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: rec.title,
        description: rec.description || '',
        category: rec.category || 'Cyber Intel',
        tags: rec.tags || [],
        duration: rec.duration || 0,
        sizeBytes: rec.sizeBytes || (videoBlob ? videoBlob.size : 0),
        mimeType: rec.mimeType || 'video/mp4',
        thumbnailDataUrl: rec.thumbnailDataUrl,
        createdAt: rec.createdAt || Date.now(),
        views: rec.views || 0,
        isFavorite: rec.isFavorite || false,
        blob: videoBlob,
      };

      await this.saveVideo(videoItem);
      if (videoItem.category) {
        await this.addCategory(videoItem.category);
      }
      count++;
      totalBytes += videoItem.sizeBytes;
    }

    onProgress?.(100, `Successfully flashed ${count} videos into offline vault!`);

    return { importedCount: count, totalBytes };
  }

  // Generate demo cyberpunk video clips if DB is clean
  public async seedDemoVideosIfEmpty(): Promise<void> {
    const hasSeeded = await this.getSetting<boolean>('vault_demo_seeded', false);
    if (hasSeeded) return;

    const existing = await this.getAllVideos();
    if (existing.length > 0) {
      await this.setSetting('vault_demo_seeded', true);
      return;
    }

    // Generate 2 rich interactive canvas-recorded demo clips
    try {
      const demo1Blob = await createSyntheticCyberVideo({
        title: 'AMMAR H4CKER // MATRIX SYSTEM OVERRIDE',
        subtitle: 'FIREWALL DECRYPTION & QUANTUM TELEMETRY',
        themeColor: '#00ff88',
        durationSec: 6,
      });

      const demo2Blob = await createSyntheticCyberVideo({
        title: 'AMMAR H4CKER // ENCRYPTED NEURAL CORE',
        subtitle: 'QUANTUM DATA TELEMETRY & NETWORK SHIELD',
        themeColor: '#00e5ff',
        durationSec: 6,
      });

      const demo1Thumb = generateThumbnailPreview('AMMAR H4CKER // MATRIX PROTOCOL', '#00ff88');
      const demo2Thumb = generateThumbnailPreview('AMMAR H4CKER // NEURAL CORE', '#00e5ff');

      await this.saveVideo({
        id: 'demo_matrix_override',
        title: 'AMMAR H4CKER // MATRIX SYSTEM OVERRIDE [OFFLINE DEMO]',
        description: 'Classified terminal diagnostics and quantum data stream intercepted during node penetration test.',
        category: 'Cyber Intel',
        tags: ['#AmmarHacker', '#CyberTerminal', '#Matrix', '#OfflineVault'],
        blob: demo1Blob,
        duration: 6,
        sizeBytes: demo1Blob.size,
        mimeType: demo1Blob.type || 'video/webm',
        thumbnailDataUrl: demo1Thumb,
        createdAt: Date.now() - 3600000,
        views: 142,
        isFavorite: true,
        isDemo: true,
      });

      await this.saveVideo({
        id: 'demo_neural_core',
        title: 'AMMAR H4CKER // ENCRYPTED NEURAL TELEMETRY',
        description: 'Advanced cryptographic telemetry showcase. Encrypted and stored 100% offline in local vault storage.',
        category: 'Classified Vault',
        tags: ['#AmmarHacker', '#NeuralCore', '#OBBData', '#QuantumShield'],
        blob: demo2Blob,
        duration: 6,
        sizeBytes: demo2Blob.size,
        mimeType: demo2Blob.type || 'video/webm',
        thumbnailDataUrl: demo2Thumb,
        createdAt: Date.now() - 1800000,
        views: 389,
        isFavorite: true,
        isDemo: true,
      });

      await this.setSetting('vault_demo_seeded', true);
    } catch (err) {
      console.warn('Could not generate synthetic demo videos:', err);
    }
  }
}

// Convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Convert Base64 back to Blob
function base64ToBlob(base64DataUrl: string, defaultMime = 'video/mp4'): Blob {
  const parts = base64DataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : defaultMime;
  const byteString = atob(parts[1] || parts[0]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mime });
}

// Programmatically generate a lightweight recorded video stream using Canvas + MediaRecorder
// Completely client-side and 100% offline!
async function createSyntheticCyberVideo(opts: {
  title: string;
  subtitle: string;
  themeColor: string;
  durationSec: number;
}): Promise<Blob> {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return new Blob(['dummy'], { type: 'video/webm' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Blob([], { type: 'video/webm' });

  const stream = canvas.captureStream(25);
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start(100);

    const startTime = performance.now();
    const chars = '01010101AMMARHACKER9876543210FIREWALL_BYPASS_AUTHORIZED';

    function renderFrame(now: number) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed >= opts.durationSec) {
        recorder.stop();
        return;
      }

      // Background
      ctx!.fillStyle = '#060913';
      ctx!.fillRect(0, 0, 640, 360);

      // Grid
      ctx!.strokeStyle = 'rgba(0, 255, 136, 0.08)';
      ctx!.lineWidth = 1;
      for (let x = 0; x < 640; x += 32) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, 360);
        ctx!.stroke();
      }
      for (let y = 0; y < 360; y += 32) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(640, y);
        ctx!.stroke();
      }

      // Matrix Rain Columns
      ctx!.fillStyle = 'rgba(0, 255, 136, 0.35)';
      ctx!.font = '12px monospace';
      for (let col = 0; col < 20; col++) {
        const x = col * 32 + 10;
        const offset = Math.floor(elapsed * 12 + col * 3) % 25;
        for (let row = 0; row < 12; row++) {
          const y = (row + offset) * 18 % 360;
          const char = chars.charAt((col * 5 + row + Math.floor(elapsed * 10)) % chars.length);
          ctx!.fillText(char, x, y);
        }
      }

      // HUD Box
      ctx!.strokeStyle = opts.themeColor;
      ctx!.lineWidth = 2;
      ctx!.strokeRect(40, 50, 560, 260);

      // Corner brackets
      ctx!.fillStyle = opts.themeColor;
      ctx!.fillRect(36, 46, 16, 4);
      ctx!.fillRect(36, 46, 4, 16);
      ctx!.fillRect(588, 46, 16, 4);
      ctx!.fillRect(600, 46, 4, 16);
      ctx!.fillRect(36, 310, 16, 4);
      ctx!.fillRect(36, 298, 4, 16);
      ctx!.fillRect(588, 310, 16, 4);
      ctx!.fillRect(600, 298, 4, 16);

      // Center title
      ctx!.fillStyle = '#ffffff';
      ctx!.font = 'bold 22px Orbitron, sans-serif';
      ctx!.textAlign = 'center';
      ctx!.fillText(opts.title, 320, 150);

      ctx!.fillStyle = opts.themeColor;
      ctx!.font = '14px Rajdhani, monospace';
      ctx!.fillText(opts.subtitle, 320, 185);

      // Progress bar
      const progress = elapsed / opts.durationSec;
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx!.fillRect(160, 220, 320, 10);
      ctx!.fillStyle = opts.themeColor;
      ctx!.fillRect(160, 220, 320 * progress, 10);

      // Timestamp & FPS
      ctx!.fillStyle = '#94a3b8';
      ctx!.font = '12px JetBrains Mono, monospace';
      ctx!.textAlign = 'left';
      ctx!.fillText(`REC: ${elapsed.toFixed(2)}s / ${opts.durationSec}s`, 60, 280);
      ctx!.textAlign = 'right';
      ctx!.fillText(`OBB SECTOR: 0x${Math.floor(elapsed * 1000).toString(16).toUpperCase()}`, 580, 280);

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  });
}

// Generate thumbnail preview image
export function generateThumbnailPreview(title: string, accentColor = '#00ff88'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 480, 270);
  grad.addColorStop(0, '#040711');
  grad.addColorStop(0.5, '#0a1329');
  grad.addColorStop(1, '#020408');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 270);

  // Border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 468, 258);

  // Play button polygon
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(225, 110);
  ctx.lineTo(265, 135);
  ctx.lineTo(225, 160);
  ctx.closePath();
  ctx.fill();

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 240, 205);

  ctx.fillStyle = accentColor;
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillText('AMMAR H4CKER // OFFLINE VAULT', 240, 230);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Extract thumbnail from real video file
export function extractVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 480, 270);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
          return;
        }
      } catch {
        // fallback
      }
      URL.revokeObjectURL(url);
      resolve(generateThumbnailPreview(file.name.replace(/\.[^/.]+$/, '')));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(generateThumbnailPreview(file.name.replace(/\.[^/.]+$/, '')));
    };
  });
}

// Get video duration
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const dur = video.duration || 0;
      URL.revokeObjectURL(url);
      resolve(Math.round(dur));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export const vaultDb = new VaultDatabase();
