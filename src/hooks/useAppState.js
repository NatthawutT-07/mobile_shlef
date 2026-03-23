/**
 * useAppState - Hook for handling app state changes
 * Detects background/foreground transitions
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { logAction, ACTION_TYPES } from '../services/actionLogService';

/**
 * Hook for app state changes
 * @param {object} callbacks - { onForeground, onBackground, onInactive }
 * @param {object} options - { logChanges, userId }
 */
export function useAppState(callbacks = {}, options = {}) {
    const { onForeground, onBackground, onInactive } = callbacks;
    const { logChanges = false, userId = '' } = options;
    
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            const prevState = appStateRef.current;

            // App came to foreground
            if (prevState.match(/inactive|background/) && nextAppState === 'active') {
                if (logChanges) {
                    logAction(ACTION_TYPES.APP_RESUME, { from: prevState }, userId);
                }
                onForeground?.();
            }

            // App went to background
            if (prevState === 'active' && nextAppState === 'background') {
                if (logChanges) {
                    logAction(ACTION_TYPES.APP_BACKGROUND, {}, userId);
                }
                onBackground?.();
            }

            // App became inactive (iOS only - transitioning)
            if (nextAppState === 'inactive') {
                onInactive?.();
            }

            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, [onForeground, onBackground, onInactive, logChanges, userId]);

    return appStateRef.current;
}

/**
 * Hook that refreshes data when app comes to foreground
 * @param {Function} refreshFn - Function to call on foreground
 * @param {object} options - { minInterval, enabled }
 */
export function useRefreshOnForeground(refreshFn, options = {}) {
    const { minInterval = 60000, enabled = true } = options; // 1 minute minimum
    const lastRefreshRef = useRef(Date.now());

    const handleForeground = useCallback(() => {
        if (!enabled) return;
        
        const now = Date.now();
        if (now - lastRefreshRef.current >= minInterval) {
            lastRefreshRef.current = now;
            refreshFn?.();
        }
    }, [refreshFn, minInterval, enabled]);

    useAppState({ onForeground: handleForeground });
}

export default useAppState;
