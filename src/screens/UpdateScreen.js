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
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react-native';
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

    const getStatusInfo = () => {
        switch (status) {
            case 'preparing':
                return { text: 'กำลังเตรียมอัพเดท...', icon: Loader2, color: '#f59e0b', spin: true };
            case 'downloading':
                return { text: 'กำลังดาวน์โหลดข้อมูล...', icon: Download, color: '#3b82f6', spin: false };
            case 'installing':
                return { text: 'กำลังติดตั้ง...', icon: RefreshCw, color: '#8b5cf6', spin: true };
            case 'reloading':
                return { text: 'กำลังรีโหลดแอพ...', icon: RefreshCw, color: '#10b981', spin: true };
            case 'complete':
                return { text: 'อัพเดทเสร็จสิ้น!', icon: CheckCircle2, color: '#10b981', spin: false };
            case 'error':
                return { text: 'เกิดข้อผิดพลาด', icon: XCircle, color: '#ef4444', spin: false };
            default:
                return { text: 'กำลังอัพเดท...', icon: Loader2, color: '#64748b', spin: true };
        }
    };

    const StatusIcon = getStatusInfo().icon;
    const { text, color, spin } = getStatusInfo();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                {/* Icon Circle */}
                <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
                    {spin ? (
                        <ActivityIndicator size="large" color={color} />
                    ) : (
                        <StatusIcon size={48} color={color} />
                    )}
                </View>

                {/* Title */}
                <Text style={styles.title}>อัพเดทแอพพลิเคชัน</Text>

                {/* Status */}
                <Text style={[styles.status, { color }]}>{text}</Text>

                {/* Progress Bar */}
                {status !== 'error' && status !== 'complete' && (
                    <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
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

                {/* Error message */}
                {status === 'error' && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorMsg || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={startUpdate}>
                            <RefreshCw size={16} color="#fff" />
                            <Text style={styles.retryText}>ลองใหม่อีกครั้ง</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Info Text */}
                <View style={styles.infoContainer}>
                    <AlertCircle size={14} color="#64748b" style={{ marginTop: 2 }} />
                    <Text style={styles.infoText}>
                        {status === 'error'
                            ? 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
                            : 'กรุณาอย่าปิดแอพหรือออกจากหน้านี้ระหว่างการอัพเดท'}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // Slate 900
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 32,
    },

    // Progress
    progressSection: {
        width: '100%',
        marginBottom: 24,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 5,
        overflow: 'hidden',
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 5,
    },
    progressText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 8,
        fontWeight: '600',
    },

    // Error
    errorBox: {
        width: '100%',
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Info
    infoContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    infoText: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
    },
});
