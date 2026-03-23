/**
 * SecureStorage - Secure token storage using expo-secure-store
 * More secure than AsyncStorage for sensitive data
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keys for secure storage
export const SECURE_KEYS = {
    ACCESS_TOKEN: 'bmr_access_token',
    REFRESH_TOKEN: 'bmr_refresh_token',
    USER_ID: 'bmr_user_id',
    LAST_ACTIVITY: 'bmr_last_activity',
};

// SecureStore options
const storeOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

/**
 * Save value securely
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
export async function secureSet(key, value) {
    try {
        // SecureStore only works on native platforms
        if (Platform.OS === 'web') {
            // Fallback to localStorage on web (less secure)
            localStorage.setItem(key, value);
            return true;
        }
        await SecureStore.setItemAsync(key, value, storeOptions);
        return true;
    } catch (error) {
        if (__DEV__) console.error('SecureStore set error:', error);
        return false;
    }
}

/**
 * Get value from secure storage
 * @param {string} key - Storage key
 * @returns {string|null}
 */
export async function secureGet(key) {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
    } catch (error) {
        if (__DEV__) console.error('SecureStore get error:', error);
        return null;
    }
}

/**
 * Delete value from secure storage
 * @param {string} key - Storage key
 */
export async function secureDelete(key) {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return true;
        }
        await SecureStore.deleteItemAsync(key);
        return true;
    } catch (error) {
        if (__DEV__) console.error('SecureStore delete error:', error);
        return false;
    }
}

/**
 * Clear all secure storage
 */
export async function secureClearAll() {
    try {
        await Promise.all(
            Object.values(SECURE_KEYS).map(key => secureDelete(key))
        );
        return true;
    } catch (error) {
        if (__DEV__) console.error('SecureStore clear all error:', error);
        return false;
    }
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity() {
    return secureSet(SECURE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Get last activity timestamp
 * @returns {number|null}
 */
export async function getLastActivity() {
    const timestamp = await secureGet(SECURE_KEYS.LAST_ACTIVITY);
    return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Check if session is idle (exceeded timeout)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10 minutes)
 * @returns {boolean}
 */
export async function isSessionIdle(timeoutMs = 10 * 60 * 1000) {
    const lastActivity = await getLastActivity();
    if (!lastActivity) return false;
    return (Date.now() - lastActivity) > timeoutMs;
}

export default {
    secureSet,
    secureGet,
    secureDelete,
    secureClearAll,
    updateLastActivity,
    getLastActivity,
    isSessionIdle,
    SECURE_KEYS,
};
