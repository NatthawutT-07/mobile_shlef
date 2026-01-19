import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRANCHES } from '../constants/branches';
import useAuthStore from '../store/authStore';
import { getErrorMessage } from '../utils/errorHelper';

export default function BranchSelectScreen({ navigation }) {
    const actionLogin = useAuthStore((s) => s.actionLogin);

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null);

    // Filter branches by search
    const filteredBranches = BRANCHES.filter(
        (b) =>
            b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle branch selection
    const handleSelectBranch = async (branch) => {
        setSelectedBranch(branch.code);
        setErrorMsg('');
        setIsLoading(true);

        try {
            const branchPassword = `POG@${branch.code}`;
            await actionLogin({
                name: branch.code,
                password: branchPassword,
                storecode: branch.code,
            });
            // Navigation will happen automatically via AppNavigator
        } catch (err) {
            let errMsg = getErrorMessage(err, 'เข้าสู่ระบบไม่สำเร็จ');

            // Translate common login errors to Thai
            const lowered = String(errMsg).toLowerCase();
            if (lowered.includes('user not found') || lowered.includes('not enabled')) {
                errMsg = 'ไม่พบผู้ใช้หรือยังไม่เปิดใช้งาน';
            } else if (lowered.includes('password invalid')) {
                errMsg = 'รหัสผ่านไม่ถูกต้อง';
            }

            setErrorMsg(errMsg);
            setSelectedBranch(null);
        } finally {
            setIsLoading(false);
        }
    };

    const renderBranchItem = ({ item }) => {
        const isSelected = selectedBranch === item.code;

        return (
            <TouchableOpacity
                style={[styles.branchItem, isSelected && styles.branchItemSelected]}
                onPress={() => handleSelectBranch(item)}
                disabled={isLoading}
            >
                <View style={styles.branchInfo}>
                    <Text style={styles.branchCode}>{item.code}</Text>
                    <Text style={styles.branchName} numberOfLines={1}>
                        {item.label.replace(`${item.code} - `, '')}
                    </Text>
                </View>
                {isSelected && isLoading ? (
                    <ActivityIndicator size="small" color="#10b981" />
                ) : (
                    <Text style={styles.branchArrow}>›</Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <Text style={styles.title}>เลือกสาขา</Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍 ค้นหาสาขา..."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
            </View>

            {/* Error Message */}
            {errorMsg ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
            ) : null}

            {/* Branch List */}
            <FlatList
                data={filteredBranches}
                keyExtractor={(item) => item.code}
                renderItem={renderBranchItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>ไม่พบสาขาที่ค้นหา</Text>
                    </View>
                }
            />

            {/* Footer hint */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    แตะที่สาขาเพื่อเข้าสู่ระบบ
                </Text>
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
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    searchInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        marginHorizontal: 16,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        gap: 8,
    },
    branchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
            },
        }),
    },
    branchItemSelected: {
        borderWidth: 2,
        borderColor: '#10b981',
    },
    branchInfo: {
        flex: 1,
    },
    branchCode: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
        marginBottom: 2,
    },
    branchName: {
        fontSize: 15,
        color: '#374151',
    },
    branchArrow: {
        fontSize: 24,
        color: '#9ca3af',
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#6b7280',
    },
    footer: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    footerText: {
        fontSize: 13,
        color: '#9ca3af',
    },
});
