import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import useAuthStore from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import BranchSelectScreen from '../screens/BranchSelectScreen';
import HomeScreen from '../screens/HomeScreen';
import PlanogramScreen from '../screens/PlanogramScreen';
import PogRequestsScreen from '../screens/PogRequestsScreen';
import CreatePogRequestScreen from '../screens/CreatePogRequestScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import UpdateScreen from '../screens/UpdateScreen';

const Stack = createNativeStackNavigator();

// Auth stack (not logged in)
function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
                name="BranchSelect"
                component={BranchSelectScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="Update"
                component={UpdateScreen}
                options={{
                    animation: 'fade',
                }}
            />
        </Stack.Navigator>
    );
}

// App stack (logged in)
function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
                name="Planogram"
                component={PlanogramScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="PogRequests"
                component={PogRequestsScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="CreatePogRequest"
                component={CreatePogRequestScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="BarcodeScanner"
                component={BarcodeScannerScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="Update"
                component={UpdateScreen}
                options={{
                    animation: 'fade',
                }}
            />
        </Stack.Navigator>
    );
}

// Loading screen
function LoadingScreen() {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
        </View>
    );
}

export default function AppNavigator() {
    const isLoading = useAuthStore((s) => s.isLoading);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const initAuth = useAuthStore((s) => s.initAuth);

    useEffect(() => {
        initAuth();
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            {isLoggedIn ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
    },
});
