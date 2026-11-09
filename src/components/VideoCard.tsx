import React from 'react';
import { Play, Heart, Trash2, HardDrive, Clock, Film, CheckSquare, Square } from 'lucide-react';
import { VideoItem } from '../types';
import { sounds } from '../services/soundEffects';

interface VideoCardProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onRequestDelete?: (video: VideoItem) => void;
  onToggleFavorite: (id: string) => void;
  isManageMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onPlay,
  isAdmin,
  onDelete,
  onRequestDelete,
  onToggleFavorite,
  isManageMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  const formatDuration = (secs: number) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCardClick = () => {
    if (isManageMode && onToggleSelect) {
      sounds.playClick();
      onToggleSelect(video.id);
    } else {
      sounds.playClick();
      onPlay(video);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-xl bg-[#090e1c] border transition-all duration-300 overflow-hidden cursor-pointer ${
        isSelected
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-2 ring-red-500/50'
          : 'border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
      }`}
    >
      {/* Thumbnail Aspect Container */}
      <div className="relative w-full aspect-video bg-[#040710] overflow-hidden">
        {video.thumbnailDataUrl && video.thumbnailDataUrl.trim() ? (
          <img
            src={video.thumbnailDataUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600">
            <Film className="w-8 h-8 mb-1 text-slate-700" />
            <span className="text-[10px] font-mono">NO THUMBNAIL</span>
          </div>
        )}

        {/* Scanline gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Play Icon Overlay (hidden in manage mode) */}
        {!isManageMode && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-[0_0_25px_#00ff88] transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </div>
          </div>
        )}

        {/* Selection Checkbox (when in batch manage mode) */}
        {isManageMode && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <div
              className={`p-1 rounded-md transition ${
                isSelected
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                  : 'bg-black/80 text-slate-400 border border-slate-700'
              }`}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-white" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        )}

        {/* Category Badge */}
        {!isManageMode && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-black/75 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
              {video.category}
            </span>
            {video.isDemo && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-black text-[9px] font-mono font-bold">
                DEMO
              </span>
            )}
          </div>
        )}

        {/* Favorite Button */}
        {!isManageMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              sounds.playClick();
              onToggleFavorite(video.id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-slate-300 hover:text-rose-400 transition"
          >
            <Heart className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-slate-300 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>{formatDuration(video.duration)}</span>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold font-cyber text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
            {video.title}
          </h4>
          {video.description && (
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-sans">
              {video.description}
            </p>
          )}
        </div>

        {/* Footer info: size, views & admin delete */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              {(video.sizeBytes / (1024 * 1024)).toFixed(1)}MB
            </span>
            <span>•</span>
            <span>{video.views || 0} views</span>
          </div>

          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRequestDelete) {
                  sounds.playClick();
                  onRequestDelete(video);
                } else if (isConfirmingDelete) {
                  sounds.playGameOver();
                  onDelete(video.id);
                  setIsConfirmingDelete(false);
                } else {
                  sounds.playClick();
                  setIsConfirmingDelete(true);
                  setTimeout(() => setIsConfirmingDelete(false), 4000);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold transition active:scale-95 ${
                isConfirmingDelete
                  ? 'border-red-400 bg-red-600 text-white animate-pulse shadow-md shadow-red-950'
                  : 'border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-300'
              }`}
              title={isConfirmingDelete ? 'Click again to permanently delete' : 'Delete Video'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-300" />
              <span>{isConfirmingDelete ? 'SURE? CONFIRM' : 'DELETE'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
