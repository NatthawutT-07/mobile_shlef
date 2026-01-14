/**
 * UpdateChecker - Component to check for OTA updates on app launch
 * Shows update modal if new version available
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import * as Updates from 'expo-updates';
import useUpdateStore from '../store/updateStore';

export default function UpdateChecker({ children, navigation }) {
    const hasUpdate = useUpdateStore((s) => s.hasUpdate);
    const skipUpdate = useUpdateStore((s) => s.skipUpdate);
    const setHasUpdate = useUpdateStore((s) => s.setHasUpdate);
    const setChecking = useUpdateStore((s) => s.setChecking);
    const setSkipUpdate = useUpdateStore((s) => s.setSkipUpdate);

    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        // Skip on web or development
        if (Platform.OS === 'web' || __DEV__) {
            return;
        }

        try {
            setChecking(true);
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                setHasUpdate(true, update.manifest);
                if (!skipUpdate) {
                    setShowModal(true);
                }
            } else {
                setHasUpdate(false);
            }
        } catch (err) {
            console.log('Update check error:', err);
        } finally {
            setChecking(false);
        }
    };

    const handleUpdateNow = () => {
        setShowModal(false);
        // Navigate to update screen
        if (navigation) {
            navigation.navigate('Update');
        }
    };

    const handleLater = () => {
        setShowModal(false);
        setSkipUpdate(true);
    };

    return (
        <>
            {children}

            {/* Update Available Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={handleLater}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        {/* Icon */}
                        <Text style={styles.icon}>🔄</Text>

                        {/* Title */}
                        <Text style={styles.title}>มีเวอร์ชั่นใหม่!</Text>

                        {/* Description */}
                        <Text style={styles.description}>
                            มีการอัพเดทแอพพลิเคชันใหม่{'\n'}
                            ต้องการอัพเดทตอนนี้เลยหรือไม่?
                        </Text>

                        {/* Buttons */}
                        <View style={styles.buttons}>
                            <TouchableOpacity
                                style={styles.laterButton}
                                onPress={handleLater}
                            >
                                <Text style={styles.laterButtonText}>ภายหลัง</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={handleUpdateNow}
                            >
                                <Text style={styles.updateButtonText}>อัพเดทเลย</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    icon: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    laterButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        alignItems: 'center',
    },
    laterButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    updateButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#10b981',
        borderRadius: 12,
        alignItems: 'center',
    },
    updateButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
