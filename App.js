import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { NetworkProvider } from './src/contexts/NetworkContext';

export default function App() {
  useEffect(() => {
    // Hide Android navigation bar for immersive experience
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </NetworkProvider>
    </ErrorBoundary>
  );
}
