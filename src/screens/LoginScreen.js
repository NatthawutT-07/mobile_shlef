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
    SafeAreaView,
} from 'react-native';
import useAuthStore from '../store/authStore';
import { getErrorMessage } from '../utils/errorHelper';

export default function LoginScreen({ navigation }) {
    const actionLogin = useAuthStore((s) => s.actionLogin);

    const [loginMode, setLoginMode] = useState('branch'); // 'branch' or 'manual'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
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
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/homepage.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
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
                            <TouchableOpacity
                                style={styles.branchButton}
                                onPress={handleBranchMode}
                                disabled={isLoading}
                            >
                                <Text style={styles.branchButtonText}>🏪 เลือกสาขาของคุณ</Text>
                                <Text style={styles.branchButtonSubtext}>แตะเพื่อเลือกสาขา</Text>
                            </TouchableOpacity>
                        )}

                        {/* Manual Mode */}
                        {loginMode === 'manual' && (
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ชื่อผู้ใช้"
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
                                <TextInput
                                    style={styles.input}
                                    placeholder="รหัสผ่าน"
                                    placeholderTextColor="#94a3b8"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errorMsg) setErrorMsg('');
                                    }}
                                    secureTextEntry
                                    editable={!isLoading}
                                />

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
                                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                            </View>
                        ) : null}
                    </View>

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
        backgroundColor: '#f0fdf4',
        paddingTop: 16,
        paddingBottom: 16,
    },
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: 12,
    },
    appName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#10b981',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        // Use boxShadow for web compatibility
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
        marginBottom: 20,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    modeButtonActive: {
        backgroundColor: '#10b981',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    modeButtonTextActive: {
        color: '#fff',
    },
    branchButton: {
        backgroundColor: '#ecfdf5',
        borderWidth: 2,
        borderColor: '#10b981',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    branchButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#047857',
        marginBottom: 4,
    },
    branchButtonSubtext: {
        fontSize: 13,
        color: '#6b7280',
    },
    form: {
        gap: 12,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1e293b',
    },
    loginButton: {
        backgroundColor: '#10b981',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        textAlign: 'center',
    },
    footer: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 24,
    },
});
