/**
 * CacheService - Local data caching for offline support
 * Stores API responses in AsyncStorage for offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@bmr_cache_';
const CACHE_EXPIRY_PREFIX = '@bmr_cache_expiry_';

// Default cache duration: 24 hours (in milliseconds)
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Cache keys
export const CACHE_KEYS = {
    PLANOGRAM: (branchCode) => `planogram_${branchCode}`,
    POG_REQUESTS: (branchCode) => `pog_requests_${branchCode}`,
    SHELVES: (branchCode) => `shelves_${branchCode}`,
    SHELF_HISTORY: (branchCode) => `shelf_history_${branchCode}`,
};

/**
 * Save data to cache with expiry
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} duration - Cache duration in ms (default: 24 hours)
 */
export async function setCache(key, data, duration = DEFAULT_CACHE_DURATION) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;
        const expiryTime = Date.now() + duration;

        await AsyncStorage.multiSet([
            [cacheKey, JSON.stringify(data)],
            [expiryKey, String(expiryTime)],
        ]);

        return true;
    } catch (error) {
        if (__DEV__) console.error('Cache set error:', error);
        return false;
    }
}

/**
 * Get data from cache (returns null if expired or not found)
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
export async function getCache(key) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;

        const [[, data], [, expiry]] = await AsyncStorage.multiGet([cacheKey, expiryKey]);

        if (!data || !expiry) {
            return null;
        }

        // Check if cache has expired
        if (Date.now() > parseInt(expiry, 10)) {
            // Cache expired, remove it
            await AsyncStorage.multiRemove([cacheKey, expiryKey]);
            return null;
        }

        return JSON.parse(data);
    } catch (error) {
        if (__DEV__) console.error('Cache get error:', error);
        return null;
    }
}

/**
 * Get data from cache even if expired (for offline fallback)
 * @param {string} key - Cache key
 * @returns {Object} { data, isExpired, cachedAt }
 */
export async function getCacheWithMeta(key) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;

        const [[, data], [, expiry]] = await AsyncStorage.multiGet([cacheKey, expiryKey]);

        if (!data) {
            return { data: null, isExpired: true, cachedAt: null };
        }

        const expiryTime = parseInt(expiry, 10);
        const isExpired = Date.now() > expiryTime;
        // Calculate when it was cached (expiry - duration)
        const cachedAt = expiryTime - DEFAULT_CACHE_DURATION;

        return {
            data: JSON.parse(data),
            isExpired,
            cachedAt,
        };
    } catch (error) {
        if (__DEV__) console.error('Cache getMeta error:', error);
        return { data: null, isExpired: true, cachedAt: null };
    }
}

/**
 * Remove specific cache entry
 * @param {string} key - Cache key
 */
export async function removeCache(key) {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const expiryKey = CACHE_EXPIRY_PREFIX + key;
        await AsyncStorage.multiRemove([cacheKey, expiryKey]);
        return true;
    } catch (error) {
        if (__DEV__) console.error('Cache remove error:', error);
        return false;
    }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache() {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(
            key => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
        );
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
        return true;
    } catch (error) {
        if (__DEV__) console.error('Cache clear error:', error);
        return false;
    }
}

/**
 * Get cache size info
 * @returns {Object} { count, keys }
 */
export async function getCacheInfo() {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
        return {
            count: cacheKeys.length,
            keys: cacheKeys.map(k => k.replace(CACHE_PREFIX, '')),
        };
    } catch (error) {
        if (__DEV__) console.error('Cache info error:', error);
        return { count: 0, keys: [] };
    }
}

/**
 * Format cache timestamp to readable string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export function formatCacheTime(timestamp) {
    if (!timestamp) return 'ไม่ทราบ';
    const date = new Date(timestamp);
    return date.toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default {
    setCache,
    getCache,
    getCacheWithMeta,
    removeCache,
    clearAllCache,
    getCacheInfo,
    formatCacheTime,
    CACHE_KEYS,
};
