/**
 * CreatePogRequestScreen - Create POG Change Request
 * Form for submitting product add/move/delete requests
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useState, useEffect, useMemo } from 'react';

// React Native
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
} from 'react-native';

// Local imports
import useAuthStore from '../store/authStore';
import { createPogRequest, getBranchShelves } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';
import { BRANCHES } from '../constants/branches';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Available action types for POG requests */
const ACTION_OPTIONS = [
    { value: 'add', label: '➕ เพิ่มสินค้า', desc: 'เพิ่มสินค้านี้ไปยังตำแหน่งใหม่' },
    { value: 'move', label: '↔️ ย้ายตำแหน่ง', desc: 'ย้ายสินค้านี้ไปตำแหน่งอื่น' },
    { value: 'delete', label: '🗑️ ลบสินค้า', desc: 'ลบสินค้าออกจากตำแหน่งปัจจุบัน' },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * CustomPicker - Web-compatible dropdown component
 */
function CustomPicker({ label, value, options, onChange, placeholder, disabled }) {
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
                <Text style={[styles.pickerButtonText, !value && styles.pickerPlaceholder]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
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
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.pickerModalClose}>✕</Text>
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
                                    {value === item.value && <Text style={styles.pickerOptionCheck}>✓</Text>}
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
    // -------------------------------------------------------------------------
    // State & Store
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    // Form state
    const [action, setAction] = useState(route.params?.defaultAction || '');
    const [barcode, setBarcode] = useState(route.params?.barcode || '');
    const [productName, setProductName] = useState(route.params?.productName || '');
    const [toShelf, setToShelf] = useState('');
    const [toRow, setToRow] = useState('');
    const [toIndex, setToIndex] = useState('');
    const [note, setNote] = useState('');

    // Data state
    const [shelves, setShelves] = useState([]);
    const [shelvesLoading, setShelvesLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Route params
    const {
        barcode: initialBarcode = '',
        currentShelf = '',
        currentRow = '',
        currentIndex = '',
        productExists = false,
    } = route.params || {};

    // -------------------------------------------------------------------------
    // Derived Values
    // -------------------------------------------------------------------------
    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

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

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
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
        navigation.goBack();
    };

    // -------------------------------------------------------------------------
    // Render Helpers
    // -------------------------------------------------------------------------
    const renderActionOptions = () => (
        <View style={styles.actionOptionsRow}>
            {ACTION_OPTIONS.map((opt) => {
                const isAddDisabled = opt.value === 'add' && (productExistsInShelf || productExists);
                const isMoveDisabled = opt.value === 'move' && !productExistsInShelf && !productExists;
                const isDeleteDisabled = opt.value === 'delete' && !productExistsInShelf && !productExists;
                const isDisabled = isAddDisabled || isMoveDisabled || isDeleteDisabled;

                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.actionOptionBlock,
                            action === opt.value && styles.actionOptionBlockActive,
                            isDisabled && styles.actionOptionBlockDisabled,
                        ]}
                        onPress={() => !isDisabled && setAction(opt.value)}
                        disabled={isDisabled}
                    >
                        <Text
                            style={[
                                styles.actionBlockLabel,
                                action === opt.value && styles.actionBlockLabelActive,
                                isDisabled && styles.actionBlockLabelDisabled,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <View style={styles.container}>
            {/* Success Modal */}
            <Modal visible={success} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.successOverlay}
                    activeOpacity={1}
                    onPress={handleCloseSuccess}
                >
                    <View style={styles.successPopup}>
                        <Text style={styles.successPopupIcon}>✅</Text>
                        <Text style={styles.successPopupTitle}>ส่งคำขอสำเร็จ!</Text>
                        <Text style={styles.successPopupText}>รอดำเนินการ</Text>
                        <TouchableOpacity style={styles.successPopupButton} onPress={handleCloseSuccess}>
                            <Text style={styles.successPopupButtonText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>แจ้งขอเปลี่ยนแปลง</Text>
                    <Text style={styles.subtitle}>สาขา: {branchName}</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Product Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ข้อมูลสินค้า</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>บาร์โค้ด *</Text>
                        {initialBarcode ? (
                            <View style={styles.readOnlyBox}>
                                <Text style={styles.readOnlyText}>{barcode}</Text>
                            </View>
                        ) : (
                            <TextInput
                                style={styles.input}
                                value={barcode}
                                onChangeText={setBarcode}
                                placeholder="กรอกบาร์โค้ด"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                            />
                        )}
                        {!initialBarcode && barcode && !shelvesLoading && (
                            <View style={[styles.lookupResult, productExistsInShelf ? styles.lookupResultFound : styles.lookupResultNotFound]}>
                                <Text style={productExistsInShelf ? styles.lookupResultFoundText : styles.lookupResultNotFoundText}>
                                    {productExistsInShelf
                                        ? `✓ พบในสาขา: ${existingProduct?.shelfCode} / ชั้น ${existingProduct?.rowNo} / ลำดับ ${existingProduct?.index}`
                                        : '✗ ไม่พบสินค้านี้ใน Planogram'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ชื่อสินค้า</Text>
                        {initialBarcode ? (
                            <View style={styles.readOnlyBox}>
                                <Text style={styles.readOnlyText}>{productName || '-'}</Text>
                            </View>
                        ) : (
                            <TextInput
                                style={styles.input}
                                value={productName}
                                onChangeText={setProductName}
                                placeholder="ชื่อสินค้า (ถ้าทราบ)"
                                placeholderTextColor="#94a3b8"
                            />
                        )}
                    </View>

                    {currentShelf && (
                        <View style={styles.currentPositionBox}>
                            <Text style={styles.currentPositionLabel}>ตำแหน่งปัจจุบัน:</Text>
                            <Text style={styles.currentPositionText}>
                                {currentShelf} / ชั้น {currentRow} / ลำดับ {currentIndex}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Action Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>เลือกประเภทการเปลี่ยนแปลง</Text>
                    {productExistsInShelf && existingProduct && (
                        <View style={styles.existingLocationBox}>
                            <Text style={styles.existingLocationText}>
                                📍 สินค้านี้อยู่ที่: {existingProduct.shelfCode} / ชั้น {existingProduct.rowNo} / ลำดับ {existingProduct.index}
                            </Text>
                        </View>
                    )}
                    {renderActionOptions()}
                </View>

                {/* Target Position Section */}
                {(action === 'add' || action === 'move') && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {action === 'add' ? 'ตำแหน่งที่ต้องการเพิ่ม' : 'ตำแหน่งปลายทาง'}
                        </Text>

                        {shelvesLoading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="small" color="#10b981" />
                                <Text style={styles.loadingText}>กำลังโหลดข้อมูลชั้นวาง...</Text>
                            </View>
                        ) : (
                            <>
                                <CustomPicker
                                    label="ชั้นวาง (Shelf)"
                                    value={toShelf}
                                    options={shelfOptions}
                                    onChange={setToShelf}
                                    placeholder="-- เลือกชั้นวาง --"
                                />
                                <CustomPicker
                                    label="ชั้นที่ (Row)"
                                    value={toRow}
                                    options={rowOptions}
                                    onChange={setToRow}
                                    placeholder="-- เลือกชั้น --"
                                    disabled={rowOptions.length === 0}
                                />
                                <CustomPicker
                                    label="ลำดับ (Index)"
                                    value={toIndex}
                                    options={indexOptions}
                                    onChange={setToIndex}
                                    placeholder="-- เลือกลำดับ --"
                                    disabled={indexOptions.length === 0}
                                />
                                {toShelf && toRow && toIndex && (
                                    <View style={styles.positionInfoBox}>
                                        <Text style={styles.positionInfoText}>
                                            📍 ตำแหน่งที่เลือก: {toShelf} / ชั้น {toRow} / ลำดับ {toIndex}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Note Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>หมายเหตุ (ถ้ามี)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Error Display */}
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
            </ScrollView>
        </View>
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
        padding: 16,
    },

    // Header
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
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },

    // Sections
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        ...Platform.select({
            web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' },
            default: { elevation: 2 },
        }),
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },

    // Form Elements
    inputGroup: {
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    readOnlyBox: {
        backgroundColor: '#e2e8f0',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    readOnlyText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '500',
    },

    // Lookup Result
    lookupResult: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
    },
    lookupResultFound: {
        backgroundColor: '#d1fae5',
    },
    lookupResultNotFound: {
        backgroundColor: '#fee2e2',
    },
    lookupResultFoundText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '500',
    },
    lookupResultNotFoundText: {
        fontSize: 12,
        color: '#dc2626',
        fontWeight: '500',
    },

    // Position Boxes
    currentPositionBox: {
        backgroundColor: '#f0f9ff',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentPositionLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    currentPositionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0369a1',
        marginLeft: 8,
    },
    existingLocationBox: {
        backgroundColor: '#dbeafe',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    existingLocationText: {
        fontSize: 13,
        color: '#1e40af',
        fontWeight: '500',
    },
    positionInfoBox: {
        backgroundColor: '#dbeafe',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    positionInfoText: {
        fontSize: 13,
        color: '#1e40af',
        fontWeight: '500',
    },

    // Action Options
    actionOptionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionOptionBlock: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    actionOptionBlockActive: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5',
    },
    actionOptionBlockDisabled: {
        opacity: 0.4,
        backgroundColor: '#f1f5f9',
    },
    actionBlockLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    actionBlockLabelActive: {
        color: '#059669',
    },
    actionBlockLabelDisabled: {
        color: '#9ca3af',
    },

    // Custom Picker
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
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    pickerButtonDisabled: {
        opacity: 0.5,
    },
    pickerButtonText: {
        fontSize: 15,
        color: '#1e293b',
    },
    pickerPlaceholder: {
        color: '#94a3b8',
    },
    pickerArrow: {
        fontSize: 12,
        color: '#94a3b8',
    },

    // Picker Modal
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    pickerModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    pickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    pickerModalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    pickerModalClose: {
        fontSize: 18,
        color: '#64748b',
        padding: 4,
    },
    pickerOptionList: {
        maxHeight: 300,
    },
    pickerOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerOptionItemActive: {
        backgroundColor: '#ecfdf5',
    },
    pickerOptionText: {
        fontSize: 15,
        color: '#374151',
    },
    pickerOptionTextActive: {
        color: '#059669',
        fontWeight: '500',
    },
    pickerOptionCheck: {
        fontSize: 16,
        color: '#10b981',
    },

    // Loading
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#64748b',
    },

    // Error
    errorBox: {
        backgroundColor: '#fef2f2',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
    },

    // Submit Button
    submitButton: {
        backgroundColor: '#f59e0b',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // Success Modal
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successPopup: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        minWidth: 250,
        ...Platform.select({
            web: { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
            default: { elevation: 8 },
        }),
    },
    successPopupIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    successPopupTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 4,
    },
    successPopupText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    successPopupButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 8,
    },
    successPopupButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
