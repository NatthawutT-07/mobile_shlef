/**
 * MemoizedListItems - Performance-optimized list item components
 * Uses React.memo to prevent unnecessary re-renders
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
    Clock, CheckCircle2, XCircle, AlertTriangle,
    Trash2, ArrowRightLeft, Plus, Calendar, MapPin
} from 'lucide-react-native';

// =============================================================================
// POG REQUEST ITEM
// =============================================================================

const STATUS_MAP = {
    pending: { label: 'รอดำเนินการ', bgColor: '#fef3c7', textColor: '#b45309', icon: Clock },
    approved: { label: 'อนุมัติ', bgColor: '#dcfce7', textColor: '#15803d', icon: CheckCircle2 },
    rejected: { label: 'ไม่อนุมัติ', bgColor: '#fee2e2', textColor: '#b91c1c', icon: XCircle },
    completed: { label: 'เสร็จสิ้น', bgColor: '#dcfce7', textColor: '#15803d', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', bgColor: '#f1f5f9', textColor: '#64748b', icon: XCircle },
};

const ACTION_MAP = {
    add: { label: 'นำสินค้าเข้า', icon: Plus, color: '#10b981', bg: '#ecfdf5' },
    move: { label: 'เปลี่ยนตำแหน่งสินค้า', icon: ArrowRightLeft, color: '#3b82f6', bg: '#eff6ff' },
    swap: { label: 'สลับตำแหน่ง', icon: ArrowRightLeft, color: '#f59e0b', bg: '#fffbeb' },
    delete: { label: 'นำสินค้าออก', icon: Trash2, color: '#ef4444', bg: '#fef2f2' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

export const PogRequestItem = memo(function PogRequestItem({ 
    item, 
    index, 
    onCancelPress, 
    cancellingId 
}) {
    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
    const actionInfo = ACTION_MAP[item.action] || { label: item.action, icon: AlertTriangle, color: '#64748b', bg: '#f1f5f9' };
    const StatusIcon = statusInfo.icon;
    const ActionIcon = actionInfo.icon;

    return (
        <View style={pogStyles.requestCard}>
            {/* Header: Index, Action & Status */}
            <View style={pogStyles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>#{index + 1}</Text>
                    <View style={[pogStyles.actionBadge, { backgroundColor: actionInfo.bg }]}>
                        <ActionIcon size={14} color={actionInfo.color} />
                        <Text style={[pogStyles.actionText, { color: actionInfo.color }]}>{actionInfo.label}</Text>
                    </View>
                </View>
                <View style={[pogStyles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                    <StatusIcon size={12} color={statusInfo.textColor} />
                    <Text style={[pogStyles.statusText, { color: statusInfo.textColor }]}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            {/* Product Info */}
            <View style={pogStyles.productSection}>
                <Text style={pogStyles.productName} numberOfLines={2}>
                    {item.productName || 'ไม่ระบุชื่อสินค้า'}
                </Text>
                <Text style={pogStyles.barcodeText}>{item.barcode}</Text>
            </View>

            {/* Location Info */}
            <View style={pogStyles.locationSection}>
                <View style={pogStyles.locationRow}>
                    <MapPin size={14} color="#94a3b8" />
                    <Text style={pogStyles.locationText} numberOfLines={1}>
                        {item.fromShelf && `${item.fromShelf} / ชั้น ${item.fromRow || '-'} / ลำดับ ${item.fromIndex || '-'}`}
                        {(item.fromShelf && item.toShelf) && ' → '}
                        {item.toShelf && `${item.toShelf} / ชั้น ${item.toRow || '-'} / ลำดับ ${item.toIndex || '-'}`}
                    </Text>
                </View>
                <View style={pogStyles.dateRow}>
                    <Calendar size={14} color="#94a3b8" />
                    <Text style={pogStyles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
            </View>

            {/* Cancel Button (Only if pending) */}
            {item.status === 'pending' && onCancelPress && (
                <View style={pogStyles.cardFooter}>
                    <TouchableOpacity
                        style={pogStyles.cancelButton}
                        onPress={() => onCancelPress(item.id)}
                        disabled={cancellingId === item.id}
                    >
                        <Text style={pogStyles.cancelButtonText}>
                            {cancellingId === item.id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for memo
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.index === nextProps.index &&
        prevProps.cancellingId === nextProps.cancellingId
    );
});

const pogStyles = StyleSheet.create({
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
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
});

// =============================================================================
// SHELF HISTORY ITEM
// =============================================================================

export const ShelfHistoryItem = memo(function ShelfHistoryItem({ 
    item, 
    index,
    onAcknowledge,
    isAcknowledging 
}) {
    const actionColors = {
        add: { bg: '#ecfdf5', text: '#059669', label: 'เพิ่ม' },
        remove: { bg: '#fef2f2', text: '#dc2626', label: 'ลบ' },
        move: { bg: '#eff6ff', text: '#2563eb', label: 'ย้าย' },
        update: { bg: '#fefce8', text: '#ca8a04', label: 'แก้ไข' },
    };

    const actionStyle = actionColors[item.action] || actionColors.update;

    return (
        <View style={historyStyles.card}>
            <View style={historyStyles.header}>
                <View style={[historyStyles.actionBadge, { backgroundColor: actionStyle.bg }]}>
                    <Text style={[historyStyles.actionText, { color: actionStyle.text }]}>
                        {actionStyle.label}
                    </Text>
                </View>
                {!item.acknowledged && onAcknowledge && (
                    <TouchableOpacity
                        style={historyStyles.ackButton}
                        onPress={() => onAcknowledge(item.id)}
                        disabled={isAcknowledging}
                    >
                        <CheckCircle2 size={16} color="#10b981" />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={historyStyles.shelfName} numberOfLines={1}>
                {item.shelfCode} - {item.shelfName || 'ไม่ระบุ'}
            </Text>
            <Text style={historyStyles.description} numberOfLines={2}>
                {item.description || 'ไม่มีรายละเอียด'}
            </Text>
            <Text style={historyStyles.timestamp}>
                {formatDate(item.createdAt)}
            </Text>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.acknowledged === nextProps.item.acknowledged &&
        prevProps.isAcknowledging === nextProps.isAcknowledging
    );
});

const historyStyles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    actionText: {
        fontSize: 11,
        fontWeight: '600',
    },
    ackButton: {
        padding: 4,
    },
    shelfName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 6,
    },
    timestamp: {
        fontSize: 11,
        color: '#94a3b8',
    },
});

export default {
    PogRequestItem,
    ShelfHistoryItem,
};
