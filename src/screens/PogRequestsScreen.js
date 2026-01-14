import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl,
    Alert,
    Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';
import { getMyPogRequests, cancelPogRequest } from '../api/user';

const STATUS_MAP = {
    pending: { label: 'รอดำเนินการ', bgColor: '#fef3c7', textColor: '#92400e' },
    approved: { label: 'อนุมัติ', bgColor: '#dbeafe', textColor: '#1e40af' },
    rejected: { label: 'ไม่อนุมัติ', bgColor: '#fee2e2', textColor: '#991b1b' },
    completed: { label: 'เสร็จสิ้น', bgColor: '#d1fae5', textColor: '#065f46' },
    cancelled: { label: 'ยกเลิก', bgColor: '#f1f5f9', textColor: '#475569' },
};

const ACTION_MAP = {
    add: '➕ เพิ่ม',
    move: '↔️ ย้าย',
    swap: '🔄 สลับ',
    delete: '🗑️ ลบ',
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function PogRequestsScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [cancellingId, setCancellingId] = useState(null);

    const loadData = async (isRefresh = false) => {
        if (!storecode) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const result = await getMyPogRequests(storecode);
            setData(result?.data || []);
        } catch (err) {
            console.error('Load POG requests error:', err);
            setData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [storecode]);

    const handleCancel = async (id) => {
        // Alert.alert ไม่ทำงานบน web ใช้ confirm แทน
        const confirmed = Platform.OS === 'web'
            ? window.confirm('คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?')
            : await new Promise((resolve) => {
                Alert.alert(
                    'ยกเลิกคำขอ',
                    'คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?',
                    [
                        { text: 'ไม่', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'ยกเลิก', style: 'destructive', onPress: () => resolve(true) },
                    ]
                );
            });

        if (!confirmed) return;

        setCancellingId(id);
        try {
            const result = await cancelPogRequest(id);
            if (result?.ok) {
                setData((prev) =>
                    prev.map((item) =>
                        item.id === id ? { ...item, status: 'cancelled' } : item
                    )
                );
            }
        } catch (err) {
            console.error('Cancel error:', err);
            if (Platform.OS === 'web') {
                window.alert('ไม่สามารถยกเลิกคำขอได้');
            } else {
                Alert.alert('ผิดพลาด', 'ไม่สามารถยกเลิกคำขอได้');
            }
        } finally {
            setCancellingId(null);
        }
    };

    const renderRequestItem = ({ item }) => {
        const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
        const actionLabel = ACTION_MAP[item.action] || item.action;

        return (
            <View style={styles.requestCard}>
                {/* Header: Status + Action */}
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                    <Text style={styles.actionLabel}>{actionLabel}</Text>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>

                {/* Product Info */}
                <View style={styles.productSection}>
                    <Text style={styles.productName} numberOfLines={1}>
                        {item.productName || '-'}
                    </Text>
                    <Text style={styles.barcodeText}>({item.barcode})</Text>
                </View>

                {/* Location Info */}
                <View style={styles.locationSection}>
                    {item.fromShelf && (
                        <Text style={styles.locationText}>
                            จาก: {item.fromShelf}/{item.fromRow}/{item.fromIndex}
                        </Text>
                    )}
                    {item.fromShelf && item.toShelf && <Text style={styles.arrow}>→</Text>}
                    {item.toShelf && (
                        <Text style={styles.locationText}>
                            ไป: {item.toShelf}/{item.toRow}/{item.toIndex}
                        </Text>
                    )}
                </View>

                {/* Note */}
                {item.note && (
                    <View style={styles.noteSection}>
                        <Text style={styles.noteText} numberOfLines={2}>
                            📝 {item.note}
                        </Text>
                    </View>
                )}

                {/* Cancel Button (only for pending) */}
                {item.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancel(item.id)}
                        disabled={cancellingId === item.id}
                    >
                        {cancellingId === item.id ? (
                            <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                            <Text style={styles.cancelButtonText}>ยกเลิกคำขอ</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>ประวัติคำขอ POG</Text>
                    <Text style={styles.subtitle}>
                        {storecode} - ทั้งหมด {data.length} รายการ
                    </Text>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderRequestItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                            tintColor="#10b981"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyText}>ไม่มีประวัติคำขอ</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
        paddingTop: 24,
        paddingBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        paddingRight: 12,
    },
    backButtonText: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: '500',
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    listContent: {
        padding: 12,
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        marginLeft: 10,
        flex: 1,
    },
    dateText: {
        fontSize: 11,
        color: '#9ca3af',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    productSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    productName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
        flex: 1,
    },
    barcodeText: {
        fontSize: 11,
        color: '#94a3b8',
        marginLeft: 8,
    },
    locationSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 12,
        color: '#64748b',
    },
    arrow: {
        fontSize: 12,
        color: '#9ca3af',
        marginHorizontal: 8,
    },
    noteSection: {
        backgroundColor: '#fef3c7',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    noteText: {
        fontSize: 12,
        color: '#92400e',
    },
    cancelButton: {
        alignSelf: 'flex-end',
        backgroundColor: '#fef2f2',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    cancelButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#dc2626',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
    },
});
