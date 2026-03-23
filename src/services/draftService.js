/**
 * DraftService - Auto-save form drafts for data safety
 * Prevents data loss when app crashes or session expires
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@bmr_draft_';

// Draft keys for different forms
export const DRAFT_KEYS = {
    POG_REQUEST: 'pog_request',
    REGISTER_PRODUCT: 'register_product',
};

/**
 * Save draft data
 * @param {string} key - Draft key (e.g., 'pog_request')
 * @param {object} data - Form data to save
 * @param {string} identifier - Optional unique identifier (e.g., barcode)
 */
export async function saveDraft(key, data, identifier = '') {
    try {
        const draftKey = DRAFT_PREFIX + key + (identifier ? `_${identifier}` : '');
        const draftData = {
            data,
            savedAt: Date.now(),
        };
        await AsyncStorage.setItem(draftKey, JSON.stringify(draftData));
        return true;
    } catch (error) {
        if (__DEV__) console.error('Save draft error:', error);
        return false;
    }
}

/**
 * Load draft data
 * @param {string} key - Draft key
 * @param {string} identifier - Optional unique identifier
 * @returns {object|null} { data, savedAt } or null
 */
export async function loadDraft(key, identifier = '') {
    try {
        const draftKey = DRAFT_PREFIX + key + (identifier ? `_${identifier}` : '');
        const stored = await AsyncStorage.getItem(draftKey);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored);
        return {
            data: parsed.data,
            savedAt: parsed.savedAt,
        };
    } catch (error) {
        if (__DEV__) console.error('Load draft error:', error);
        return null;
    }
}

/**
 * Clear draft data
 * @param {string} key - Draft key
 * @param {string} identifier - Optional unique identifier
 */
export async function clearDraft(key, identifier = '') {
    try {
        const draftKey = DRAFT_PREFIX + key + (identifier ? `_${identifier}` : '');
        await AsyncStorage.removeItem(draftKey);
        return true;
    } catch (error) {
        if (__DEV__) console.error('Clear draft error:', error);
        return false;
    }
}

/**
 * Clear all drafts
 */
export async function clearAllDrafts() {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const draftKeys = allKeys.filter(key => key.startsWith(DRAFT_PREFIX));
        if (draftKeys.length > 0) {
            await AsyncStorage.multiRemove(draftKeys);
        }
        return true;
    } catch (error) {
        if (__DEV__) console.error('Clear all drafts error:', error);
        return false;
    }
}

/**
 * Check if draft exists and is recent (within 24 hours)
 * @param {string} key - Draft key
 * @param {string} identifier - Optional unique identifier
 * @returns {boolean}
 */
export async function hasDraft(key, identifier = '') {
    const draft = await loadDraft(key, identifier);
    if (!draft) return false;
    
    // Check if draft is within 24 hours
    const maxAge = 24 * 60 * 60 * 1000;
    return (Date.now() - draft.savedAt) < maxAge;
}

/**
 * Format draft save time
 * @param {number} timestamp
 * @returns {string}
 */
export function formatDraftTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default {
    saveDraft,
    loadDraft,
    clearDraft,
    clearAllDrafts,
    hasDraft,
    formatDraftTime,
    DRAFT_KEYS,
};
