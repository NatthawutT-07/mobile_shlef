/**
 * HomeScreen - Main menu screen for BMR Planogram app
 * Displays main navigation options and user info
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useMemo, useState } from 'react';

// React Native
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform,
    Modal,
} from 'react-native';

// Local imports
import useAuthStore from '../store/authStore';
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
            title: 'ประวัติคำขอ',
            subtitle: 'ดูและจัดการคำขอเปลี่ยนแปลง',
            screen: 'PogRequests',
            enabled: true,
        },
        {
            id: 'reports',
            icon: '📊',
            title: 'รายงาน',
            subtitle: 'เร็วๆ นี้',
            screen: null,
            enabled: false,
        },
    ];

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
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>ออก</Text>
                </TouchableOpacity>
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
});
