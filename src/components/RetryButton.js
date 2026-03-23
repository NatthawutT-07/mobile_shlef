/**
 * RetryButton - Reusable retry button for error states
 * Consistent UX for error recovery across the app
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { RefreshCw, WifiOff, AlertCircle } from 'lucide-react-native';
import { mediumFeedback } from '../utils/haptics';

/**
 * Retry Button Component
 */
export function RetryButton({ 
    onRetry, 
    loading = false, 
    text = 'ลองใหม่',
    style,
    size = 'medium' // 'small' | 'medium' | 'large'
}) {
    const handlePress = () => {
        mediumFeedback();
        onRetry?.();
    };

    const sizeStyles = {
        small: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, iconSize: 14 },
        medium: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, iconSize: 16 },
        large: { paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, iconSize: 18 },
    };

    const s = sizeStyles[size];

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { paddingHorizontal: s.paddingHorizontal, paddingVertical: s.paddingVertical },
                style
            ]}
            onPress={handlePress}
            disabled={loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <RefreshCw size={s.iconSize} color="#fff" />
                    <Text style={[styles.buttonText, { fontSize: s.fontSize }]}>{text}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

/**
 * Error State with Retry - Full component for error display
 */
export function ErrorWithRetry({
    message = 'เกิดข้อผิดพลาด',
    onRetry,
    loading = false,
    type = 'error', // 'error' | 'offline' | 'empty'
    style,
}) {
    const icons = {
        error: AlertCircle,
        offline: WifiOff,
        empty: AlertCircle,
    };
    const Icon = icons[type];

    const colors = {
        error: '#ef4444',
        offline: '#f97316',
        empty: '#94a3b8',
    };

    return (
        <View style={[styles.errorContainer, style]}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors[type]}15` }]}>
                <Icon size={32} color={colors[type]} />
            </View>
            <Text style={styles.errorMessage}>{message}</Text>
            {onRetry && (
                <RetryButton onRetry={onRetry} loading={loading} />
            )}
        </View>
    );
}

/**
 * Inline Retry Banner - Compact retry option
 */
export function InlineRetryBanner({
    message = 'โหลดข้อมูลไม่สำเร็จ',
    onRetry,
    loading = false,
    style,
}) {
    return (
        <View style={[styles.inlineBanner, style]}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.inlineMessage}>{message}</Text>
            <TouchableOpacity
                style={styles.inlineButton}
                onPress={() => {
                    mediumFeedback();
                    onRetry?.();
                }}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#10b981" />
                ) : (
                    <Text style={styles.inlineButtonText}>ลองใหม่</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        borderRadius: 10,
        gap: 8,
        minWidth: 100,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    errorContainer: {
        alignItems: 'center',
        padding: 24,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorMessage: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    inlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    inlineMessage: {
        flex: 1,
        fontSize: 13,
        color: '#991b1b',
    },
    inlineButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    inlineButtonText: {
        color: '#10b981',
        fontWeight: '600',
        fontSize: 13,
    },
});

export default RetryButton;
