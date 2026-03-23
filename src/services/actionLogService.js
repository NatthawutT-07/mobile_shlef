/**
 * ActionLogService - Local action history for audit and recovery
 * Logs user actions locally for troubleshooting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = '@bmr_action_log';
const MAX_LOG_ENTRIES = 100;

// Action types
export const ACTION_TYPES = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    SCAN_BARCODE: 'SCAN_BARCODE',
    CREATE_POG_REQUEST: 'CREATE_POG_REQUEST',
    CANCEL_POG_REQUEST: 'CANCEL_POG_REQUEST',
    VIEW_PLANOGRAM: 'VIEW_PLANOGRAM',
    REGISTER_PRODUCT: 'REGISTER_PRODUCT',
    ACKNOWLEDGE_SHELF_UPDATE: 'ACKNOWLEDGE_SHELF_UPDATE',
    APP_RESUME: 'APP_RESUME',
    APP_BACKGROUND: 'APP_BACKGROUND',
    NETWORK_CHANGE: 'NETWORK_CHANGE',
    ERROR: 'ERROR',
};

/**
 * Log an action
 * @param {string} actionType - Action type from ACTION_TYPES
 * @param {object} details - Additional details
 * @param {string} userId - User identifier
 */
export async function logAction(actionType, details = {}, userId = '') {
    try {
        const logs = await getActionLogs();
        
        const newEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            type: actionType,
            details,
            userId,
            timestamp: Date.now(),
        };

        // Add new entry and trim to max size
        logs.unshift(newEntry);
        const trimmedLogs = logs.slice(0, MAX_LOG_ENTRIES);

        await AsyncStorage.setItem(LOG_KEY, JSON.stringify(trimmedLogs));
        return newEntry.id;
    } catch (error) {
        if (__DEV__) console.error('Log action error:', error);
        return null;
    }
}

/**
 * Get all action logs
 * @returns {Array} Array of log entries
 */
export async function getActionLogs() {
    try {
        const stored = await AsyncStorage.getItem(LOG_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        if (__DEV__) console.error('Get action logs error:', error);
        return [];
    }
}

/**
 * Get recent actions (last N entries)
 * @param {number} count - Number of entries to retrieve
 * @returns {Array}
 */
export async function getRecentActions(count = 10) {
    const logs = await getActionLogs();
    return logs.slice(0, count);
}

/**
 * Get actions by type
 * @param {string} actionType
 * @returns {Array}
 */
export async function getActionsByType(actionType) {
    const logs = await getActionLogs();
    return logs.filter(log => log.type === actionType);
}

/**
 * Clear all action logs
 */
export async function clearActionLogs() {
    try {
        await AsyncStorage.removeItem(LOG_KEY);
        return true;
    } catch (error) {
        if (__DEV__) console.error('Clear action logs error:', error);
        return false;
    }
}

/**
 * Log error with context
 * @param {Error} error
 * @param {string} context - Where the error occurred
 * @param {string} userId
 */
export async function logError(error, context = '', userId = '') {
    return logAction(ACTION_TYPES.ERROR, {
        message: error?.message || String(error),
        context,
        stack: __DEV__ ? error?.stack : undefined,
    }, userId);
}

/**
 * Export logs as string (for debugging/support)
 * @returns {string}
 */
export async function exportLogs() {
    const logs = await getActionLogs();
    return JSON.stringify(logs, null, 2);
}

export default {
    logAction,
    getActionLogs,
    getRecentActions,
    getActionsByType,
    clearActionLogs,
    logError,
    exportLogs,
    ACTION_TYPES,
};
