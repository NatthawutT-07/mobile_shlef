/**
 * UpdateScreen - OTA Update Progress Screen
 * Shows download progress and status during OTA update
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import useUpdateStore from '../store/updateStore';

export default function UpdateScreen({ navigation }) {
    const setDownloading = useUpdateStore((s) => s.setDownloading);
    const setProgress = useUpdateStore((s) => s.setProgress);
    const setError = useUpdateStore((s) => s.setError);
    const reset = useUpdateStore((s) => s.reset);

    const [status, setStatus] = useState('preparing');
    const [progress, setProgressLocal] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        startUpdate();
    }, []);

    const startUpdate = async () => {
        try {
            setStatus('downloading');
            setDownloading(true);

            // Simulate progress for better UX (expo-updates doesn't provide real progress)
            const progressInterval = setInterval(() => {
                setProgressLocal((prev) => {
                    const next = prev + Math.random() * 15;
                    if (next >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return next;
                });
            }, 300);

            // Fetch the update
            const update = await Updates.fetchUpdateAsync();

            clearInterval(progressInterval);
            setProgressLocal(100);
            setProgress(100);

            if (update.isNew) {
                setStatus('installing');

                // Wait a moment to show 100%
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Reload the app
                setStatus('reloading');
                await Updates.reloadAsync();
            } else {
                setStatus('complete');
                setDownloading(false);

                // Go back if no new update
                setTimeout(() => {
                    navigation.goBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Update error:', err);
            setStatus('error');
            setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอัพเดท');
            setError(err.message);
            setDownloading(false);
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'preparing':
                return 'กำลังเตรียมอัพเดท...';
            case 'downloading':
                return 'กำลังดาวน์โหลด...';
            case 'installing':
                return 'กำลังติดตั้ง...';
            case 'reloading':
                return 'กำลังรีโหลดแอพ...';
            case 'complete':
                return 'อัพเดทเสร็จสิ้น!';
            case 'error':
                return 'เกิดข้อผิดพลาด';
            default:
                return 'กำลังอัพเดท...';
        }
    };

    const getStatusEmoji = () => {
        switch (status) {
            case 'error':
                return '';
            case 'complete':
                return '';
            default:
                return '';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <Text style={styles.icon}>{getStatusEmoji()}</Text>

                {/* Title */}
                <Text style={styles.title}>อัพเดทแอพพลิเคชัน</Text>

                {/* Status */}
                <Text style={styles.status}>{getStatusText()}</Text>

                {/* Progress Bar */}
                {status !== 'error' && status !== 'complete' && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.min(progress, 100)}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round(progress)}%
                        </Text>
                    </View>
                )}

                {/* Loading indicator */}
                {status !== 'error' && status !== 'complete' && (
                    <ActivityIndicator
                        size="large"
                        color="#10b981"
                        style={styles.spinner}
                    />
                )}

                {/* Error message */}
                {status === 'error' && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}

                {/* Info */}
                <Text style={styles.infoText}>
                    {status === 'error'
                        ? 'กรุณาปิดแอพแล้วเปิดใหม่'
                        : 'กรุณาอย่าปิดแอพระหว่างอัพเดท'}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    icon: {
        fontSize: 64,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 32,
    },
    progressContainer: {
        width: '100%',
        maxWidth: 300,
        marginBottom: 24,
    },
    progressBar: {
        height: 12,
        backgroundColor: '#1e293b',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 6,
    },
    progressText: {
        fontSize: 14,
        color: '#10b981',
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '600',
    },
    spinner: {
        marginTop: 16,
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
    },
    infoText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 32,
        textAlign: 'center',
    },
});
