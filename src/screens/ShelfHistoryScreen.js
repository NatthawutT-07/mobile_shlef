/**
 * ShelfHistoryScreen - Shelf Change History Screen
 * Displays list of shelf changes made by admin with acknowledgment options
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
    ChevronLeft, CheckCircle2, AlertCircle,
    Plus, Trash2, ArrowRightLeft, Package,
    Clock, Check
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import useShelfUpdateStore from '../store/shelfUpdateStore';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTION_MAP = {
    add: { icon: Plus, label: 'นำสินค้าเข้า', color: '#10b981', bg: '#ecfdf5' },
    delete: { icon: Trash2, label: 'นำสินค้าออก', color: '#ef4444', bg: '#fef2f2' },
    move: { icon: ArrowRightLeft, label: 'เปลี่ยนตำแหน่งสินค้า', color: '#3b82f6', bg: '#eff6ff' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ShelfHistoryScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const changeLogs = useShelfUpdateStore((s) => s.changeLogs);
    const unacknowledgedCount = useShelfUpdateStore((s) => s.unacknowledgedCount);
    const fetchAllHistory = useShelfUpdateStore((s) => s.fetchAllHistory);
    const acknowledgeOne = useShelfUpdateStore((s) => s.acknowledgeOne);
    const acknowledgeAll = useShelfUpdateStore((s) => s.acknowledgeAll);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [ackingId, setAckingId] = useState(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const hasMoreRef = useRef(true);

    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

    const loadData = useCallback(async (isRefresh = false, isLoadMore = false) => {
        if (!storecode) return;
        if (!hasMoreRef.current && isLoadMore) return;
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
            const result = await fetchAllHistory(storecode, targetPage, limit, isLoadMore);
            const { logs: newLogs, total } = result;

            setTotalCount(total);
            if (!isLoadMore) setPage(1);
            else setPage(targetPage);

            // Check if all data loaded
            const currentTotal = isLoadMore ? changeLogs.length + newLogs.length : newLogs.length;
            if (currentTotal >= total || newLogs.length < limit) {
                setHasMore(false);
                hasMoreRef.current = false;
            } else {
                setHasMore(true);
                hasMoreRef.current = true;
            }
        } catch (err) {
            console.error('Load shelf history error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [storecode, fetchAllHistory, page, changeLogs.length, loadingMore]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAcknowledgeOne = async (logId) => {
        if (logId && storecode) {
            setAckingId(logId);
            await acknowledgeOne(logId, storecode);
            setAckingId(null);
        }
    };

    const handleAcknowledgeAll = async () => {
        if (storecode) {
            await acknowledgeAll(storecode);
        }
    };

    const renderLogItem = ({ item, index }) => {
        const actionConf = ACTION_MAP[item.action] || ACTION_MAP.move;
        const ActionIcon = actionConf.icon;

        // Timeline connector
        const isLastItem = index === changeLogs.length - 1;

        return (
            <View style={styles.timelineItem}>
                {/* Timeline Line */}
                <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, item.acknowledged ? styles.dotAck : styles.dotPending]}>
                        <ActionIcon size={12} color="#fff" />
                    </View>
                    {!isLastItem && <View style={styles.timelineLine} />}
                </View>

                {/* Content Card */}
                <View style={[styles.card, item.acknowledged && styles.cardAcked]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>#{index + 1}</Text>
                            <View style={[styles.actionBadge, { backgroundColor: actionConf.bg }]}>
                                <Text style={[styles.actionText, { color: actionConf.color }]}>
                                    {actionConf.label}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.shelfCode}>{item.shelfCode}</Text>
                    </View>

                    <View style={styles.productRow}>
                        <Package size={16} color="#64748b" style={{ marginTop: 2 }} />
                        <Text style={styles.productName}>
                            {item.productName || `รหัส ${item.codeProduct}`}
                        </Text>
                    </View>

                    <View style={styles.descBox}>
                        <View style={styles.descRow}>
                            {item.action === 'add' ? (
                                <Text style={styles.descText}>
                                    เพิ่มที่ <Text style={styles.highlight}>ชั้น {item.toRow} ลำดับ {item.toIndex}</Text>
                                </Text>
                            ) : item.action === 'delete' ? (
                                <Text style={styles.descText}>
                                    ลบจาก <Text style={styles.highlight}>ชั้น {item.fromRow} ลำดับ {item.fromIndex}</Text>
                                </Text>
                            ) : (
                                <Text style={styles.descText}>
                                    จาก <Text style={styles.highlight}>ชั้น {item.fromRow} ({item.fromIndex})</Text>
                                    {' '}ไป{' '}
                                    <Text style={styles.highlight}>ชั้น {item.toRow} ({item.toIndex})</Text>
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.timeInfo}>
                            <Clock size={12} color="#94a3b8" />
                            <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
                        </View>

                        {item.acknowledged ? (
                            <View style={styles.ackedBadge}>
                                <Check size={12} color="#059669" />
                                <Text style={styles.ackedText}>รับทราบแล้ว</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.ackButton}
                                onPress={() => handleAcknowledgeOne(item.id)}
                                disabled={ackingId === item.id}
                            >
                                {ackingId === item.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.ackButtonText}>กดรับทราบ</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#10b981" />
                    <Text style={styles.backButtonText}>กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>ประวัติการปรับ Planogram</Text>
                    <Text style={styles.subtitle}>
                        {branchName} ({changeLogs.length})
                    </Text>
                </View>
            </View>

            {unacknowledgedCount > 0 ? (
                <View style={styles.alertBanner}>
                    <View style={styles.alertContent}>
                        <AlertCircle size={20} color="#b45309" />
                        <Text style={styles.alertText}>
                            คุณมีรายการที่ยังไม่ได้รับทราบ {unacknowledgedCount} รายการ
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.ackAllButton} onPress={handleAcknowledgeAll}>
                        <Text style={styles.ackAllButtonText}>รับทราบทั้งหมด</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.alertBanner, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                    <View style={styles.alertContent}>
                        <CheckCircle2 size={20} color="#166534" />
                        <Text style={[styles.alertText, { color: '#166534' }]}>
                            รับทราบการเปลี่ยนแปลงครบถ้วนแล้ว
                        </Text>
                    </View>
                </View>
            )}

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
                            !hasMore && changeLogs.length > 0 ? (
                                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>--- ครบถ้วน ---</Text>
                                </View>
                            ) : null
                        )
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <CheckCircle2 size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>ไม่มีประวัติการเปลี่ยนแปลง</Text>
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

    // Alert Banner
    alertBanner: {
        backgroundColor: '#fffbeb',
        padding: 12,
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fcd34d',
        gap: 12,
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        fontSize: 13,
        color: '#92400e',
        flex: 1,
    },
    ackAllButton: {
        backgroundColor: '#f59e0b',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    ackAllButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },

    // List & Timeline
    listContent: {
        padding: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineLeft: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    dotPending: {
        backgroundColor: '#f59e0b',
    },
    dotAck: {
        backgroundColor: '#cbd5e1',
    },
    timelineLine: {
        width: 2,
        backgroundColor: '#e2e8f0',
        flex: 1,
        marginTop: 4,
    },

    // Card
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardAcked: {
        opacity: 0.8,
        backgroundColor: '#f8fafc',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    actionText: {
        fontSize: 11,
        fontWeight: '600',
    },
    shelfCode: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    productRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    productName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1e293b',
        flex: 1,
        lineHeight: 18,
    },
    descBox: {
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    descRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    descText: {
        fontSize: 12,
        color: '#64748b',
    },
    highlight: {
        fontWeight: '600',
        color: '#334155',
    },

    // Card Footer
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#94a3b8',
    },

    // Buttons
    ackButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    ackButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    ackedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ackedText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '500',
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
});
