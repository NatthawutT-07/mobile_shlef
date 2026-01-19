/**
 * HomeScreen - Main menu screen for BMR Planogram app
 * Displays main navigation options and user info
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useMemo, useState, useEffect } from 'react';

// React Native
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Local imports
import useAuthStore from '../store/authStore';
import useUpdateStore from '../store/updateStore';
import useShelfUpdateStore from '../store/shelfUpdateStore';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

const APP_VERSION = '1.0.1';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HomeScreen({ navigation }) {
    // -------------------------------------------------------------------------
    // State & Store
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Update state
    const hasUpdate = useUpdateStore((s) => s.hasUpdate);
    const setHasUpdate = useUpdateStore((s) => s.setHasUpdate);
    const setSkipUpdate = useUpdateStore((s) => s.setSkipUpdate);
    const skipUpdate = useUpdateStore((s) => s.skipUpdate);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Shelf update state
    const hasShelfUpdate = useShelfUpdateStore((s) => s.hasShelfUpdate);
    const checkShelfUpdate = useShelfUpdateStore((s) => s.checkShelfUpdate);
    const acknowledgeOne = useShelfUpdateStore((s) => s.acknowledgeOne);
    const acknowledgeAll = useShelfUpdateStore((s) => s.acknowledgeAll);
    const fetchAllHistory = useShelfUpdateStore((s) => s.fetchAllHistory);
    const changeLogs = useShelfUpdateStore((s) => s.changeLogs);
    const unacknowledgedCount = useShelfUpdateStore((s) => s.unacknowledgedCount);
    const [showShelfUpdateModal, setShowShelfUpdateModal] = useState(false);

    // -------------------------------------------------------------------------
    // Derived Values
    // -------------------------------------------------------------------------
    const branchName = useMemo(() => {
        const code = user?.storecode || user?.name;
        if (!code) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === code);
        return branch ? branch.label.replace(`${code} - `, '') : code;
    }, [user]);

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
    useEffect(() => {
        // Check for updates on mount (for native platforms)
        checkForUpdates(true); // true = fresh app open

        // Check for shelf updates
        const branchCode = user?.storecode || user?.name;
        if (branchCode) {
            checkShelfUpdate(branchCode);
        }
    }, [user]);

    const checkForUpdates = async (isFreshOpen = false) => {
        // Skip on web or development
        if (Platform.OS === 'web') return;

        try {
            const Updates = await import('expo-updates');
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                setHasUpdate(true, update.manifest);

                // Fresh open = go directly to Update screen
                if (isFreshOpen) {
                    navigation.navigate('Update');
                } else if (!skipUpdate) {
                    // Already using app = show modal
                    setShowUpdateModal(true);
                }
            }
        } catch (err) {
            // Ignore errors in dev mode
            console.log('Update check:', err.message);
        }
    };

    const handleUpdateNow = () => {
        setShowUpdateModal(false);
        navigation.navigate('Update');
    };

    const handleUpdateLater = () => {
        setShowUpdateModal(false);
        setSkipUpdate(true);
    };

    // -------------------------------------------------------------------------
    // Menu Configuration
    // -------------------------------------------------------------------------
    const menuItems = [
        {
            id: 'scanner',
            icon: '📷',
            title: 'สแกนบาร์โค้ด',
            subtitle: 'ค้นหาสินค้าด้วยกล้อง',
            screen: 'BarcodeScanner',
            enabled: true,
        },
        {
            id: 'planogram',
            icon: '📋',
            title: 'ดู Planogram',
            subtitle: 'ดูโครงสร้างชั้นวางสินค้า',
            screen: 'Planogram',
            enabled: true,
        },
        {
            id: 'requests',
            icon: '📦',
            title: 'ประวัติคำขอสาขา',
            subtitle: 'ดูและจัดการคำขอเปลี่ยนแปลง',
            screen: 'PogRequests',
            enabled: true,
        },
    ];

    // -------------------------------------------------------------------------
    // Shelf Update Handler
    // -------------------------------------------------------------------------
    const handleShelfUpdatePress = () => {
        // นำไปหน้า ShelfHistory
        navigation.navigate('ShelfHistory');
    };

    const handleAcknowledgeOne = async (logId) => {
        const branchCode = user?.storecode || user?.name;
        if (logId && branchCode) {
            await acknowledgeOne(logId, branchCode);
        }
    };

    const handleAcknowledgeAll = async () => {
        const branchCode = user?.storecode || user?.name;
        if (branchCode) {
            await acknowledgeAll(branchCode);
        }
        setShowShelfUpdateModal(false);
    };

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
    const handleMenuPress = (item) => {
        if (item.screen) {
            navigation.navigate(item.screen);
        }
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.storeName}>สาขา {branchName}</Text>
                </View>
                <View style={styles.headerRight}>
                    {/* Update Icon */}
                    {hasUpdate && (
                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={() => setShowUpdateModal(true)}
                        >
                            <Text style={styles.updateButtonText}>🔔</Text>
                            <View style={styles.updateBadge} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>ออก</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>เมนูหลัก</Text>

                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, !item.enabled && styles.menuItemDisabled]}
                            onPress={() => handleMenuPress(item)}
                            disabled={!item.enabled}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIcon}>
                                <Text style={styles.menuIconText}>{item.icon}</Text>
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuItemTitle}>{item.title}</Text>
                                <Text
                                    style={[
                                        styles.menuItemSubtitle,
                                        !item.enabled && styles.menuItemSubtitleDisabled,
                                    ]}
                                >
                                    {item.subtitle}
                                </Text>
                            </View>
                            {item.enabled && <Text style={styles.menuArrow}>›</Text>}
                        </TouchableOpacity>
                    ))}

                    {/* ✅ Shelf History Card - แสดงตลอด เข้าดู history ได้ */}
                    <TouchableOpacity
                        style={[styles.menuItem, hasShelfUpdate && styles.shelfUpdateCard]}
                        onPress={handleShelfUpdatePress}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIcon, hasShelfUpdate && styles.shelfUpdateIcon]}>
                            <Text style={styles.menuIconText}>🗂️</Text>
                            {unacknowledgedCount > 0 && <View style={styles.shelfUpdateBadge} />}
                        </View>
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuItemTitle}>
                                {hasShelfUpdate ? 'มีการปรับเปลี่ยนโดยจัดซื้อ' : 'ประวัติการปรับโดยจัดซื้อ'}
                            </Text>
                            <Text style={hasShelfUpdate ? styles.shelfUpdateSubtitle : styles.menuItemSubtitle}>
                                {hasShelfUpdate
                                    ? `มี ${unacknowledgedCount} รายการที่ต้องรับทราบ`
                                    : 'ดูประวัติการเปลี่ยนแปลงย้อนหลัง'}
                            </Text>
                        </View>
                        <Text style={[styles.menuArrow, hasShelfUpdate && styles.shelfUpdateArrow]}>›</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>BMR Planogram v{APP_VERSION}</Text>
            </View>

            {/* Logout Confirmation Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>ยืนยันออกจากระบบ</Text>
                        <Text style={styles.modalMessage}>คุณต้องการออกจากระบบใช่หรือไม่?</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>อยู่ต่อ</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={confirmLogout}
                            >
                                <Text style={styles.modalButtonTextConfirm}>ออกเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Update Available Modal */}
            <Modal visible={showUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.updateIcon}>🔄</Text>
                        <Text style={styles.modalTitle}>มีเวอร์ชั่นใหม่!</Text>
                        <Text style={styles.modalMessage}>
                            มีการอัพเดทแอพพลิเคชันใหม่{'\n'}
                            ต้องการอัพเดทตอนนี้เลยหรือไม่?
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={handleUpdateLater}
                            >
                                <Text style={styles.modalButtonTextCancel}>ภายหลัง</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonUpdate]}
                                onPress={handleUpdateNow}
                            >
                                <Text style={styles.modalButtonTextConfirm}>อัพเดทเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ✅ Shelf Update Modal - แสดงรายละเอียด change logs */}
            <Modal visible={showShelfUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, styles.changeLogModal]}>
                        <Text style={styles.updateIcon}>📦</Text>
                        <Text style={styles.modalTitle}>
                            {unacknowledgedCount > 0
                                ? `มี ${unacknowledgedCount} รายการที่ต้องรับทราบ`
                                : 'ประวัติการปรับเปลี่ยน Shelf'}
                        </Text>

                        {/* Change Logs List */}
                        {changeLogs.length > 0 ? (
                            <ScrollView style={styles.changeLogList} nestedScrollEnabled>
                                {changeLogs.map((log, idx) => (
                                    <View
                                        key={log.id || idx}
                                        style={[
                                            styles.changeLogItem,
                                            log.acknowledged && styles.changeLogItemAcked
                                        ]}
                                    >
                                        <View style={styles.changeLogInfo}>
                                            <Text style={styles.changeLogAction}>
                                                {log.action === 'add' ? '➕' :
                                                    log.action === 'delete' ? '🗑️' : '↔️'}
                                            </Text>
                                            <View style={styles.changeLogTextWrap}>
                                                <Text style={styles.changeLogProduct} numberOfLines={1}>
                                                    {log.productName || `รหัส ${log.codeProduct}`}
                                                </Text>
                                                <Text style={styles.changeLogPosition}>
                                                    {log.action === 'add'
                                                        ? `→ ${log.shelfCode} ชั้น${log.toRow} ลำดับ${log.toIndex}`
                                                        : log.action === 'delete'
                                                            ? `${log.shelfCode} ชั้น${log.fromRow} ลำดับ${log.fromIndex}`
                                                            : `${log.shelfCode} ชั้น${log.fromRow}/${log.fromIndex} → ชั้น${log.toRow}/${log.toIndex}`}
                                                </Text>
                                            </View>
                                        </View>
                                        {log.acknowledged ? (
                                            <View style={styles.changeLogAckedBadge}>
                                                <Text style={styles.changeLogAckedText}>✓</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.changeLogAckBtn}
                                                onPress={() => handleAcknowledgeOne(log.id)}
                                            >
                                                <Text style={styles.changeLogAckBtnText}>✔</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.modalMessage}>
                                ยังไม่มีประวัติการเปลี่ยนแปลง
                            </Text>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowShelfUpdateModal(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>ปิด</Text>
                            </TouchableOpacity>

                            {changeLogs.length > 0 && (
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.modalButtonAcknowledge]}
                                    onPress={handleAcknowledgeAll}
                                >
                                    <Text style={styles.modalButtonTextConfirm}>รับทราบทั้งหมด</Text>
                                </TouchableOpacity>
                            )}
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    storeName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    updateButton: {
        position: 'relative',
        padding: 8,
    },
    updateButtonText: {
        fontSize: 22,
    },
    updateBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    logoutButton: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#dc2626',
    },

    // Menu Section
    menuSection: {
        gap: 12,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        ...Platform.select({
            web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: 2,
            },
        }),
    },
    menuItemDisabled: {
        opacity: 0.5,
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuIconText: {
        fontSize: 24,
    },
    menuInfo: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
    },
    menuItemSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    menuItemSubtitleDisabled: {
        fontStyle: 'italic',
    },
    menuArrow: {
        fontSize: 24,
        color: '#9ca3af',
        marginLeft: 8,
    },

    // Footer
    footer: {
        padding: 16,
        paddingBottom: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
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
    updateIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    modalButtonUpdate: {
        backgroundColor: '#10b981',
    },

    // ✅ Shelf Update Notification Styles
    shelfUpdateCard: {
        backgroundColor: '#fef2f2',
        borderWidth: 2,
        borderColor: '#fecaca',
    },
    shelfUpdateIcon: {
        position: 'relative',
        backgroundColor: '#fee2e2',
    },
    shelfUpdateBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#fff',
    },
    shelfUpdateSubtitle: {
        fontSize: 13,
        color: '#dc2626',
        marginTop: 2,
        fontWeight: '500',
    },
    shelfUpdateArrow: {
        color: '#dc2626',
    },
    modalButtonAcknowledge: {
        backgroundColor: '#10b981',
    },
    // ✅ Change Log Modal Styles
    changeLogModal: {
        maxHeight: '70%',
    },
    changeLogList: {
        maxHeight: 200,
        width: '100%',
        marginVertical: 12,
    },
    changeLogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 6,
    },
    changeLogAction: {
        fontSize: 14,
        marginRight: 8,
    },
    changeLogInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    changeLogTextWrap: {
        flex: 1,
    },
    changeLogProduct: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1e293b',
    },
    changeLogPosition: {
        fontSize: 10,
        color: '#64748b',
    },
    changeLogAckBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    changeLogAckBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    // ✅ Acknowledged item styles
    changeLogItemAcked: {
        backgroundColor: '#f0fdf4',
        opacity: 0.8,
    },
    changeLogAckedBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    changeLogAckedText: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
