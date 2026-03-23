/**
 * useDebounce - Custom hook for debouncing values and callbacks
 * Prevents rapid-fire API calls and duplicate submissions
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce a value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {any} Debounced value
 */
export function useDebounceValue(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounce a callback function
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} Debounced callback
 */
export function useDebounceCallback(callback, delay = 300) {
    const timeoutRef = useRef(null);
    const callbackRef = useRef(callback);

    // Update callback ref on every render
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * Prevent double-tap on buttons (immediate execution, then block)
 * @param {Function} callback - Function to execute
 * @param {number} blockTime - Time to block subsequent calls (default: 1000ms)
 * @returns {Function} Protected callback
 */
export function usePreventDoubleTap(callback, blockTime = 1000) {
    const isBlockedRef = useRef(false);
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const protectedCallback = useCallback((...args) => {
        if (isBlockedRef.current) {
            return;
        }

        isBlockedRef.current = true;
        callbackRef.current(...args);

        setTimeout(() => {
            isBlockedRef.current = false;
        }, blockTime);
    }, [blockTime]);

    return protectedCallback;
}

export default useDebounceValue;
