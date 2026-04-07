/**
 * PogRequestsScreen - POG Request History Screen
 * Displays list of POG change requests with status and cancellation options
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    AlertTriangle, Trash2, ArrowRightLeft, Plus,
    Calendar, MapPin, FileText
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import { getMyPogRequests, cancelPogRequest } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';
import useBranchStore from '../store/branchStore';
import { usePreventDoubleTap } from '../hooks/useDebounce';
import { useNetwork } from '../contexts/NetworkContext';
import { setCache, getCacheWithMeta, CACHE_KEYS } from '../services/cacheService';
import { OfflineBanner, CachedDataNotice } from '../components/OfflineIndicator';

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
    const getBranchName = useBranchStore((s) => s.getBranchName);
    const storecode = user?.storecode || user?.name;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [cancellingId, setCancellingId] = useState(null);

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const flatListRef = useRef(null);

    // Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [targetCancelId, setTargetCancelId] = useState(null);
    const [cachedAt, setCachedAt] = useState(null);
    const [isOfflineData, setIsOfflineData] = useState(false);

    // Network status
    const { isConnected, isInternetReachable } = useNetwork();
    const isOnline = isConnected && isInternetReachable;

    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        return getBranchName(storecode);
    }, [storecode, getBranchName]);

    const loadPage = useCallback(async (targetPage, isRefresh = false) => {
        if (!storecode) return;

        const cacheKey = CACHE_KEYS.POG_REQUESTS(storecode);

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        // Try network first if online
        if (isOnline) {
            try {
                const result = await getMyPogRequests(storecode, targetPage, ITEMS_PER_PAGE);
                const newData = result?.data || [];
                const total = result?.pagination?.total || 0;

                setData(newData);
                setPage(targetPage);
                setTotalCount(total);
                setIsOfflineData(false);
                setCachedAt(null);

                // Cache page 1 data for offline use
                if (targetPage === 1) {
                    await setCache(cacheKey, { data: newData, total });
                }

                setLoading(false);
                setRefreshing(false);
                return;
            } catch (err) {
                if (__DEV__) console.error('Load POG requests error:', err);
                // Fall through to cache
            }
        }

        // Load from cache (offline or network failed) - only show cache for page 1 conceptually
        const cached = await getCacheWithMeta(cacheKey);
        if (cached.data) {
            setData(cached.data.data || []);
            setTotalCount(cached.data.total || 0);
            setCachedAt(cached.cachedAt);
            setIsOfflineData(true);
        } else {
            setData([]);
        }

        setLoading(false);
        setRefreshing(false);
    }, [storecode, isOnline]);

    useEffect(() => {
        loadPage(1);
    }, [storecode]);

    const goToPage = (targetPage) => {
        if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
        loadPage(targetPage);
    };

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
            if (__DEV__) console.error('Cancel request error:', err);
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
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                            #{(page - 1) * ITEMS_PER_PAGE + index + 1}
                        </Text>
                        <View style={[styles.actionBadge, { backgroundColor: actionInfo.bg }]}>
                            <ActionIcon size={14} color={actionInfo.color} />
                            <Text style={[styles.actionText, { color: actionInfo.color }]}>{actionInfo.label}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                            <StatusIcon size={12} color={statusInfo.textColor} />
                            <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                                {statusInfo.label}
                            </Text>
                        </View>
                        {item.status === 'pending' && (
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
                        )}

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
                    {!!item.note && (
                        <View style={styles.noteRow}>
                            <FileText size={14} color="#94a3b8" style={{ marginTop: 2 }} />
                            <Text style={styles.noteText} numberOfLines={2}>
                                {item.note}
                            </Text>
                        </View>
                    )}
                </View>

            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Offline Banner */}
            <OfflineBanner />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#10b981" />
                    <Text style={styles.backButtonText}>กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>ประวัติคำขอ</Text>
                    <Text style={styles.subtitle}>
                        {branchName} • {totalCount} รายการ
                    </Text>
                </View>
            </View>

            {/* Cached Data Notice */}
            {isOfflineData && cachedAt && (
                <CachedDataNotice cachedAt={cachedAt} style={{ marginHorizontal: 16, marginTop: 12 }} />
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={data}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderRequestItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadPage(page, true)}
                            tintColor="#10b981"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Clock size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>ไม่มีประวัติคำขอ</Text>
                        </View>
                    }
                />
            )}

            {/* Pagination Footer */}
            {!loading && totalCount > 0 && (
                <View style={styles.paginationBar}>
                    <TouchableOpacity
                        style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                        onPress={() => goToPage(page - 1)}
                        disabled={page <= 1}
                    >
                        <ChevronLeft size={18} color={page <= 1 ? '#cbd5e1' : '#1e293b'} />
                        <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>ก่อนหน้า</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>หน้า {page}/{totalPages}</Text>

                    <TouchableOpacity
                        style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                        onPress={() => goToPage(page + 1)}
                        disabled={page >= totalPages}
                    >
                        <Text style={[styles.pageButtonText, page >= totalPages && styles.pageButtonTextDisabled]}>ถัดไป</Text>
                        <ChevronRight size={18} color={page >= totalPages ? '#cbd5e1' : '#1e293b'} />
                    </TouchableOpacity>
                </View>
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
    noteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 2,
    },
    noteText: {
        fontSize: 12,
        color: '#64748b',
        flex: 1,
        fontStyle: 'italic',
        lineHeight: 18,
    },

    // Cancel Button
    cancelButton: {
        backgroundColor: '#fff1f2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    cancelButtonText: {
        color: '#be123c',
        fontSize: 11,
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

    // Pagination
    paginationBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    pageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pageButtonDisabled: {
        opacity: 0.4,
    },
    pageButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e293b',
    },
    pageButtonTextDisabled: {
        color: '#cbd5e1',
    },
    pageInfo: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
});
