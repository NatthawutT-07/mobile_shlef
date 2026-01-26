/**
 * PogRequestsScreen - POG Request History Screen
 * Displays list of POG change requests with status and cancellation options
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Clock, CheckCircle2, XCircle,
    AlertTriangle, Trash2, ArrowRightLeft, Plus,
    Calendar, MapPin
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import { getMyPogRequests, cancelPogRequest } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Status display configuration */
const STATUS_MAP = {
    pending: { label: 'รอดำเนินการ', bgColor: '#fef3c7', textColor: '#b45309', icon: Clock },
    approved: { label: 'อนุมัติ', bgColor: '#dcfce7', textColor: '#15803d', icon: CheckCircle2 },
    rejected: { label: 'ไม่อนุมัติ', bgColor: '#fee2e2', textColor: '#b91c1c', icon: XCircle },
    completed: { label: 'เสร็จสิ้น', bgColor: '#dcfce7', textColor: '#15803d', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', bgColor: '#f1f5f9', textColor: '#64748b', icon: XCircle },
};

/** Action type labels */
const ACTION_MAP = {
    add: { label: 'นำสินค้าเข้า', icon: Plus, color: '#10b981', bg: '#ecfdf5' },
    move: { label: 'เปลี่ยนตำแหน่งสินค้า', icon: ArrowRightLeft, color: '#3b82f6', bg: '#eff6ff' },
    swap: { label: 'สลับตำแหน่ง', icon: ArrowRightLeft, color: '#f59e0b', bg: '#fffbeb' },
    delete: { label: 'นำสินค้าออก', icon: Trash2, color: '#ef4444', bg: '#fef2f2' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PogRequestsScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const hasMoreRef = useRef(true); // Ref for synchronous check
    const [cancellingId, setCancellingId] = useState(null);

    // Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [targetCancelId, setTargetCancelId] = useState(null);

    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

    const loadData = async (isRefresh = false, isLoadMore = false) => {
        if (!storecode) return;
        if (!hasMore && isLoadMore) return;
        if (loadingMore) return;

        const targetPage = isRefresh ? 1 : (isLoadMore ? page + 1 : 1);
        const limit = 20;

        if (isRefresh) {
            setRefreshing(true);
            setHasMore(true);
            hasMoreRef.current = true;
        } else if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const result = await getMyPogRequests(storecode, targetPage, limit);
            const newData = result?.data || [];

            if (isRefresh || (!isLoadMore)) {
                setData(newData);
                setPage(1);
            } else {
                setData(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const uniqueNewData = newData.filter(item => !existingIds.has(item.id));
                    return [...prev, ...uniqueNewData];
                });
                setPage(targetPage);
            }

            // Check if we have more data based on total count
            const total = result?.pagination?.total || 0;
            setTotalCount(total);

            const currentTotal = isRefresh || !isLoadMore
                ? newData.length
                : data.length + newData.filter(item => !new Set(data.map(d => d.id)).has(item.id)).length;

            if (currentTotal >= total || newData.length < limit) {
                setHasMore(false);
                hasMoreRef.current = false;
            } else {
                setHasMore(true);
                hasMoreRef.current = true;
            }

        } catch (err) {
            console.error('Load POG requests error:', err);
            if (!isLoadMore) setData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [storecode]);

    const handleCancelPress = (id) => {
        setTargetCancelId(id);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        const id = targetCancelId;
        setShowCancelModal(false);
        setTargetCancelId(null);

        if (!id) return;

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
            console.error('Cancel request error:', err);
            const msg = getErrorMessage(err, 'ไม่สามารถยกเลิกคำขอได้');
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('ผิดพลาด', msg);
            }
        } finally {
            setCancellingId(null);
        }
    };

    const renderRequestItem = ({ item, index }) => {
        const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
        const actionInfo = ACTION_MAP[item.action] || { label: item.action, icon: AlertTriangle, color: '#64748b', bg: '#f1f5f9' };
        const StatusIcon = statusInfo.icon;
        const ActionIcon = actionInfo.icon;

        return (
            <View style={styles.requestCard}>
                {/* Header: Index, Action & Status */}
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>#{index + 1}</Text>
                        <View style={[styles.actionBadge, { backgroundColor: actionInfo.bg }]}>
                            <ActionIcon size={14} color={actionInfo.color} />
                            <Text style={[styles.actionText, { color: actionInfo.color }]}>{actionInfo.label}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        <StatusIcon size={12} color={statusInfo.textColor} />
                        <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                {/* Product Info */}
                <View style={styles.productSection}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {item.productName || 'ไม่ระบุชื่อสินค้า'}
                    </Text>
                    <Text style={styles.barcodeText}>{item.barcode}</Text>
                </View>

                {/* Location Info */}
                <View style={styles.locationSection}>
                    <View style={styles.locationRow}>
                        <MapPin size={14} color="#94a3b8" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.fromShelf && `${item.fromShelf} / ชั้น ${item.fromRow || '-'} / ลำดับ ${item.fromIndex || '-'}`}
                            {(item.fromShelf && item.toShelf) && ' → '}
                            {item.toShelf && `${item.toShelf} / ชั้น ${item.toRow || '-'} / ลำดับ ${item.toIndex || '-'}`}
                        </Text>
                    </View>
                    <View style={styles.dateRow}>
                        <Calendar size={14} color="#94a3b8" />
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>

                {/* Cancel Button (Only if pending) */}
                {item.status === 'pending' && (
                    <View style={styles.cardFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => handleCancelPress(item.id)}
                            disabled={cancellingId === item.id}
                        >
                            {cancellingId === item.id ? (
                                <ActivityIndicator size="small" color="#dc2626" />
                            ) : (
                                <Text style={styles.cancelButtonText}>ยกเลิกคำขอ</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#10b981" />
                    <Text style={styles.backButtonText}>กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>ประวัติคำขอ</Text>
                    <Text style={styles.subtitle}>
                        {branchName} • {data.length} รายการ
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
                    onEndReached={() => {
                        if (hasMoreRef.current && !loading && !loadingMore) {
                            loadData(false, true);
                        }
                    }}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color="#94a3b8" />
                            </View>
                        ) : (
                            !hasMore && data.length > 0 ? (
                                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>--- ครบถ้วน ---</Text>
                                </View>
                            ) : null
                        )
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Clock size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>ไม่มีประวัติคำขอ</Text>
                        </View>
                    }
                />
            )}

            {/* Cancel Confirmation Modal */}
            <Modal visible={showCancelModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalIconCircle}>
                            <AlertTriangle size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.modalTitle}>ยืนยันการยกเลิก</Text>
                        <Text style={styles.modalMessage}>คุณต้องการยกเลิกรายการนี้หรือไม่?</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnCancel]}
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text style={styles.btnTextCancel}>เก็บไว้</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnConfirm]}
                                onPress={confirmCancel}
                            >
                                <Text style={styles.btnTextConfirm}>ยกเลิกเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        gap: 4,
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
        fontSize: 17,
        fontWeight: '600',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },

    // List
    listContent: {
        padding: 16,
        gap: 12,
    },

    // Card
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Product Info
    productSection: {
        marginBottom: 12,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        lineHeight: 22,
        marginBottom: 4,
    },
    barcodeText: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // Location Info
    locationSection: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 10,
        gap: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationText: {
        fontSize: 13,
        color: '#475569',
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        fontSize: 12,
        color: '#94a3b8',
    },

    // Footer
    cardFooter: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 12,
        alignItems: 'flex-end',
    },
    cancelButton: {
        backgroundColor: '#fff1f2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    cancelButtonText: {
        color: '#be123c',
        fontSize: 12,
        fontWeight: '600',
    },

    // Loading & Empty
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748b',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    modalIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnCancel: {
        backgroundColor: '#f1f5f9',
    },
    btnConfirm: {
        backgroundColor: '#dc2626',
    },
    btnTextCancel: {
        color: '#475569',
        fontWeight: '600',
    },
    btnTextConfirm: {
        color: '#fff',
        fontWeight: '600',
    },
});
