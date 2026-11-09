import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Download,
  Trash2,
  Heart,
  X,
  Clock,
  HardDrive,
  Eye,
  Smartphone,
  Monitor,
  RotateCw,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { VideoItem } from '../types';
import { sounds } from '../services/soundEffects';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  onClose: () => void;
  isAdmin: boolean;
  onDeleteVideo: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

type OrientationMode = 'landscape' | 'portrait';

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
  isAdmin,
  onDeleteVideo,
  onToggleFavorite,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Portrait / Landscape & Rotation controls
  const [orientationMode, setOrientationMode] = useState<OrientationMode>('landscape');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Video source URL management for 100% offline playback (never empty string)
  const [effectiveSrc, setEffectiveSrc] = useState<string | null>(() => {
    if (!video) return null;
    if (video.blob) {
      try {
        return URL.createObjectURL(video.blob);
      } catch {
        return null;
      }
    }
    return video.blobUrl || null;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (video) {
      setVideoError(null);
      setIsPlaying(true);
      setCurrentTime(0);

      // Ensure stable offline blob URL
      if (video.blob) {
        try {
          const freshUrl = URL.createObjectURL(video.blob);
          setEffectiveSrc(freshUrl);
          return () => {
            URL.revokeObjectURL(freshUrl);
          };
        } catch (err) {
          console.warn('Could not create object URL for video blob:', err);
          setEffectiveSrc(video.blobUrl || null);
        }
      } else {
        setEffectiveSrc(video.blobUrl || null);
      }
    } else {
      setEffectiveSrc(null);
    }
  }, [video]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!video) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'r' || e.key === 'R') {
        rotateNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [video, isPlaying, isMuted, rotationDegrees]);

  if (!video) return null;

  const togglePlay = () => {
    sounds.playClick();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn('Playback error:', err);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (speed: number) => {
    sounds.playClick();
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const rotateNext = () => {
    sounds.playClick();
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  const toggleOrientation = () => {
    sounds.playClick();
    setOrientationMode((prev) => (prev === 'landscape' ? 'portrait' : 'landscape'));
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      // Attempt screen orientation lock if supported
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as unknown as { lock: (mode: string) => Promise<void> })
            .lock(orientationMode === 'landscape' ? 'landscape' : 'portrait')
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    sounds.playClick();
    const url = effectiveSrc || (video.blob ? URL.createObjectURL(video.blob) : null);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-2 sm:p-5 overflow-y-auto">
      <div
        className={`relative w-full my-auto rounded-2xl bg-[#080d19] border-2 border-emerald-500/40 shadow-2xl overflow-hidden text-slate-100 flex flex-col transition-all duration-300 ${
          orientationMode === 'portrait' ? 'max-w-md' : 'max-w-4xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#050811] border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-cyber font-bold text-white truncate max-w-xs sm:max-w-md">
              {video.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Portrait / Landscape Mode Switcher */}
            <button
              onClick={toggleOrientation}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition ${
                orientationMode === 'portrait'
                  ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
              title="Switch Portrait / Landscape Mode"
            >
              {orientationMode === 'portrait' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">PORTRAIT</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">LANDSCAPE</span>
                </>
              )}
            </button>

            {/* Rotate 90 Degrees */}
            <button
              onClick={rotateNext}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border border-slate-700 bg-slate-900 text-slate-300 hover:text-emerald-400 transition"
              title={`Rotate 90° (Current: ${rotationDegrees}°)`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{rotationDegrees}°</span>
            </button>

            {/* Close */}
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Box (Adapts to Portrait or Landscape) */}
        <div
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          className={`relative w-full bg-black flex items-center justify-center group overflow-hidden transition-all duration-300 ${
            orientationMode === 'portrait' ? 'aspect-[9/16] max-h-[68vh]' : 'aspect-video'
          }`}
        >
          {videoError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-red-400">
              <AlertCircle className="w-10 h-10 mb-2" />
              <p className="text-sm font-bold">Video stream error</p>
              <button
                onClick={() => {
                  if (video.blob) {
                    setEffectiveSrc(URL.createObjectURL(video.blob));
                  }
                  setVideoError(null);
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-mono flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Playback
              </button>
            </div>
          ) : effectiveSrc ? (
            <video
              ref={videoRef}
              src={effectiveSrc}
              autoPlay
              loop={isLooping}
              playsInline
              preload="auto"
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onError={(e) => {
                console.error('Video error event:', e);
                setVideoError('Unable to decode video format on this browser');
              }}
              onClick={togglePlay}
              className={`w-full h-full cursor-pointer transition-transform duration-300 ${
                objectFit === 'cover' ? 'object-cover' : 'object-contain'
              }`}
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
              <p className="text-xs font-mono">INITIALIZING OFFLINE STREAM...</p>
            </div>
          )}

          {/* Top HUD Tag */}
          <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-emerald-400/90 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OFFLINE {orientationMode.toUpperCase()}</span>
          </div>

          {/* Custom Controls Bar */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek bar */}
            <div className="relative flex items-center mb-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-200">
              {/* Left: Play, Time, Volume */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="text-[11px] text-slate-300">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-500"> / </span>
                  <span>{formatTime(duration)}</span>
                </div>

                <button
                  onClick={toggleMute}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Right: Speeds, Loop, Fit, Download, Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Fit Mode Toggle */}
                <button
                  onClick={() => setObjectFit((f) => (f === 'contain' ? 'cover' : 'contain'))}
                  className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300 hover:text-white"
                  title="Toggle Fit / Fill"
                >
                  {objectFit === 'contain' ? 'FIT' : 'FILL'}
                </button>

                {/* Speed buttons */}
                <div className="hidden sm:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px]">
                  {[1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-1.5 py-0.5 rounded ${
                        playbackSpeed === s
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Loop */}
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-1.5 rounded-lg border text-[10px] font-mono transition ${
                    isLooping
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
                      : 'border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Loop Video"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Direct download to device */}
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-emerald-400 transition"
                  title="Download MP4 to Device"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info Details Below */}
        <div className="p-3.5 sm:p-4 bg-[#070b17] border-t border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                {video.category}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {new Date(video.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  onToggleFavorite(video.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
                  video.isFavorite
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{video.isFavorite ? 'FAV' : 'FAVORITE'}</span>
              </button>

              {/* Admin Delete Action */}
              {isAdmin && (
                <div className="relative">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <button
                        onClick={() => {
                          sounds.playGameOver();
                          onDeleteVideo(video.id);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition shadow-lg shadow-red-950 active:scale-95 animate-pulse"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>CONFIRM DELETE</span>
                      </button>
                      <button
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                      >
                        CANCEL
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setIsConfirmingDelete(true);
                        setTimeout(() => setIsConfirmingDelete(false), 5000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-mono transition"
                      title="Delete Video permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>DELETE</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {video.description && (
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-[#040710] p-2.5 rounded-xl border border-slate-800/80">
              {video.description}
            </p>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata pill counters */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-500" />
              {video.views || 0} views
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              {(video.sizeBytes / (1024 * 1024)).toFixed(2)} MB
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatTime(video.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
