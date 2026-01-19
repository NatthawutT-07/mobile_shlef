/**
 * ShelfHistoryScreen - Shelf Change History Screen
 * Displays list of shelf changes made by admin with acknowledgment options
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// React Native
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Local imports
import useAuthStore from '../store/authStore';
import useShelfUpdateStore from '../store/shelfUpdateStore';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Action type labels */
const ACTION_MAP = {
    add: { emoji: '➕', label: 'เพิ่ม', bgColor: '#dbeafe', textColor: '#1e40af' },
    delete: { emoji: '🗑️', label: 'ลบ', bgColor: '#fee2e2', textColor: '#991b1b' },
    move: { emoji: '↔️', label: 'ย้าย', bgColor: '#fef3c7', textColor: '#92400e' },
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

export default function ShelfHistoryScreen({ navigation }) {
    // -------------------------------------------------------------------------
    // State & Store
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    // Shelf update store
    const changeLogs = useShelfUpdateStore((s) => s.changeLogs);
    const unacknowledgedCount = useShelfUpdateStore((s) => s.unacknowledgedCount);
    const fetchAllHistory = useShelfUpdateStore((s) => s.fetchAllHistory);
    const fetchChangeLogs = useShelfUpdateStore((s) => s.fetchChangeLogs);
    const acknowledgeOne = useShelfUpdateStore((s) => s.acknowledgeOne);
    const acknowledgeAll = useShelfUpdateStore((s) => s.acknowledgeAll);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
    const loadData = useCallback(async (isRefresh = false) => {
        if (!storecode) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            await fetchAllHistory(storecode);
        } catch (err) {
            console.error('Load shelf history error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [storecode, fetchAllHistory]);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
    const handleAcknowledgeOne = async (logId) => {
        if (logId && storecode) {
            await acknowledgeOne(logId, storecode);
        }
    };

    const handleAcknowledgeAll = async () => {
        if (storecode) {
            await acknowledgeAll(storecode);
        }
    };

    // -------------------------------------------------------------------------
    // Render Functions
    // -------------------------------------------------------------------------
    const renderLogItem = ({ item }) => {
        const actionConfig = ACTION_MAP[item.action] || ACTION_MAP.move;

        return (
            <View style={[styles.card, item.acknowledged && styles.cardAcked]}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={[styles.actionBadge, { backgroundColor: actionConfig.bgColor }]}>
                        <Text style={styles.actionEmoji}>{actionConfig.emoji}</Text>
                        <Text style={[styles.actionLabel, { color: actionConfig.textColor }]}>
                            {actionConfig.label}
                        </Text>
                    </View>
                    <Text style={styles.shelfCode}>{item.shelfCode}</Text>
                </View>

                {/* Product Info */}
                <View style={styles.productRow}>
                    <Text style={styles.productLabel}>สินค้า:</Text>
                    <Text style={styles.productName}>
                        {item.productName || `รหัส ${item.codeProduct}`}
                    </Text>
                </View>

                {/* Position Info */}
                <View style={styles.positionRow}>
                    {item.action === 'add' ? (
                        <>
                            <Text style={styles.positionLabel}>ตำแหน่งใหม่:</Text>
                            <Text style={styles.positionValue}>
                                {item.shelfCode} ชั้น {item.toRow} ลำดับ {item.toIndex}
                            </Text>
                        </>
                    ) : item.action === 'delete' ? (
                        <>
                            <Text style={styles.positionLabel}>ตำแหน่งเดิม:</Text>
                            <Text style={styles.positionValue}>
                                {item.shelfCode} ชั้น {item.fromRow} ลำดับ {item.fromIndex}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.positionLabel}>ย้ายจาก:</Text>
                            <Text style={styles.positionValue}>
                                {item.shelfCode} ชั้น {item.fromRow} ลำดับ {item.fromIndex} → ชั้น {item.toRow} ลำดับ {item.toIndex}
                            </Text>
                        </>
                    )}
                </View>

                {/* Footer Row */}
                <View style={styles.cardFooter}>
                    <View style={styles.dateInfo}>
                        <Text style={styles.dateLabel}>
                            {formatDate(item.createdAt)}
                        </Text>
                        {item.createdBy && (
                            <Text style={styles.createdBy}>โดยจัดซื้อ</Text>
                        )}
                    </View>

                    {item.acknowledged ? (
                        <View style={styles.ackedBadge}>
                            <Text style={styles.ackedText}>✓ รับทราบแล้ว</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.ackButton}
                            onPress={() => handleAcknowledgeOne(item.id)}
                        >
                            <Text style={styles.ackButtonText}>รับทราบ</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>ยังไม่มีประวัติการปรับเปลี่ยน</Text>
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
                    <Text style={styles.title}>ประวัติการปรับโดยจัดซื้อ</Text>
                    <Text style={styles.subtitle}>
                        {branchName} - {changeLogs.length} รายการ
                        {unacknowledgedCount > 0 && ` (${unacknowledgedCount} รอรับทราบ)`}
                    </Text>
                </View>
            </View>

            {/* Acknowledge All Button */}
            {unacknowledgedCount > 0 && (
                <TouchableOpacity style={styles.ackAllButton} onPress={handleAcknowledgeAll}>
                    <Text style={styles.ackAllButtonText}>
                        ✓ รับทราบทั้งหมด ({unacknowledgedCount} รายการ)
                    </Text>
                </TouchableOpacity>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : (
                <FlatList
                    data={changeLogs}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderLogItem}
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
        backgroundColor: '#f8fafc',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    backButton: {
        paddingVertical: 4,
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
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },

    // Acknowledge All Button
    ackAllButton: {
        backgroundColor: '#10b981',
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    ackAllButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
    },

    // List
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardAcked: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        opacity: 0.85,
    },

    // Card Header
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    actionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    actionEmoji: {
        fontSize: 14,
        marginRight: 4,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    shelfCode: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },

    // Product Info
    productRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    productLabel: {
        fontSize: 13,
        color: '#64748b',
        marginRight: 6,
        marginTop: 2,
    },
    productName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
    },

    // Position Info
    positionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    positionLabel: {
        fontSize: 13,
        color: '#64748b',
        marginRight: 6,
    },
    positionValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
    },

    // Card Footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10,
    },
    dateInfo: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: '#94a3b8',
    },
    createdBy: {
        fontSize: 11,
        color: '#94a3b8',
    },

    // Acknowledge Button
    ackButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    ackButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // Acknowledged Badge
    ackedBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    ackedText: {
        color: '#065f46',
        fontSize: 12,
        fontWeight: '500',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
    },
});
