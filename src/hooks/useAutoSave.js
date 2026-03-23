/**
 * useAutoSave - Hook for auto-saving form data
 * Saves form state periodically and on changes
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { saveDraft, loadDraft, clearDraft, formatDraftTime } from '../services/draftService';

/**
 * Auto-save hook for forms
 * @param {string} draftKey - Unique key for this form
 * @param {object} formData - Current form data to save
 * @param {object} options - { interval, identifier, enabled }
 * @returns {object} { hasSavedDraft, savedAt, loadSavedDraft, clearSavedDraft, lastSaveTime }
 */
export function useAutoSave(draftKey, formData, options = {}) {
    const {
        interval = 10000, // 10 seconds default
        identifier = '',
        enabled = true,
    } = options;

    const [hasSavedDraft, setHasSavedDraft] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const [lastSaveTime, setLastSaveTime] = useState(null);
    const lastSavedRef = useRef(null);
    const timerRef = useRef(null);

    // Check for existing draft on mount
    useEffect(() => {
        const checkDraft = async () => {
            const draft = await loadDraft(draftKey, identifier);
            if (draft) {
                setHasSavedDraft(true);
                setSavedAt(draft.savedAt);
            }
        };
        if (enabled) {
            checkDraft();
        }
    }, [draftKey, identifier, enabled]);

    // Auto-save on interval
    useEffect(() => {
        if (!enabled) return;

        const save = async () => {
            // Only save if data has changed
            const dataStr = JSON.stringify(formData);
            if (dataStr !== lastSavedRef.current && dataStr !== '{}' && dataStr !== 'null') {
                await saveDraft(draftKey, formData, identifier);
                lastSavedRef.current = dataStr;
                setLastSaveTime(Date.now());
            }
        };

        timerRef.current = setInterval(save, interval);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [draftKey, formData, identifier, interval, enabled]);

    // Save on unmount if data changed
    useEffect(() => {
        return () => {
            if (enabled) {
                const dataStr = JSON.stringify(formData);
                if (dataStr !== lastSavedRef.current && dataStr !== '{}' && dataStr !== 'null') {
                    saveDraft(draftKey, formData, identifier);
                }
            }
        };
    }, [draftKey, formData, identifier, enabled]);

    // Load saved draft
    const loadSavedDraft = useCallback(async () => {
        const draft = await loadDraft(draftKey, identifier);
        if (draft) {
            setHasSavedDraft(false);
            setSavedAt(null);
            return draft.data;
        }
        return null;
    }, [draftKey, identifier]);

    // Clear saved draft
    const clearSavedDraft = useCallback(async () => {
        await clearDraft(draftKey, identifier);
        setHasSavedDraft(false);
        setSavedAt(null);
        lastSavedRef.current = null;
    }, [draftKey, identifier]);

    // Manual save
    const saveNow = useCallback(async () => {
        await saveDraft(draftKey, formData, identifier);
        lastSavedRef.current = JSON.stringify(formData);
        setLastSaveTime(Date.now());
    }, [draftKey, formData, identifier]);

    return {
        hasSavedDraft,
        savedAt,
        savedAtFormatted: savedAt ? formatDraftTime(savedAt) : null,
        loadSavedDraft,
        clearSavedDraft,
        saveNow,
        lastSaveTime,
    };
}

export default useAutoSave;
