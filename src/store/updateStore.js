/**
 * Update Store - Zustand store for OTA update state
 */
import { create } from 'zustand';

const useUpdateStore = create((set, get) => ({
    // State
    hasUpdate: false,
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    updateManifest: null,
    error: null,
    skipUpdate: false,

    // Actions
    setHasUpdate: (hasUpdate, manifest = null) => set({
        hasUpdate,
        updateManifest: manifest,
    }),

    setChecking: (isChecking) => set({ isChecking }),

    setDownloading: (isDownloading) => set({ isDownloading }),

    setProgress: (progress) => set({ downloadProgress: progress }),

    setError: (error) => set({ error }),

    setSkipUpdate: (skip) => set({ skipUpdate: skip }),

    reset: () => set({
        hasUpdate: false,
        isChecking: false,
        isDownloading: false,
        downloadProgress: 0,
        updateManifest: null,
        error: null,
        skipUpdate: false,
    }),
}));

export default useUpdateStore;
