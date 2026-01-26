import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, User, Lock, Store, KeyRound, Building2 } from 'lucide-react-native';
import useAuthStore from '../store/authStore';
import { getErrorMessage } from '../utils/errorHelper';

export default function LoginScreen({ navigation }) {
    const actionLogin = useAuthStore((s) => s.actionLogin);

    const [loginMode, setLoginMode] = useState('branch'); // 'branch' or 'manual'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle branch login (navigate to branch select)
    const handleBranchMode = () => {
        navigation.navigate('BranchSelect');
    };

    // Handle manual login
    const handleManualLogin = async () => {
        const cleanName = username.trim();
        const cleanPass = password.trim();

        if (!cleanName || !cleanPass) {
            setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        setErrorMsg('');
        setIsLoading(true);

        try {
            await actionLogin({
                name: cleanName,
                password: cleanPass,
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBg}>
                            <Image
                                source={require('../../assets/homepage.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.appName}>BMR Planogram</Text>
                        <Text style={styles.appSubtitle}>ระบบจัดการชั้นวางสินค้า</Text>
                    </View>

                    {/* Login Card */}
                    <View style={styles.card}>
                        {/* Mode Toggle */}
                        <View style={styles.modeToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.modeButton,
                                    loginMode === 'branch' && styles.modeButtonActive,
                                ]}
                                onPress={() => setLoginMode('branch')}
                            >
                                <Store
                                    size={16}
                                    color={loginMode === 'branch' ? '#fff' : '#64748b'}
                                    style={styles.modeIcon}
                                />
                                <Text
                                    style={[
                                        styles.modeButtonText,
                                        loginMode === 'branch' && styles.modeButtonTextActive,
                                    ]}
                                >
                                    เลือกสาขา
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modeButton,
                                    loginMode === 'manual' && styles.modeButtonActive,
                                ]}
                                onPress={() => setLoginMode('manual')}
                            >
                                <KeyRound
                                    size={16}
                                    color={loginMode === 'manual' ? '#fff' : '#64748b'}
                                    style={styles.modeIcon}
                                />
                                <Text
                                    style={[
                                        styles.modeButtonText,
                                        loginMode === 'manual' && styles.modeButtonTextActive,
                                    ]}
                                >
                                    กรอกรหัส
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Branch Mode */}
                        {loginMode === 'branch' && (
                            <View style={styles.branchModeContainer}>


                                <TouchableOpacity
                                    style={styles.branchButton}
                                    onPress={handleBranchMode}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.branchButtonText}>เลือกสาขาของคุณ</Text>
                                    <View style={styles.branchBtnIcon}>
                                        <Store size={20} color="#047857" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Manual Mode */}
                        {loginMode === 'manual' && (
                            <View style={styles.form}>
                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIcon}>
                                        <User size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ชื่อผู้ใช้ / รหัสพนักงาน"
                                        placeholderTextColor="#94a3b8"
                                        value={username}
                                        onChangeText={(text) => {
                                            setUsername(text);
                                            if (errorMsg) setErrorMsg('');
                                        }}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isLoading}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="รหัสผ่าน"
                                        placeholderTextColor="#94a3b8"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (errorMsg) setErrorMsg('');
                                        }}
                                        secureTextEntry={!showPassword}
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        style={styles.passVisibility}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#94a3b8" />
                                        ) : (
                                            <Eye size={20} color="#94a3b8" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                                    onPress={handleManualLogin}
                                    disabled={isLoading || !username || !password}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Error Message */}
                        {errorMsg ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={styles.operatingHours}>
                        🕒 เวลาทำการระบบ 08.30 - 18.00 น.
                    </Text>

                    {/* Footer */}
                    <Text style={styles.footer}>BMR Planogram v1.0.1</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBg: {
        width: 100,
        height: 100,
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 16,
        padding: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    appName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    appSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    operatingHours: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 24,
        textAlign: 'center',
        backgroundColor: '#f1f5f9',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        // Use boxShadow for web compatibility
        ...Platform.select({
            web: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
            },
        }),
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        gap: 8,
    },
    modeButtonActive: {
        backgroundColor: '#10b981',
        ...Platform.select({
            ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
            android: { elevation: 2 },
        }),
    },
    modeIcon: {
        marginRight: 4,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    modeButtonTextActive: {
        color: '#fff',
    },

    // Branch Mode
    branchModeContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    branchIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    branchModeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    branchModeDesc: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    branchButton: {
        width: '100%',
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#10b981',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    branchButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#047857',
    },
    branchBtnIcon: {
        backgroundColor: '#d1fae5',
        padding: 4,
        borderRadius: 8,
    },

    // Manual Form
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1e293b',
    },
    passVisibility: {
        padding: 8,
    },
    loginButton: {
        backgroundColor: '#10b981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        ...Platform.select({
            ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 4 },
        }),
    },
    loginButtonDisabled: {
        opacity: 0.6,
        backgroundColor: '#94a3b8',
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 10,
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        textAlign: 'center',
    },
    footer: {
        textAlign: 'center',
        color: '#cbd5e1',
        fontSize: 12,
        marginTop: 32,
    },
});
