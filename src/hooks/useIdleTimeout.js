/**
 * useIdleTimeout - Auto logout after inactivity
 * Tracks user activity and triggers logout when idle
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { updateLastActivity, isSessionIdle } from '../services/secureStorage';

// Default idle timeout: 10 minutes
const DEFAULT_IDLE_TIMEOUT = 10 * 60 * 1000;

/**
 * Hook for auto-logout on idle
 * @param {Function} onIdle - Callback when idle timeout reached
 * @param {object} options - { timeout, enabled, checkInterval }
 */
export function useIdleTimeout(onIdle, options = {}) {
    const {
        timeout = DEFAULT_IDLE_TIMEOUT,
        enabled = true,
        checkInterval = 60000, // Check every minute
    } = options;

    const lastActivityRef = useRef(Date.now());
    const intervalRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);

    // Update activity timestamp
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        updateLastActivity();
    }, []);

    // Check if idle
    const checkIdle = useCallback(async () => {
        if (!enabled) return;

        const idle = await isSessionIdle(timeout);
        if (idle) {
            onIdle?.();
        }
    }, [enabled, timeout, onIdle]);

    // Set up interval check
    useEffect(() => {
        if (!enabled) return;

        // Initial activity update
        updateActivity();

        // Set up periodic check
        intervalRef.current = setInterval(checkIdle, checkInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, checkInterval, checkIdle, updateActivity]);

    // Check on app foreground
    useEffect(() => {
        if (!enabled) return;

        const handleAppStateChange = async (nextAppState) => {
            // App came to foreground
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                await checkIdle();
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, [enabled, checkIdle]);

    return {
        updateActivity,
        checkIdle,
    };
}

/**
 * Hook to track user interactions and update activity
 * Call updateActivity on significant user actions
 */
export function useActivityTracker() {
    const updateActivity = useCallback(() => {
        updateLastActivity();
    }, []);

    return { updateActivity };
}

export default useIdleTimeout;
