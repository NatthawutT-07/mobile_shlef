/**
 * PogRequestsScreen - POG Request History Screen
 * Displays list of POG change requests with status and cancellation options
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useState, useEffect, useMemo } from 'react';

// React Native
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

// Local imports
import useAuthStore from '../store/authStore';
import { getMyPogRequests, cancelPogRequest } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Status display configuration */
const STATUS_MAP = {
    pending: { label: 'รอดำเนินการ', bgColor: '#fef3c7', textColor: '#92400e' },
    approved: { label: 'อนุมัติ', bgColor: '#dbeafe', textColor: '#1e40af' },
    rejected: { label: 'ไม่อนุมัติ', bgColor: '#fee2e2', textColor: '#991b1b' },
    completed: { label: 'เสร็จสิ้น', bgColor: '#d1fae5', textColor: '#065f46' },
    cancelled: { label: 'ยกเลิก', bgColor: '#f1f5f9', textColor: '#475569' },
};

/** Action type labels */
const ACTION_MAP = {
    add: '➕ เพิ่ม',
    move: '↔️ ย้าย',
    swap: '🔄 สลับ',
    delete: '🗑️ ลบ',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format date string for Thai locale display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PogRequestsScreen({ navigation }) {
    // -------------------------------------------------------------------------
    // State & Store
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [cancellingId, setCancellingId] = useState(null);

    // Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [targetCancelId, setTargetCancelId] = useState(null);

    // -------------------------------------------------------------------------
    // Derived Values
    // -------------------------------------------------------------------------
    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

    // -------------------------------------------------------------------------
    // Data Loading
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Render Helpers
    // -------------------------------------------------------------------------
    const renderRequestItem = ({ item }) => {
        const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
        const actionLabel = ACTION_MAP[item.action] || item.action;

        return (
            <View style={styles.requestCard}>
                {/* Row 1: Status + Product */}
                <View style={styles.cardRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                    <Text style={styles.productName} numberOfLines={1}>
                        {item.productName || item.barcode}
                    </Text>
                </View>

                {/* Row 2: Action + Location + Date + Cancel */}
                <View style={styles.cardRow}>
                    <Text style={styles.actionLabel}>{actionLabel}</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.fromShelf && `${item.fromShelf}/${item.fromRow}/${item.fromIndex}`}
                        {item.fromShelf && item.toShelf && ' → '}
                        {item.toShelf && `${item.toShelf}/${item.toRow}/${item.toIndex}`}
                    </Text>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => handleCancelPress(item.id)}
                            disabled={cancellingId === item.id}
                        >
                            {cancellingId === item.id ? (
                                <ActivityIndicator size="small" color="#dc2626" />
                            ) : (
                                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>ไม่มีประวัติคำขอ</Text>
        </View>
    );

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>ประวัติคำขอสาขา</Text>
                    <Text style={styles.subtitle}>
                        {branchName} - ทั้งหมด {data.length} รายการ
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
                    ListEmptyComponent={renderEmptyList}
                />
            )}

            {/* Cancel Confirmation Modal */}
            <Modal visible={showCancelModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalIcon}>⚠️</Text>
                        <Text style={styles.modalTitle}>ยืนยันการยกเลิก</Text>
                        <Text style={styles.modalMessage}>คุณต้องการยกเลิกรายการนี้หรือไม่?</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>เก็บไว้</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={confirmCancel}
                            >
                                <Text style={styles.modalButtonTextConfirm}>ยกเลิกเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
        paddingTop: 24,
        paddingBottom: 16,
    },

    // Header
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

    // Loading
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

    // List
    listContent: {
        padding: 12,
    },

    // Request Card
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        ...Platform.select({
            web: { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
            },
        }),
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    indexBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        marginRight: 8,
        minWidth: 20,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748b',
        marginRight: 8,
    },
    dateText: {
        fontSize: 10,
        color: '#9ca3af',
    },
    productName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    locationText: {
        fontSize: 11,
        color: '#64748b',
        flex: 1,
    },

    // Cancel Button
    cancelButton: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 8,
    },
    cancelButtonText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#dc2626',
    },

    // Empty State
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

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
            default: { elevation: 8 },
        }),
    },
    modalIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#f1f5f9',
    },
    modalButtonConfirm: {
        backgroundColor: '#fee2e2',
    },
    modalButtonTextCancel: {
        fontWeight: '600',
        color: '#64748b',
    },
    modalButtonTextConfirm: {
        fontWeight: '600',
        color: '#dc2626',
    },
});
