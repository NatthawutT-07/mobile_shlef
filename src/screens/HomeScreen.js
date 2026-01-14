import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ScrollView,
    Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';
import { BRANCHES } from '../constants/branches';

export default function HomeScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    // Get branch full name from code
    const branchName = useMemo(() => {
        const code = user?.storecode || user?.name;
        if (!code) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === code);
        return branch ? branch.label.replace(`${code} - `, '') : code;
    }, [user]);

    const handleLogout = () => {
        // Alert.alert ไม่ทำงานบน web ใช้ confirm แทน
        if (Platform.OS === 'web') {
            if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                logout();
            }
        } else {
            Alert.alert(
                'ออกจากระบบ',
                'คุณต้องการออกจากระบบหรือไม่?',
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    {
                        text: 'ออกจากระบบ',
                        style: 'destructive',
                        onPress: () => logout(),
                    },
                ]
            );
        }
    };

    const menuItems = [
        {
            id: 'scanner',
            icon: '📷',
            title: 'สแกนบาร์โค้ด',
            subtitle: 'ค้นหาสินค้าด้วยกล้อง',
            onPress: () => navigation.navigate('BarcodeScanner'),
            enabled: true,
        },
        {
            id: 'planogram',
            icon: '📋',
            title: 'ดู Planogram',
            subtitle: 'ดูโครงสร้างชั้นวางสินค้า',
            onPress: () => navigation.navigate('Planogram'),
            enabled: true,
        },

        {
            id: 'requests',
            icon: '📦',
            title: 'ประวัติคำขอ',
            subtitle: 'ดูและจัดการคำขอเปลี่ยนแปลง',
            onPress: () => navigation.navigate('PogRequests'),
            enabled: true,
        },
        {
            id: 'reports',
            icon: '📊',
            title: 'รายงาน',
            subtitle: 'เร็วๆ นี้',
            onPress: () => { },
            enabled: false,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.storeName}>
                        สาขา {branchName}
                    </Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>ออก</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Menu */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>เมนูหลัก</Text>

                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, !item.enabled && styles.menuItemDisabled]}
                            onPress={item.onPress}
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
                <Text style={styles.footerText}>BMR Planogram v1.0</Text>
            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    greeting: {
        fontSize: 14,
        color: '#6b7280',
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    welcomeCard: {
        backgroundColor: '#10b981',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    welcomeIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: '#d1fae5',
    },
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
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            },
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
    footer: {
        padding: 16,
        paddingBottom: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
