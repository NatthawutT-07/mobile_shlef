/**
 * LoadingStates - Consistent loading indicators across the app
 * Clear visual feedback for users during data operations
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Loader2, Package, ClipboardList, Scan } from 'lucide-react-native';

/**
 * Full Screen Loading
 */
export function FullScreenLoading({ message = 'กำลังโหลด...' }) {
    return (
        <View style={styles.fullScreen}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );
}

/**
 * Inline Loading Spinner
 */
export function InlineLoading({ message, size = 'small', color = '#10b981' }) {
    return (
        <View style={styles.inline}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.inlineText}>{message}</Text>}
        </View>
    );
}

/**
 * Card Loading Skeleton
 */
export function CardSkeleton({ count = 3 }) {
    return (
        <View style={styles.skeletonContainer}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={styles.skeletonCard}>
                    <View style={styles.skeletonHeader}>
                        <View style={[styles.skeletonBox, { width: 60, height: 20 }]} />
                        <View style={[styles.skeletonBox, { width: 80, height: 20 }]} />
                    </View>
                    <View style={[styles.skeletonBox, { width: '80%', height: 16, marginBottom: 8 }]} />
                    <View style={[styles.skeletonBox, { width: '60%', height: 14 }]} />
                </View>
            ))}
        </View>
    );
}

/**
 * Context-aware Loading Messages
 */
export function ContextLoading({ context = 'default', style }) {
    const contextConfig = {
        default: { message: 'กำลังโหลด...', icon: Loader2 },
        planogram: { message: 'กำลังโหลด Planogram...', icon: ClipboardList },
        product: { message: 'กำลังค้นหาสินค้า...', icon: Package },
        scan: { message: 'กำลังประมวลผล...', icon: Scan },
        submit: { message: 'กำลังส่งข้อมูล...', icon: Loader2 },
        save: { message: 'กำลังบันทึก...', icon: Loader2 },
    };

    const config = contextConfig[context] || contextConfig.default;
    const Icon = config.icon;

    return (
        <View style={[styles.contextLoading, style]}>
            <View style={styles.iconWrapper}>
                <Icon size={28} color="#10b981" />
            </View>
            <Text style={styles.contextText}>{config.message}</Text>
            <ActivityIndicator size="small" color="#10b981" style={styles.spinner} />
        </View>
    );
}

/**
 * Button Loading State
 */
export function ButtonLoading({ color = '#fff', size = 'small' }) {
    return <ActivityIndicator size={size} color={color} />;
}

/**
 * Pull to Refresh Header
 */
export function RefreshHeader({ refreshing }) {
    if (!refreshing) return null;
    return (
        <View style={styles.refreshHeader}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.refreshText}>กำลังรีเฟรช...</Text>
        </View>
    );
}

/**
 * Load More Footer
 */
export function LoadMoreFooter({ loading, hasMore, itemCount }) {
    if (loading) {
        return (
            <View style={styles.loadMoreFooter}>
                <ActivityIndicator size="small" color="#94a3b8" />
                <Text style={styles.loadMoreText}>กำลังโหลดเพิ่ม...</Text>
            </View>
        );
    }

    if (!hasMore && itemCount > 0) {
        return (
            <View style={styles.loadMoreFooter}>
                <Text style={styles.endText}>--- แสดงทั้งหมดแล้ว ---</Text>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: '#64748b',
    },
    inline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 10,
    },
    inlineText: {
        fontSize: 14,
        color: '#64748b',
    },
    skeletonContainer: {
        padding: 16,
        gap: 12,
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    skeletonBox: {
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
    },
    contextLoading: {
        alignItems: 'center',
        padding: 32,
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    contextText: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
        marginBottom: 12,
    },
    spinner: {
        marginTop: 4,
    },
    refreshHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    refreshText: {
        fontSize: 13,
        color: '#64748b',
    },
    loadMoreFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadMoreText: {
        fontSize: 13,
        color: '#94a3b8',
    },
    endText: {
        fontSize: 12,
        color: '#94a3b8',
    },
});

export default {
    FullScreenLoading,
    InlineLoading,
    CardSkeleton,
    ContextLoading,
    ButtonLoading,
    RefreshHeader,
    LoadMoreFooter,
};
