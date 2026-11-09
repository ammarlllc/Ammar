import React, { useState, useRef } from 'react';
import { UploadCloud, Film, Image as ImageIcon, X, Check, Loader2, Tag, FileText, Sparkles } from 'lucide-react';
import { VideoItem } from '../types';
import { vaultDb, extractVideoThumbnail, getVideoDuration } from '../services/db';
import { sounds } from '../services/soundEffects';

interface VideoUploadModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  categories: string[];
  onAddCategory: (name: string) => Promise<void>;
  onClose: () => void;
  onVideoUploaded: (video: VideoItem) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  isAdmin,
  categories,
  onAddCategory,
  onClose,
  onVideoUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Cyber Intel');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  // STRICT RULE: Only authenticated Admin can upload videos!
  if (!isOpen || !isAdmin) return null;

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsProcessing(true);
    setProgressMsg('Extracting video metadata & auto-generating thumbnail...');

    // Auto populate title if empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.toUpperCase());
    }

    try {
      const thumb = await extractVideoThumbnail(selectedFile);
      setThumbnailPreview(thumb);
    } catch (err) {
      console.warn('Failed thumbnail extraction:', err);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleCustomThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const thumbFile = e.target.files?.[0];
    if (thumbFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(thumbFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    sounds.playClick();
    setIsProcessing(true);
    setProgressMsg('Saving video binary into offline IndexedDB storage...');

    try {
      const duration = await getVideoDuration(file);

      // Parse tags
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      if (tags.length === 0) {
        tags.push('#AmmarHacker', '#OfflineVideo');
      }

      const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const newVideo: VideoItem = {
        id: videoId,
        title: title.trim() || file.name,
        description: description.trim(),
        category,
        tags,
        blob: file,
        duration: duration || 0,
        sizeBytes: file.size,
        mimeType: file.type || 'video/mp4',
        thumbnailDataUrl: thumbnailPreview,
        createdAt: Date.now(),
        views: 0,
        isFavorite: false,
      };

      await vaultDb.saveVideo(newVideo);
      sounds.playAuthSuccess();

      onVideoUploaded(newVideo);
      onClose();
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setThumbnailPreview('');
      setTagInput('');
      setUploadError(null);
    } catch (err) {
      console.error('Failed to save video:', err);
      setUploadError('Failed to save video to offline database. Storage quota may be full.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 rounded-2xl bg-[#090e1c] border-2 border-emerald-500/50 p-6 shadow-2xl shadow-emerald-950/60 text-slate-100 font-sans">
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-cyber text-white">
              OFFLINE VIDEO INGEST
            </h2>
            <p className="text-xs font-mono text-emerald-400/80">
              Admin Upload • Persists in browser local storage & OBB engine
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-mono flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-400 hover:text-white text-xs underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker Zone */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-[#050812]/80 rounded-xl p-8 text-center cursor-pointer transition hover:bg-emerald-950/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mkv,.webm,.mov,.avi"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <Film className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-cyber font-bold text-white">
                SELECT VIDEO FROM DEVICE
              </p>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Drag and drop MP4, MKV, WebM or click to browse
              </p>
              <span className="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                100% OFFLINE SECURE STORAGE
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#050812] border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-700 relative">
                  {thumbnailPreview && thumbnailPreview.trim() ? (
                    <img src={thumbnailPreview} alt="Thumb" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-6 h-6 text-emerald-400 m-auto mt-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{file.name}</p>
                  <p className="text-xs font-mono text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'video'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setThumbnailPreview('');
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-400 text-xs font-mono transition"
              >
                CHANGE
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              VIDEO TITLE *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AMMAR H4CKER // ENCRYPTED OPERATION"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040710] border border-slate-700 text-white font-medium text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-300">
                  CATEGORY
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition"
                >
                  {isAddingNewCategory ? 'Cancel' : '+ New Category'}
                </button>
              </div>

              {isAddingNewCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#040710] border border-emerald-500/50 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newCategoryName.trim()) {
                        await onAddCategory(newCategoryName.trim());
                        setCategory(newCategoryName.trim());
                        setNewCategoryName('');
                        setIsAddingNewCategory(false);
                      }
                    }}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono"
                  >
                    ADD
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040710] border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                TAGS (COMMA SEPARATED)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="#AmmarHacker, #CyberIntel, #OfflineVault"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#040710] border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
                <Tag className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video description, highlights, settings info..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#040710] border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          {/* Custom Thumbnail button */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <span className="font-mono">Auto-generated Thumbnail</span>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCustomThumbSelect}
            />
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:text-white transition"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Custom Image</span>
            </button>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-300">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
              <span>{progressMsg || 'Processing video file...'}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-cyber font-bold text-sm tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-98 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                SAVING TO OFFLINE VAULT...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                SAVE TO AMMAR H4CKER VAULT
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
