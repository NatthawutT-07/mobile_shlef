/**
 * OfflineIndicator - Shows offline status banner
 * Displays when device is not connected to internet
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, CloudOff } from 'lucide-react-native';
import { useNetwork } from '../contexts/NetworkContext';

export function OfflineBanner({ style }) {
    const { isConnected, isInternetReachable } = useNetwork();
    const isOffline = !isConnected || !isInternetReachable;

    if (!isOffline) return null;

    return (
        <View style={[styles.banner, style]}>
            <WifiOff size={16} color="#fff" />
            <Text style={styles.bannerText}>
                ออฟไลน์ - กำลังแสดงข้อมูลที่บันทึกไว้
            </Text>
        </View>
    );
}

export function OfflineBadge({ style }) {
    const { isConnected, isInternetReachable } = useNetwork();
    const isOffline = !isConnected || !isInternetReachable;

    if (!isOffline) return null;

    return (
        <View style={[styles.badge, style]}>
            <CloudOff size={12} color="#f97316" />
            <Text style={styles.badgeText}>ออฟไลน์</Text>
        </View>
    );
}

export function CachedDataNotice({ cachedAt, style }) {
    if (!cachedAt) return null;

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        return `${diffDays} วันที่แล้ว`;
    };

    return (
        <View style={[styles.cachedNotice, style]}>
            <CloudOff size={14} color="#64748b" />
            <Text style={styles.cachedText}>
                ข้อมูลจาก {formatTime(cachedAt)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#f97316',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
    },
    bannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    badgeText: {
        color: '#f97316',
        fontSize: 11,
        fontWeight: '600',
    },
    cachedNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    cachedText: {
        color: '#64748b',
        fontSize: 12,
    },
});

export default OfflineBanner;
