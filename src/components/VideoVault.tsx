import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  HardDrive,
  UploadCloud,
  CheckCircle2,
  Film,
  X,
  Tag,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { VideoItem } from '../types';
import { VideoCard } from './VideoCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { sounds } from '../services/soundEffects';

interface VideoVaultProps {
  videos: VideoItem[];
  isAdmin: boolean;
  categories: string[];
  onPlayVideo: (video: VideoItem) => void;
  onOpenUpload: () => void;
  onOpenObbEngine: () => void;
  onOpenAdminLogin?: () => void;
  onDeleteVideo: (id: string) => void;
  onBatchDeleteVideos: (ids: string[]) => Promise<void>;
  onToggleFavorite: (id: string) => void;
  onAddCategory: (name: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
}

export const VideoVault: React.FC<VideoVaultProps> = ({
  videos,
  isAdmin,
  categories,
  onPlayVideo,
  onOpenUpload,
  onOpenObbEngine,
  onOpenAdminLogin,
  onDeleteVideo,
  onBatchDeleteVideos,
  onToggleFavorite,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'size'>('newest');

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Batch delete / manage mode state
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // In-app Delete Confirmation Modal state (Iframe safe - replaces window.confirm)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch' | 'category';
    targetId?: string;
    title: string;
    message?: string;
    itemCount?: number;
  }>({
    isOpen: false,
    type: 'single',
    title: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic tabs: ALL + FAVORITES + custom categories from DB
  const allTabs = useMemo(() => {
    return ['ALL', 'FAVORITES', ...categories];
  }, [categories]);

  // Filtered and sorted videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Category filter
    if (selectedCategory === 'FAVORITES') {
      result = result.filter((v) => v.isFavorite);
    } else if (selectedCategory !== 'ALL') {
      result = result.filter((v) => v.category === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          (v.description && v.description.toLowerCase().includes(q)) ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'size') {
      result.sort((a, b) => b.sizeBytes - a.sizeBytes);
    }

    return result;
  }, [videos, selectedCategory, searchQuery, sortBy]);

  // Total size calculated
  const totalSizeBytes = useMemo(() => {
    return videos.reduce((acc, v) => acc + (v.sizeBytes || 0), 0);
  }, [videos]);

  // Toggle selection for batch delete
  const toggleSelectVideo = (id: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    sounds.playClick();
    if (selectedVideoIds.length === filteredVideos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(filteredVideos.map((v) => v.id));
    }
  };

  // Open modal for single video delete
  const handleOpenSingleDeleteModal = (video: VideoItem) => {
    sounds.playClick();
    setDeleteModal({
      isOpen: true,
      type: 'single',
      targetId: video.id,
      title: video.title,
      message: `Are you sure you want to permanently delete "${video.title}" from your offline vault? It will be removed from local IndexedDB storage.`,
    });
  };

  // Open modal for batch video delete
  const handleOpenBatchDeleteModal = () => {
    if (selectedVideoIds.length === 0) return;
    sounds.playClick();
    setDeleteModal({
      isOpen: true,
      type: 'batch',
      title: `Delete ${selectedVideoIds.length} Selected Videos`,
      itemCount: selectedVideoIds.length,
      message: `Are you sure you want to permanently delete all ${selectedVideoIds.length} selected videos from your offline vault?`,
    });
  };

  // Open modal for category delete
  const handleOpenCategoryDeleteModal = (cat: string) => {
    sounds.playClick();
    setDeleteModal({
      isOpen: true,
      type: 'category',
      targetId: cat,
      title: `Delete Category "${cat}"`,
      message: `Are you sure you want to remove the category "${cat}"? Videos under this category will stay safe in your offline vault under ALL.`,
    });
  };

  // Execute confirmed deletion
  const handleConfirmDelete = async () => {
    sounds.playGameOver();
    if (deleteModal.type === 'single' && deleteModal.targetId) {
      onDeleteVideo(deleteModal.targetId);
      setToastMessage('Video permanently deleted from offline vault');
      setTimeout(() => setToastMessage(null), 3500);
    } else if (deleteModal.type === 'batch') {
      setIsDeletingBatch(true);
      try {
        await onBatchDeleteVideos(selectedVideoIds);
        setToastMessage(`${selectedVideoIds.length} videos permanently deleted`);
        setTimeout(() => setToastMessage(null), 3500);
        setSelectedVideoIds([]);
        setIsManageMode(false);
      } catch (err) {
        console.error('Batch delete error:', err);
      } finally {
        setIsDeletingBatch(false);
      }
    } else if (deleteModal.type === 'category' && deleteModal.targetId) {
      await onDeleteCategory(deleteModal.targetId);
      if (selectedCategory === deleteModal.targetId) {
        setSelectedCategory('ALL');
      }
      setToastMessage(`Category "${deleteModal.targetId}" deleted`);
      setTimeout(() => setToastMessage(null), 3500);
    }
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    sounds.playClick();
    await onAddCategory(newCatName.trim());
    setSelectedCategory(newCatName.trim());
    setNewCatName('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* OBB Feature Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0c1429] via-[#09152e] to-[#080d1a] border border-cyan-500/30 p-4 sm:p-6 shadow-2xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>PORTABLE DATA ARCHIVE ENGINE ACTIVE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-cyber text-white">
              OFFLINE VAULT • AMMAR H4CKER
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Sabhi videos aur categories aapke device ki IndexedDB storage me 100% offline save hain. Jab aap is app ko kisi dost ko send karein, to <strong className="text-cyan-400">OBB DATA PACKAGE (.obb)</strong> bhi sath send karein taake usko sab videos aur categories show hon!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                sounds.playClick();
                onOpenObbEngine();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-cyber font-bold text-xs tracking-wider transition shadow-lg shadow-cyan-950/60 active:scale-95"
            >
              <HardDrive className="w-4 h-4" />
              <span>OBB DATA ENGINE</span>
            </button>

            {isAdmin ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenUpload();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-cyber font-bold text-xs tracking-wider transition shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>UPLOAD VIDEO</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenUpload();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 hover:bg-amber-950/40 text-amber-300 font-mono text-xs transition"
                title="Only Admin can upload videos"
              >
                <span>🔒 ADMIN UPLOAD ONLY</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex flex-wrap items-center gap-4 sm:gap-7">
            <div>
              TOTAL VIDEOS: <strong className="text-white font-bold">{videos.length}</strong>
            </div>
            <div>
              CATEGORIES: <strong className="text-cyan-400 font-bold">{categories.length}</strong>
            </div>
            <div>
              STORAGE:{' '}
              <strong className="text-emerald-400 font-bold">
                {(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB
              </strong>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ADMIN MODE
              </span>
              {/* Batch delete toggle */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsManageMode(!isManageMode);
                  setSelectedVideoIds([]);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
                  isManageMode
                    ? 'border-red-500 bg-red-950 text-red-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {isManageMode ? 'Exit Batch Delete' : 'Batch Delete Videos'}
              </button>
            </div>
          ) : (
            onOpenAdminLogin && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenAdminLogin();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono transition active:scale-95 shadow-md shadow-cyan-950/50"
              >
                <span>🔒 ADMIN LOGIN (DELETE & UPLOAD)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Admin Batch Delete Toolbar (Visible when in manage mode) */}
      {isManageMode && isAdmin && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-red-200 font-bold">
              {selectedVideoIds.length} of {filteredVideos.length} videos selected for deletion
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:text-white text-slate-300 transition"
            >
              {selectedVideoIds.length === filteredVideos.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              onClick={handleOpenBatchDeleteModal}
              disabled={selectedVideoIds.length === 0 || isDeletingBatch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold transition shadow-lg shadow-red-950"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE SELECTED ({selectedVideoIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080d19] p-3 rounded-xl border border-slate-800/90">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos, tags (#CyberIntel, #Tools)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#040710] border border-slate-700 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 hidden md:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'views' | 'size')}
            className="px-3 py-2 rounded-lg bg-[#040710] border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400"
          >
            <option value="newest">Newest First</option>
            <option value="views">Most Viewed</option>
            <option value="size">Largest Size</option>
          </select>
        </div>
      </div>

      {/* Category Tabs with Dynamic Categories + "+ Add Category" button for Admin */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {allTabs.map((cat) => {
          const isSelected = selectedCategory === cat;
          const isCustom = cat !== 'ALL' && cat !== 'FAVORITES';

          return (
            <div key={cat} className="relative flex items-center shrink-0">
              <button
                onClick={() => {
                  sounds.playClick();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-[#080d19] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{cat === 'FAVORITES' ? '❤️ FAVORITES' : cat}</span>
              </button>

              {/* Delete custom category button (Admin only) */}
              {isAdmin && isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCategoryDeleteModal(cat);
                  }}
                  className="ml-1 p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition"
                  title={`Delete category ${cat}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Category Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => {
              sounds.playClick();
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-300 text-xs font-mono whitespace-nowrap transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD CATEGORY</span>
          </button>
        )}
      </div>

      {/* Videos Grid Display */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={onPlayVideo}
              isAdmin={isAdmin}
              onDelete={onDeleteVideo}
              onRequestDelete={handleOpenSingleDeleteModal}
              onToggleFavorite={onToggleFavorite}
              isManageMode={isManageMode}
              isSelected={selectedVideoIds.includes(video.id)}
              onToggleSelect={toggleSelectVideo}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-[#080d19]/80 rounded-2xl border border-slate-800">
          <Film className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-cyber font-bold text-white">
            {searchQuery ? 'NO VIDEOS MATCH YOUR SEARCH' : 'OFFLINE VAULT IS EMPTY'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-md mx-auto mt-1">
            {searchQuery
              ? 'Try different keywords or tags.'
              : 'Admin mode se apni pasandeeda videos upload karein ya OBB data package load karein!'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {isAdmin ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenUpload();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-cyber font-bold text-xs tracking-wider transition"
              >
                <UploadCloud className="w-4 h-4" />
                UPLOAD VIDEO
              </button>
            ) : (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenUpload();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-mono text-xs transition"
              >
                🔒 LOGIN AS ADMIN TO UPLOAD
              </button>
            )}
            <button
              onClick={() => {
                sounds.playClick();
                onOpenObbEngine();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-cyber font-bold text-xs tracking-wider transition"
            >
              <HardDrive className="w-4 h-4" />
              LOAD OBB FILE
            </button>
          </div>
        </div>
      )}

      {/* Add Category Modal (Admin only) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-[#080d19] border-2 border-cyan-500/50 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-cyber font-bold text-white">NEW CUSTOM CATEGORY</h3>
                <p className="text-xs font-mono text-slate-400">
                  Will appear in tabs, upload menu, and exported OBB package
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  CATEGORY NAME
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Secret Operations, Gaming, Vlogs..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040710] border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-cyber font-bold text-xs tracking-wider transition"
                >
                  SAVE CATEGORY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#091124] border border-emerald-500/60 text-emerald-300 font-mono text-xs shadow-2xl shadow-emerald-950/80 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (Iframe safe - zero window.confirm) */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        itemCount={deleteModal.itemCount}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
