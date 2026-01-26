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
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronLeft, ChevronRight, Store, AlertCircle } from 'lucide-react-native';
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
                <View style={[styles.iconBox, isSelected ? styles.iconBoxSelected : styles.iconBoxNormal]}>
                    <Store size={20} color={isSelected ? '#10b981' : '#64748b'} />
                </View>

                <View style={styles.branchInfo}>
                    <Text style={[styles.branchName, isSelected && styles.textSelected]} numberOfLines={1}>
                        {item.label.replace(`${item.code} - `, '')}
                    </Text>
                    <Text style={[styles.branchCode, isSelected && styles.textSelected]}>{item.code}</Text>
                </View>

                {isSelected && isLoading ? (
                    <ActivityIndicator size="small" color="#10b981" />
                ) : (
                    <ChevronRight size={20} color="#cbd5e1" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <ChevronLeft size={24} color="#10b981" />
                            <Text style={styles.backButtonText}>กลับ</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>เลือกสาขา</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchWrapper}>
                            <Search size={20} color="#94a3b8" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="ค้นหารหัสหรือชื่อสาขา..."
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <View style={styles.clearBtn}>
                                        <Text style={styles.clearBtnText}>✕</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Error Message */}
                    {errorMsg ? (
                        <View style={styles.errorContainer}>
                            <AlertCircle size={20} color="#dc2626" />
                            <Text style={styles.errorText}>{errorMsg}</Text>
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
                                <Store size={48} color="#e2e8f0" />
                                <Text style={styles.emptyText}>ไม่พบสาขาที่ค้นหา</Text>
                            </View>
                        }
                    />

                    {/* Footer hint */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            พบทั้งหมด {filteredBranches.length} สาขา
                        </Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: '500',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1e293b',
    },

    // Search
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    clearBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearBtnText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
        marginTop: -1,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    errorText: {
        fontSize: 14,
        color: '#b91c1c',
        flex: 1,
    },

    // List
    listContent: {
        padding: 16,
        gap: 12,
    },
    branchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
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
    branchItemSelected: {
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconBoxNormal: {
        backgroundColor: '#f1f5f9',
    },
    iconBoxSelected: {
        backgroundColor: '#d1fae5',
    },
    branchInfo: {
        flex: 1,
    },
    branchName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    branchCode: {
        fontSize: 13,
        color: '#64748b',
    },
    textSelected: {
        color: '#059669',
    },

    // Empty & Footer
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#94a3b8',
    },
    footer: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
    },
});
