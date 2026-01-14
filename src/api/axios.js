// API client for mobile-bmr
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.bmrpog.com/api';

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
                // Refresh failed - force logout
                isRefreshing = false;
                refreshSubscribers = [];

                // Clear storage
                await AsyncStorage.multiRemove(['accessToken', 'user']);

                // Dispatch event to notify app (will be caught by auth store)
                if (typeof global !== 'undefined') {
                    global.authExpired = true;
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
