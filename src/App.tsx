import React, { useState, useEffect, useCallback } from 'react';
import { SnakeGame } from './components/SnakeGame';
import { Header } from './components/Header';
import { VideoVault } from './components/VideoVault';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { VideoUploadModal } from './components/VideoUploadModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ObbEngineModal } from './components/ObbEngineModal';
import { VideoItem } from './types';
import { vaultDb } from './services/db';
import { sounds } from './services/soundEffects';

export default function App() {
  // App starts with the Snake Game cover!
  // "APP OPEN KERE TO SNAKE WALI GAME AYA GAME MA 5 RED BOOLS KHYA TO APP MA VIDEO WLA PAGE KUL JYA"
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('ammar786');

  // Modals state
  const [activePlayingVideo, setActivePlayingVideo] = useState<VideoItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [isObbEngineModalOpen, setIsObbEngineModalOpen] = useState<boolean>(false);

  const [categories, setCategories] = useState<string[]>([
    'Cyber Intel',
    'Classified Vault',
    'Hacking & Tools',
    'Tutorials',
    'VIP Media',
  ]);

  // Load videos and categories from IndexedDB
  const reloadVideos = useCallback(async () => {
    try {
      // Seed demo videos if first time run
      await vaultDb.seedDemoVideosIfEmpty();
      const all = await vaultDb.getAllVideos();
      setVideos(all);

      // Load categories
      const cats = await vaultDb.getCategories();
      setCategories(cats);

      // Load saved admin passcode if customized
      const savedPass = await vaultDb.getSetting<string>('ammar_admin_pass', 'ammar786');
      if (savedPass) {
        setAdminPasscode(savedPass);
      }
    } catch (err) {
      console.error('Error loading vault database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadVideos();
  }, [reloadVideos]);

  // Add custom category
  const handleAddCategory = async (name: string) => {
    const updated = await vaultDb.addCategory(name);
    setCategories(updated);
  };

  // Delete category
  const handleDeleteCategory = async (name: string) => {
    const updated = await vaultDb.deleteCategory(name);
    setCategories(updated);
  };

  // Video playback
  const handlePlayVideo = async (video: VideoItem) => {
    setActivePlayingVideo(video);
    await vaultDb.incrementViews(video.id);
    // Update local state views count
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, views: (v.views || 0) + 1 } : v))
    );
  };

  // Video deletion (single)
  const handleDeleteVideo = async (id: string) => {
    await vaultDb.deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
    if (activePlayingVideo?.id === id) {
      setActivePlayingVideo(null);
    }
  };

  // Video deletion (batch)
  const handleBatchDeleteVideos = async (ids: string[]) => {
    for (const id of ids) {
      await vaultDb.deleteVideo(id);
    }
    setVideos((prev) => prev.filter((v) => !ids.includes(v.id)));
    if (activePlayingVideo && ids.includes(activePlayingVideo.id)) {
      setActivePlayingVideo(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const isFav = await vaultDb.toggleFavorite(id);
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isFavorite: isFav } : v))
    );
    if (activePlayingVideo?.id === id) {
      setActivePlayingVideo((prev) => (prev ? { ...prev, isFavorite: isFav } : null));
    }
  };

  // Video uploaded callback
  const handleVideoUploaded = (newVideo: VideoItem) => {
    setVideos((prev) => [newVideo, ...prev]);
  };

  // Admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    // If was in snake game, also unlock vault
    setIsVaultUnlocked(true);
  };

  // Lock vault back to Snake Cover Game
  const handleLockVault = () => {
    sounds.playClick();
    setIsVaultUnlocked(false);
    setActivePlayingVideo(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#05070e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 
        CONDITIONAL RENDER:
        1. If Vault is locked -> Show Snake Game disguised cover.
           Eating 5 Red Balls unlocks the Vault!
        2. If Vault is unlocked -> Show Main AMMAR H4CKER Video Vault Page.
      */}
      {!isVaultUnlocked ? (
        <SnakeGame
          onUnlockVault={() => {
            setIsVaultUnlocked(true);
          }}
          onAdminBypassRequest={() => {
            setIsAdminLoginModalOpen(true);
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col animate-fadeIn">
          {/* Top Professional Header: "AMMAR H4CKER" */}
          <Header
            isAdmin={isAdmin}
            onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            onAdminLogout={() => {
              setIsAdmin(false);
              sounds.playClick();
            }}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenObbEngine={() => setIsObbEngineModalOpen(true)}
            onLockVault={handleLockVault}
            totalVideosCount={videos.length}
          />

          {/* Main Video Vault Content Feed */}
          <main className="flex-1 pb-16">
            <VideoVault
              videos={videos}
              isAdmin={isAdmin}
              categories={categories}
              onPlayVideo={handlePlayVideo}
              onOpenUpload={() => {
                if (isAdmin) {
                  setIsUploadModalOpen(true);
                } else {
                  setIsAdminLoginModalOpen(true);
                }
              }}
              onOpenObbEngine={() => setIsObbEngineModalOpen(true)}
              onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
              onDeleteVideo={handleDeleteVideo}
              onBatchDeleteVideos={handleBatchDeleteVideos}
              onToggleFavorite={handleToggleFavorite}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </main>
        </div>
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        currentPasscode={adminPasscode}
      />

      {/* Video Upload Modal (Strictly Admin only) */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        isAdmin={isAdmin}
        categories={categories}
        onAddCategory={handleAddCategory}
        onClose={() => setIsUploadModalOpen(false)}
        onVideoUploaded={handleVideoUploaded}
      />

      {/* Free Fire Style OBB Data Engine Modal */}
      <ObbEngineModal
        isOpen={isObbEngineModalOpen}
        onClose={() => setIsObbEngineModalOpen(false)}
        onDataChanged={reloadVideos}
        totalVideosCount={videos.length}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={activePlayingVideo}
        onClose={() => setActivePlayingVideo(null)}
        isAdmin={isAdmin}
        onDeleteVideo={handleDeleteVideo}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
