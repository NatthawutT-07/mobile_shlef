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

// Icons
import {
    Scan, ClipboardList, Package, Bell, LogOut,
    ChevronRight, Store, AlertCircle, Check, X,
    ArrowRightLeft, Plus, Trash2, History, PackagePlus
} from 'lucide-react-native';

// Local imports
import useAuthStore from '../store/authStore';
import useUpdateStore from '../store/updateStore';
import useShelfUpdateStore from '../store/shelfUpdateStore';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

const APP_VERSION = '1.0.1';

// ✅ Feature Flag: ลงทะเบียนสินค้าโดยตรง (ตั้งเป็น false เพื่อซ่อนปุ่ม)
const ENABLE_DIRECT_REGISTER = true;

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
            icon: Scan,
            color: '#10b981', // emerald-500
            bg: '#ecfdf5', // emerald-50
            title: 'สแกนบาร์โค้ด',
            subtitle: 'ค้นหาสินค้าด้วยกล้อง',
            screen: 'BarcodeScanner',
            enabled: false,
        },
        {
            id: 'planogram',
            icon: ClipboardList,
            color: '#3b82f6', // blue-500
            bg: '#eff6ff', // blue-50
            title: 'Planogram',
            subtitle: 'ดูโครงสร้างชั้นวางสินค้า',
            screen: 'Planogram',
            enabled: true,
        },
        {
            id: 'requests',
            icon: Package,
            color: '#8b5cf6', // violet-500
            bg: '#f5f3ff', // violet-50
            title: 'ประวัติคำขอสาขา',
            subtitle: 'ดูและจัดการคำขอเปลี่ยนแปลง',
            screen: 'PogRequests',
            enabled: false,
        },
    ];

    // -------------------------------------------------------------------------
    // Shelf Update Handler
    // -------------------------------------------------------------------------
    const handleShelfUpdatePress = () => {
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
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.storeIconBg}>
                        <Store size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.storeName}>สาขา : {branchName}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {/* Update Icon */}
                    {hasUpdate && (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowUpdateModal(true)}
                        >
                            <Bell size={24} color="#64748b" />
                            <View style={styles.notificationBadge} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                        <LogOut size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Banner Section if needed */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>เมนูหลัก</Text>
                </View>

                <View style={styles.grid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.card, !item.enabled && styles.cardDisabled]}
                            onPress={() => handleMenuPress(item)}
                            disabled={!item.enabled}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                                <item.icon size={28} color={item.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                            </View>
                            {item.enabled && <ChevronRight size={20} color="#cbd5e1" />}
                        </TouchableOpacity>
                    ))}

                    {/* ✅ ปุ่มลงทะเบียนสินค้า - สีเขียวเด่น */}
                    {ENABLE_DIRECT_REGISTER && (
                        <TouchableOpacity
                            style={[styles.card, styles.registerCardMain]}
                            onPress={() => navigation.navigate('RegisterProduct')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, styles.registerIconBox]}>
                                <PackagePlus size={28} color="#fff" />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardTitle, { color: '#fff' }]}>ลงทะเบียนสินค้า</Text>
                                <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>สแกนบาร์โค้ดเพื่อเพิ่มสินค้าใหม่</Text>
                            </View>
                            <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    )}


                    {/* Shelf History Card */}
                    <TouchableOpacity
                        style={[
                            styles.card,
                            hasShelfUpdate && styles.alertCard
                        ]}
                        onPress={handleShelfUpdatePress}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.iconBox,
                            hasShelfUpdate ? styles.alertIconBox : { backgroundColor: '#f1f5f9' }
                        ]}>
                            <History size={28} color={hasShelfUpdate ? '#dc2626' : '#64748b'} />
                            {unacknowledgedCount > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{unacknowledgedCount}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={[styles.cardTitle, hasShelfUpdate && styles.alertText]}>
                                {hasShelfUpdate ? 'มีการปรับเปลี่ยนชั้นวางสินค้า' : 'ประวัติการปรับชั้นวางสินค้า'}
                            </Text>
                            <Text style={[styles.cardSubtitle, hasShelfUpdate && styles.alertSubText]}>
                                {hasShelfUpdate
                                    ? `รอรับทราบ ${unacknowledgedCount} รายการ`
                                    : 'ดูประวัติการเปลี่ยนแปลงย้อนหลัง'}
                            </Text>
                        </View>
                        <ChevronRight size={20} color={hasShelfUpdate ? '#fecaca' : '#cbd5e1'} />
                    </TouchableOpacity>
                </View>

                <View style={styles.footerSpacing} />
            </ScrollView>

            {/* Footer Version */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>BMR Planogram v{APP_VERSION}</Text>
            </View>

            {/* Logout Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalIconBg, { backgroundColor: '#fee2e2' }]}>
                            <LogOut size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.modalTitle}>ยืนยันออกจากระบบ</Text>
                        <Text style={styles.modalMessage}>คุณต้องการออกจากระบบใช่หรือไม่?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnCancel]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={styles.btnTextCancel}>อยู่ต่อ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnDanger]}
                                onPress={confirmLogout}
                            >
                                <Text style={styles.btnTextWhite}>ออกเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Update Modal */}
            <Modal visible={showUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalIconBg, { backgroundColor: '#dcfce7' }]}>
                            <Package size={32} color="#16a34a" />
                        </View>
                        <Text style={styles.modalTitle}>มีเวอร์ชั่นใหม่!</Text>
                        <Text style={styles.modalMessage}>
                            มีการอัพเดทแอพพลิเคชันเพื่อประสิทธิภาพที่ดีขึ้น
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnCancel]}
                                onPress={handleUpdateLater}
                            >
                                <Text style={styles.btnTextCancel}>ภายหลัง</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnSuccess]}
                                onPress={handleUpdateNow}
                            >
                                <Text style={styles.btnTextWhite}>อัพเดทเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Shelf Update Modal */}
            <Modal visible={showShelfUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, styles.changeLogModal]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconBg, { backgroundColor: '#ffedd5' }]}>
                                <History size={24} color="#ea580c" />
                            </View>
                            <Text style={styles.modalTitle}>
                                {unacknowledgedCount > 0 ? 'รายการรอรับทราบ' : 'ประวัติการปรับเปลี่ยน'}
                            </Text>
                        </View>

                        {/* Change Logs List */}
                        {changeLogs.length > 0 ? (
                            <ScrollView style={styles.changeLogList}>
                                {changeLogs.map((log, idx) => (
                                    <View
                                        key={log.id || idx}
                                        style={[
                                            styles.logItem,
                                            log.acknowledged && styles.logItemAck
                                        ]}
                                    >
                                        <View style={[styles.logIcon, {
                                            backgroundColor: log.action === 'add' ? '#dcfce7' : log.action === 'delete' ? '#fee2e2' : '#dbeafe'
                                        }]}>
                                            {log.action === 'add' ? <Plus size={16} color="#16a34a" /> :
                                                log.action === 'delete' ? <Trash2 size={16} color="#dc2626" /> :
                                                    <ArrowRightLeft size={16} color="#2563eb" />}
                                        </View>

                                        <View style={styles.logContent}>
                                            <Text style={styles.logProduct} numberOfLines={1}>
                                                {log.productName || `รหัส ${log.codeProduct}`}
                                            </Text>
                                            <Text style={styles.logDetail}>
                                                {log.action === 'add'
                                                    ? `เพิ่มที่ ${log.shelfCode} ชั้น ${log.toRow}`
                                                    : log.action === 'delete'
                                                        ? `ลบจาก ${log.shelfCode} ชั้น ${log.fromRow}`
                                                        : `ย้าย ${log.shelfCode} ชั้น ${log.fromRow} → ${log.toRow}`}
                                            </Text>
                                        </View>

                                        {log.acknowledged ? (
                                            <View style={styles.ackBadge}>
                                                <Check size={14} color="#16a34a" />
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.btnAck}
                                                onPress={() => handleAcknowledgeOne(log.id)}
                                            >
                                                <Check size={16} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>ไม่พบรายการเปลี่ยนแปลง</Text>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnCancel]}
                                onPress={() => setShowShelfUpdateModal(false)}
                            >
                                <Text style={styles.btnTextCancel}>ปิด</Text>
                            </TouchableOpacity>

                            {changeLogs.length > 0 && (
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.btnPrimary]}
                                    onPress={handleAcknowledgeAll}
                                >
                                    <Text style={styles.btnTextWhite}>รับทราบทั้งหมด</Text>
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
        backgroundColor: '#f8fafc', // slate-50
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
        borderBottomColor: '#f1f5f9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eff6ff', // blue-50
        justifyContent: 'center',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 12,
        color: '#64748b',
    },
    storeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#f8fafc',
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        borderColor: '#fff',
    },

    // Section
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        letterSpacing: -0.5,
    },

    // Grid/Cards
    grid: {
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent', // Ensure consistent sizing
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
            web: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            },
        }),
    },
    cardDisabled: {
        opacity: 0.6,
        backgroundColor: '#f1f5f9',
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },

    // Alert Card Styles
    alertCard: {
        backgroundColor: '#fef2f2', // red-50
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    // ✅ Register Card Style - สีเขียวเด่น
    registerCardMain: {
        backgroundColor: '#10b981',
    },
    registerIconBox: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    alertIconBox: {
        backgroundColor: '#fee2e2',
    },
    alertText: {
        color: '#b91c1c',
    },
    alertSubText: {
        color: '#dc2626',
    },
    countBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ef4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
    },
    countBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Footer
    footerSpacing: {
        height: 40,
    },
    footer: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)', // slate-900/40
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
    modalIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    // Button Styles
    btnPrimary: { backgroundColor: '#3b82f6' },
    btnSuccess: { backgroundColor: '#10b981' },
    btnDanger: { backgroundColor: '#ef4444' },
    btnCancel: { backgroundColor: '#f1f5f9' },

    btnTextWhite: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    btnTextCancel: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 15,
    },

    // Log Modal Specific
    changeLogModal: {
        maxHeight: '70%',
        padding: 0,
        overflow: 'hidden',
    },
    modalHeader: {
        alignItems: 'center',
        paddingTop: 24,
        paddingHorizontal: 24,
    },
    changeLogList: {
        width: '100%',
        maxHeight: 240,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 8,
    },
    logItemAck: {
        opacity: 0.6,
        backgroundColor: '#f1f5f9',
    },
    logIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logContent: {
        flex: 1,
    },
    logProduct: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    logDetail: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    ackBadge: {
        marginLeft: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#dcfce7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnAck: {
        marginLeft: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#cbd5e1', // inactive gray
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 14,
    },
});
