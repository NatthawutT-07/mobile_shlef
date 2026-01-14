// Auth store for mobile-bmr (with refresh token support)
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
    user: null,
    accessToken: null,
    isLoading: true,
    isLoggedIn: false,

    // Initialize auth state from storage
    initAuth: async () => {
        try {
            const [token, userJson] = await AsyncStorage.multiGet(['accessToken', 'user']);
            const accessToken = token[1];
            const user = userJson[1] ? JSON.parse(userJson[1]) : null;

            if (accessToken && user) {
                set({ accessToken, user, isLoggedIn: true, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Init auth error:', error);
            set({ isLoading: false });
        }
    },

    // Check auth expired (called from screens)
    checkAuthExpired: () => {
        if (typeof global !== 'undefined' && global.authExpired) {
            global.authExpired = false;
            get().forceLogout('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
            return true;
        }
        return false;
    },

    // Force logout with message
    forceLogout: async (message) => {
        await AsyncStorage.multiRemove(['accessToken', 'user']);

        set({
            user: null,
            accessToken: null,
            isLoggedIn: false,
        });

        // Show alert
        if (Platform.OS === 'web') {
            window.alert(message || 'กรุณาเข้าสู่ระบบใหม่');
        } else {
            Alert.alert('แจ้งเตือน', message || 'กรุณาเข้าสู่ระบบใหม่');
        }
    },

    // Login action
    actionLogin: async (form) => {
        const res = await api.post('/login', form);

        const userData = {
            ...res.data.payload,
            storecode: form.storecode || form.name,
            branchname: res.data.payload?.branchname || '',
        };

        // Save to storage
        await AsyncStorage.setItem('accessToken', res.data.accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));

        set({
            user: userData,
            accessToken: res.data.accessToken,
            isLoggedIn: true,
        });

        return res;
    },

    // Logout action - just clear local storage (no API call needed)
    logout: async () => {
        await AsyncStorage.multiRemove(['accessToken', 'user']);

        set({
            user: null,
            accessToken: null,
            isLoggedIn: false,
        });
    },
}));

export default useAuthStore;
