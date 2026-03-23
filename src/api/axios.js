// API client for mobile-bmr
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.bmrpog.com/api';

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'ERR_NETWORK'],
    retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Calculate delay with exponential backoff + jitter
const getRetryDelay = (attempt) => {
    const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay
    );
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
};

// Check if error is retryable
const isRetryableError = (error) => {
    // Network errors
    if (RETRY_CONFIG.retryableErrors.includes(error.code)) {
        return true;
    }
    // Timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return true;
    }
    // Server errors
    if (error.response && RETRY_CONFIG.retryableStatuses.includes(error.response.status)) {
        return true;
    }
    return false;
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to refresh completion
const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

// Notify all subscribers with new token
const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
};

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // ส่ง cookie ไปด้วยเพื่อ refresh token
});

// Retry interceptor - handles retryable errors with exponential backoff
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        
        // Skip if already retrying auth or if request was cancelled
        if (config._isRetry || config._retry || error.name === 'CanceledError') {
            return Promise.reject(error);
        }
        
        // Initialize retry count
        config._retryCount = config._retryCount || 0;
        
        // Check if we should retry
        if (isRetryableError(error) && config._retryCount < RETRY_CONFIG.maxRetries) {
            config._retryCount += 1;
            config._isRetry = true;
            
            const delay = getRetryDelay(config._retryCount - 1);
            
            if (__DEV__) {
                // console.log(`Retrying request (${config._retryCount}/${RETRY_CONFIG.maxRetries}) after ${delay}ms:`, config.url);
            }
            
            await sleep(delay);
            
            return api(config);
        }
        
        return Promise.reject(error);
    }
);

// Attach access token to every request
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 errors (token expired) - try refresh first
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, wait for it
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh token via API
                const refreshRes = await axios.post(
                    `${API_URL}/refresh-token`,
                    {},
                    { withCredentials: true }
                );

                const newToken = refreshRes.data.accessToken;

                // Save new token
                await AsyncStorage.setItem('accessToken', newToken);

                // Notify subscribers
                onRefreshed(newToken);
                isRefreshing = false;

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - force logout immediately
                isRefreshing = false;
                refreshSubscribers = [];

                // Clear storage
                await AsyncStorage.multiRemove(['accessToken', 'user']);

                // Force logout by setting global flag and reloading
                if (typeof global !== 'undefined') {
                    global.authExpired = true;

                    // Force app state update by importing store directly
                    try {
                        const useAuthStore = require('../store/authStore').default;
                        useAuthStore.setState({
                            user: null,
                            accessToken: null,
                            isLoggedIn: false,
                            isLoading: false,
                        });
                    } catch (e) {
                        if (__DEV__) {
                            console.log('Force logout error:', e);
                        }
                    }
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
