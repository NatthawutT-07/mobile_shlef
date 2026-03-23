/**
 * Haptics - Haptic feedback utilities
 * Provides tactile feedback for user interactions
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Light haptic feedback (for selections, toggles)
 */
export async function lightFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
        // Ignore errors - haptics may not be available
    }
}

/**
 * Medium haptic feedback (for button presses)
 */
export async function mediumFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Heavy haptic feedback (for important actions)
 */
export async function heavyFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Success haptic feedback
 */
export async function successFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Warning haptic feedback
 */
export async function warningFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Error haptic feedback
 */
export async function errorFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Selection changed feedback (for pickers, lists)
 */
export async function selectionFeedback() {
    if (Platform.OS === 'web') return;
    try {
        await Haptics.selectionAsync();
    } catch (e) {
        // Ignore errors
    }
}

export default {
    lightFeedback,
    mediumFeedback,
    heavyFeedback,
    successFeedback,
    warningFeedback,
    errorFeedback,
    selectionFeedback,
};
