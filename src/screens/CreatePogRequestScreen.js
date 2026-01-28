/**
 * CreatePogRequestScreen - Create POG Change Request
 * Form for submitting product add/move/delete requests
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Modal,
    FlatList,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Check, X, ChevronDown,
    Plus, Trash2, ArrowRightLeft,
    MapPin, ScanLine, FileText, Package
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import { createPogRequest, getBranchShelves, getMyPogRequests } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function CustomPicker({ label, value, options, onChange, placeholder, disabled, icon: Icon }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <View style={styles.pickerWrapper}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
                onPress={() => !disabled && setIsOpen(true)}
                disabled={disabled}
            >
                <View style={styles.pickerBtnContent}>
                    {Icon && <Icon size={18} color={value ? '#1e293b' : '#94a3b8'} style={styles.pickerIcon} />}
                    <Text style={[styles.pickerButtonText, !value && styles.pickerPlaceholder]}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </Text>
                </View>
                <ChevronDown size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Modal visible={isOpen} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.pickerModalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.pickerModalContent}>
                        <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => String(item.value)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.pickerOptionItem,
                                        value === item.value && styles.pickerOptionItemActive,
                                    ]}
                                    onPress={() => {
                                        onChange(item.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            value === item.value && styles.pickerOptionTextActive,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {value === item.value && <Check size={20} color="#10b981" />}
                                </TouchableOpacity>
                            )}
                            style={styles.pickerOptionList}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CreatePogRequestScreen({ navigation, route }) {
    // State & Store
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [action, setAction] = useState(route.params?.defaultAction || '');
    const [barcode, setBarcode] = useState(route.params?.barcode || '');
    const [productName, setProductName] = useState(route.params?.productName || '');
    const [toShelf, setToShelf] = useState('');
    const [toRow, setToRow] = useState('');
    const [toIndex, setToIndex] = useState('');
    const [note, setNote] = useState('');

    const [shelves, setShelves] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [shelvesLoading, setShelvesLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const {
        barcode: initialBarcode = '',
        currentShelf = '',
        currentRow = '',
        currentIndex = '',
        productExists = false,
    } = route.params || {};

    // Header Info
    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

    // Derived Selection Data
    const selectedShelfData = useMemo(() => {
        if (!toShelf) return null;
        return shelves.find((s) => s.shelfCode === toShelf);
    }, [toShelf, shelves]);

    const shelfOptions = useMemo(() => {
        return shelves.map((s) => ({
            value: s.shelfCode,
            label: `${s.shelfCode} - ${s.fullName || s.shelfCode}`,
        }));
    }, [shelves]);

    const rowOptions = useMemo(() => {
        if (!selectedShelfData) return [];
        const rowQty = Number(selectedShelfData.rowQty || 0);
        return Array.from({ length: rowQty }, (_, i) => ({
            value: String(i + 1),
            label: `ชั้น ${i + 1}`,
        }));
    }, [selectedShelfData]);

    const indexOptions = useMemo(() => {
        if (!selectedShelfData || !toRow) return [];
        const items = selectedShelfData.items || [];
        const rowNum = Number(toRow);
        const itemsInRow = items.filter((item) => Number(item.rowNo) === rowNum);
        const maxIndex = itemsInRow.length;
        return Array.from({ length: maxIndex + 1 }, (_, i) => ({
            value: String(i + 1),
            label: i + 1 === maxIndex + 1 ? `${i + 1} (ใหม่)` : String(i + 1),
        }));
    }, [selectedShelfData, toRow]);

    const existingProduct = useMemo(() => {
        if (!barcode || !shelves.length) return null;
        const bc = String(barcode).trim();
        for (const shelf of shelves) {
            for (const item of shelf.items || []) {
                if (String(item.barcode || '').trim() === bc) {
                    return {
                        shelfCode: shelf.shelfCode,
                        shelfName: shelf.fullName || shelf.shelfCode,
                        rowNo: item.rowNo,
                        index: item.index,
                    };
                }
            }
        }
        return null;
    }, [barcode, shelves]);

    const productExistsInShelf = existingProduct !== null;

    // Effects
    useEffect(() => {
        if (!storecode) return;
        const loadShelves = async () => {
            setShelvesLoading(true);
            try {
                const result = await getBranchShelves(storecode);
                setShelves(result?.shelves || []);
            } catch (err) {
                console.error('Load shelves error:', err);
            } finally {
                setShelvesLoading(false);
            }
        };
        loadShelves();

        // Load existing pending requests to check for duplicates
        const loadPendingRequests = async () => {
            try {
                const result = await getMyPogRequests(storecode);
                const pending = (result?.data || []).filter(r => r.status === 'pending');
                setPendingRequests(pending);
            } catch (err) {
                console.error('Load pending requests error:', err);
            }
        };
        loadPendingRequests();
    }, [storecode]);

    useEffect(() => {
        if (error) setError('');
    }, [action, toShelf, toRow, toIndex, barcode, productName, note]);

    useEffect(() => {
        setToRow('');
        setToIndex('');
    }, [toShelf]);

    useEffect(() => {
        setToIndex('');
    }, [toRow]);

    // Handle Submit
    const handleSubmit = async () => {
        if (loading) return;

        if (!action) {
            setError('กรุณาเลือกประเภทการเปลี่ยนแปลง');
            return;
        }
        if (!barcode) {
            setError('กรุณาระบุบาร์โค้ด');
            return;
        }
        if ((action === 'add' || action === 'move') && (!toShelf || !toRow || !toIndex)) {
            setError('กรุณาระบุตำแหน่งให้ครบถ้วน');
            return;
        }

        // Check for duplicate pending request
        const existingPending = pendingRequests.find(
            r => String(r.barcode).trim() === String(barcode).trim()
        );
        if (existingPending) {
            setError(`บาร์โค้ดนี้มีคำขอรอดำเนินการอยู่แล้ว (${existingPending.action === 'add' ? 'เพิ่ม' : existingPending.action === 'move' ? 'ย้าย' : 'ลบ'})`);
            return;
        }

        setLoading(true);
        setError('');

        try {
            await createPogRequest({
                branchCode: storecode,
                action,
                barcode,
                productName,
                fromShelf: currentShelf || null,
                fromRow: currentRow || null,
                fromIndex: currentIndex || null,
                toShelf: action !== 'delete' ? toShelf : null,
                toRow: action !== 'delete' ? Number(toRow) : null,
                toIndex: action !== 'delete' ? Number(toIndex) : null,
                note,
            });
            setSuccess(true);
        } catch (err) {
            console.error('Create POG request error:', err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSuccess = () => {
        setSuccess(false);
        const source = route.params?.source;
        if (source === 'BarcodeScanner') {
            // Use replace to avoid stack buildup - return to scanner with fresh state
            navigation.replace('BarcodeScanner', { success: true });
        } else if (source === 'Planogram') {
            // Go back to Planogram screen
            navigation.goBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => {
                        const source = route.params?.source;
                        if (source === 'BarcodeScanner') {
                            // Go back to BarcodeScanner when came from scanner
                            navigation.replace('BarcodeScanner');
                        } else if (source === 'Planogram') {
                            // Go back to Planogram screen
                            navigation.goBack();
                        } else {
                            // Otherwise go to Home to avoid stack buildup
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            });
                        }
                    }}>
                        <ChevronLeft size={24} color="#10b981" />
                        <Text style={styles.backButtonText}>กลับ</Text>
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>แจ้งขอเปลี่ยนแปลง</Text>
                        <Text style={styles.subtitle}>{branchName}</Text>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    {/* Action Selection - Compact */}
                    <View style={styles.section}>
                        <View style={styles.compactActionContainer}>
                            {[
                                { id: 'add', label: 'นำสินค้าเข้า', icon: Plus, color: '#166534', bg: '#dcfce7', disabled: productExistsInShelf || productExists },
                                { id: 'move', label: 'เปลี่ยนตำแหน่งสินค้า', icon: ArrowRightLeft, color: '#1e40af', bg: '#dbeafe', disabled: !productExistsInShelf && !productExists },
                                { id: 'delete', label: 'นำสินค้าออก', icon: Trash2, color: '#991b1b', bg: '#fee2e2', disabled: !productExistsInShelf && !productExists },
                            ].map((opt) => {
                                const isActive = action === opt.id;
                                const isDisabled = opt.disabled;
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.compactActionBtn,
                                            isActive && { backgroundColor: opt.bg, borderColor: opt.bg },
                                            isDisabled && styles.compactActionDisabled
                                        ]}
                                        onPress={() => !isDisabled && setAction(opt.id)}
                                        disabled={isDisabled}
                                    >
                                        <opt.icon
                                            size={24}
                                            color={isActive ? opt.color : (isDisabled ? '#94a3b8' : '#64748b')}
                                        />
                                        <Text style={[
                                            styles.compactActionText,
                                            isActive && { color: opt.color, fontWeight: '700' },
                                            isDisabled && { color: '#94a3b8' }
                                        ]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Product Info - Compact Mode */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={styles.sectionTitle}>ข้อมูลสินค้า</Text>
                        </View>

                        <View style={styles.compactInputContainer}>
                            {/* Barcode */}
                            <View style={[styles.compactInputRow, { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
                                <View style={styles.compactIconWrapper}>
                                    <ScanLine size={18} color="#64748b" />
                                </View>
                                <TextInput
                                    style={styles.compactInput}
                                    value={barcode}
                                    onChangeText={setBarcode}
                                    placeholder="รหัสบาร์โค้ด"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    editable={!initialBarcode}
                                />
                            </View>

                            {/* Product Name */}
                            <View style={styles.compactInputRow}>
                                <View style={styles.compactIconWrapper}>
                                    <FileText size={18} color="#64748b" />
                                </View>
                                <TextInput
                                    style={styles.compactInput}
                                    value={productName}
                                    onChangeText={setProductName}
                                    placeholder="ชื่อสินค้า (ระบุถ้าทราบ)"
                                    placeholderTextColor="#94a3b8"
                                    editable={!initialBarcode}
                                />
                            </View>
                        </View>

                        {/* Status Badge - Compact */}
                        {!initialBarcode && barcode.length > 0 && !shelvesLoading && (
                            <View style={[styles.compactStatus, productExistsInShelf ? styles.badgeSuccess : styles.badgeError]}>
                                {productExistsInShelf ? <Check size={12} color="#166534" /> : <X size={12} color="#991b1b" />}
                                <Text style={[styles.statusBadgeText, productExistsInShelf ? styles.textSuccess : styles.textError]}>
                                    {productExistsInShelf
                                        ? `มีในระบบ: ${existingProduct?.shelfCode} (ชั้น ${existingProduct?.rowNo})`
                                        : 'ไม่พบ (เพิ่มใหม่ได้)'}
                                </Text>
                            </View>
                        )}

                        {/* Current Location (if product exists) - Compact */}
                        {(productExistsInShelf || (currentShelf && initialBarcode)) && (
                            <View style={styles.compactLocationBox}>
                                <MapPin size={14} color="#0369a1" style={{ marginRight: 6 }} />
                                <Text style={styles.compactLocationLabel}>ปัจจุบัน:</Text>
                                <Text style={styles.compactLocationText}>
                                    {existingProduct
                                        ? `${existingProduct.shelfCode} / ชั้น ${existingProduct.rowNo} / ลำดับ ${existingProduct.index}`
                                        : `${currentShelf} / ชั้น ${currentRow} / ลำดับ ${currentIndex}`
                                    }
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Target Location */}
                    {(action === 'add' || action === 'move') && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {action === 'add' ? 'ตำแหน่งที่ต้องการเพิ่ม' : 'ย้ายไปที่ตำแหน่ง'}
                            </Text>

                            {shelvesLoading ? (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator size="small" color="#10b981" />
                                    <Text style={styles.loadingText}>โหลดข้อมูลชั้นวาง...</Text>
                                </View>
                            ) : (
                                <>
                                    <CustomPicker
                                        label="ชั้นวาง (Shelf)"
                                        value={toShelf}
                                        options={shelfOptions}
                                        onChange={setToShelf}
                                        placeholder="เลือกชั้นวาง"
                                        icon={MapPin}
                                    />
                                    <View style={styles.rowColContainer}>
                                        <View style={{ flex: 1 }}>
                                            <CustomPicker
                                                label="ชั้นที่ (Row)"
                                                value={toRow}
                                                options={rowOptions}
                                                onChange={setToRow}
                                                placeholder="เลือกชั้น"
                                                disabled={!toShelf}
                                            />
                                        </View>
                                        <View style={{ width: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <CustomPicker
                                                label="ลำดับ (No.)"
                                                value={toIndex}
                                                options={indexOptions}
                                                onChange={setToIndex}
                                                placeholder="เลือกลำดับ"
                                                disabled={!toRow}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {/* Note */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>หมายเหตุ</Text>
                        <TextInput
                            style={[styles.inputArea, styles.inputContainer]}
                            value={note}
                            onChangeText={setNote}
                            placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    ) : null}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>ส่งคำขอ</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal visible={success} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconCircle}>
                            <Check size={40} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>ส่งคำขอสำเร็จ!</Text>
                        <Text style={styles.successMessage}>
                            คำขอของคุณถูกส่งไปยังส่วนกลางแล้ว{"\n"}กรุณารอการตรวจสอบ
                        </Text>
                        <TouchableOpacity style={styles.successButton} onPress={handleCloseSuccess}>
                            <Text style={styles.successButtonText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#10b981',
        fontWeight: '500',
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },

    // Sections
    section: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
    },

    // Action Grid
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },

    // Compact Action Buttons
    compactActionContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    compactActionBtn: {
        flex: 1,
        flexDirection: 'column', // Changed to column
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        gap: 6,
        minHeight: 80, // Ensure good touch target
    },
    compactActionDisabled: {
        backgroundColor: '#f1f5f9',
        borderColor: '#f1f5f9',
        opacity: 0.6,
    },
    compactActionText: {
        fontSize: 12, // Slightly smaller
        fontWeight: '600', // Bolder
        color: '#64748b',
        textAlign: 'center', // Center text
        flexWrap: 'wrap', // Allow wrapping
    },
    compactIconWrapper: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    actionCardActive: {
        backgroundColor: '#fff',
    },
    actionCardDisabled: {
        opacity: 0.5,
        backgroundColor: '#f1f5f9',
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
    },

    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 6,
        fontWeight: '500',
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
    inputDisabled: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    inputArea: {
        minHeight: 100,
        paddingTop: 12,
    },

    // Compact Mode Styles
    compactInputContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
    },
    compactInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    compactInputIcon: {
        marginRight: 10,
    },
    compactInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
    },
    compactStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    compactLocationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 8,
    },
    compactLocationLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0369a1',
        marginRight: 6,
    },
    compactLocationText: {
        fontSize: 13,
        color: '#1e40af',
        flex: 1,
    },

    // Status Badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
    },
    badgeSuccess: {
        backgroundColor: '#f0fdf4',
        borderColor: '#dcfce7',
    },
    badgeError: {
        backgroundColor: '#fef2f2',
        borderColor: '#fee2e2',
    },
    statusBadgeText: {
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500',
    },
    textSuccess: { color: '#166534' },
    textError: { color: '#991b1b' },

    // Current Location Box
    currentLocationBox: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    currentLocationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    currentLocationTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0369a1',
    },
    currentLocationText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e40af',
        marginLeft: 22,
    },

    // Pickers
    pickerWrapper: {
        marginBottom: 12,
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    pickerButtonDisabled: {
        opacity: 0.6,
        backgroundColor: '#f1f5f9',
    },
    pickerBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pickerIcon: {
        marginRight: 8,
    },
    pickerButtonText: {
        fontSize: 15,
        color: '#1e293b',
    },
    pickerPlaceholder: {
        color: '#94a3b8',
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: 24,
    },
    pickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    closeBtn: {
        padding: 4,
    },
    pickerOptionList: {
        padding: 8,
    },
    pickerOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    pickerOptionItemActive: {
        backgroundColor: '#ecfdf5',
    },
    pickerOptionText: {
        fontSize: 15,
        color: '#1e293b',
    },
    pickerOptionTextActive: {
        color: '#10b981',
        fontWeight: '600',
    },
    rowColContainer: {
        flexDirection: 'row',
    },

    // Submit
    submitButton: {
        backgroundColor: '#10b981',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    submitButtonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // Error
    errorBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 13,
        textAlign: 'center',
    },

    // Loading
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    loadingText: {
        color: '#64748b',
        fontSize: 14,
    },

    // Success Modal
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    successIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    successButton: {
        backgroundColor: '#10b981',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    successButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
