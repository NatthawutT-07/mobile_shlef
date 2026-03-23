/**
 * useAbortController - Custom hook for managing AbortController
 * Automatically cancels pending requests on component unmount
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Creates an AbortController that auto-aborts on unmount
 * @returns {Object} { getSignal, abort, isAborted }
 */
export function useAbortController() {
    const controllerRef = useRef(null);

    // Create new controller
    const createController = useCallback(() => {
        // Abort previous if exists
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();
        return controllerRef.current;
    }, []);

    // Get signal for current controller (creates if needed)
    const getSignal = useCallback(() => {
        if (!controllerRef.current || controllerRef.current.signal.aborted) {
            createController();
        }
        return controllerRef.current.signal;
    }, [createController]);

    // Manually abort current controller
    const abort = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
    }, []);

    // Check if current controller is aborted
    const isAborted = useCallback(() => {
        return controllerRef.current?.signal?.aborted ?? false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, []);

    return { getSignal, abort, isAborted, createController };
}

/**
 * Hook for making cancellable API calls
 * @param {Function} apiCall - Async function that accepts signal as parameter
 * @returns {Object} { execute, cancel, isLoading, error }
 */
export function useCancellableRequest() {
    const controllerRef = useRef(null);
    
    const execute = useCallback(async (apiCall) => {
        // Cancel any existing request
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
        
        // Create new controller
        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;
        
        try {
            const result = await apiCall(signal);
            return result;
        } catch (error) {
            // Don't throw if it was cancelled
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                return null;
            }
            throw error;
        }
    }, []);

    const cancel = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, []);

    return { execute, cancel };
}

export default useAbortController;
