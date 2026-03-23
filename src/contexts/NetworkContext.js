/**
 * NetworkContext - Provides network connectivity status across the app
 * Uses @react-native-community/netinfo for accurate connection detection
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
    checkConnection: () => Promise.resolve(true),
});

export function NetworkProvider({ children }) {
    const [networkState, setNetworkState] = useState({
        isConnected: true,
        isInternetReachable: true,
        connectionType: 'unknown',
    });

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener(state => {
            setNetworkState({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable ?? false,
                connectionType: state.type,
            });
        });

        // Get initial state
        NetInfo.fetch().then(state => {
            setNetworkState({
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable ?? false,
                connectionType: state.type,
            });
        });

        return () => unsubscribe();
    }, []);

    // Manual check function
    const checkConnection = useCallback(async () => {
        const state = await NetInfo.fetch();
        const connected = state.isConnected && state.isInternetReachable;
        setNetworkState({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? false,
            connectionType: state.type,
        });
        return connected;
    }, []);

    return (
        <NetworkContext.Provider value={{ ...networkState, checkConnection }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}

export default NetworkContext;
