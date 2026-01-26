import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Hide Android navigation bar for immersive experience
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}
