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
} from 'react-native';
import useAuthStore from '../store/authStore';
import { createPogRequest, getBranchShelves } from '../api/user';

const ACTION_OPTIONS = [
    { value: 'add', label: '➕ เพิ่มสินค้า', desc: 'เพิ่มสินค้านี้ไปยังตำแหน่งใหม่' },
    { value: 'move', label: '↔️ ย้ายตำแหน่ง', desc: 'ย้ายสินค้านี้ไปตำแหน่งอื่น' },
    { value: 'delete', label: '🗑️ ลบสินค้า', desc: 'ลบสินค้าออกจากตำแหน่งปัจจุบัน' },
];

// Custom dropdown component (web compatible)
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
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => String(item.value)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        value === item.value && styles.optionItemActive,
                                    ]}
                                    onPress={() => {
                                        onChange(item.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            value === item.value && styles.optionTextActive,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {value === item.value && <Text style={styles.optionCheck}>✓</Text>}
                                </TouchableOpacity>
                            )}
                            style={styles.optionList}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

export default function CreatePogRequestScreen({ navigation, route }) {
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    // Get product info from route params (if coming from Planogram or Scanner)
    const {
        barcode: initialBarcode = '',
        productName: initialProductName = '',
        currentShelf = '',
        currentRow = '',
        currentIndex = '',
        defaultAction = '',
    } = route.params || {};

    const [action, setAction] = useState(defaultAction);
    const [barcode, setBarcode] = useState(initialBarcode);
    const [productName, setProductName] = useState(initialProductName);
    const [toShelf, setToShelf] = useState('');
    const [toRow, setToRow] = useState('');
    const [toIndex, setToIndex] = useState('');
    const [note, setNote] = useState('');

    const [shelves, setShelves] = useState([]);
    const [shelvesLoading, setShelvesLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Load shelves
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

    // Calculate available rows for selected shelf
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

    // ✅ Check if barcode exists in any shelf
    const existingProduct = useMemo(() => {
        if (!barcode || !shelves.length) return null;
        const bc = String(barcode).trim();
        for (const shelf of shelves) {
            const items = shelf.items || [];
            for (const item of items) {
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

    // Action availability based on product existence
    const productExistsInShelf = existingProduct !== null;

    // Reset when shelf changes
    useEffect(() => {
        setToRow('');
        setToIndex('');
    }, [toShelf]);

    // Reset when row changes
    useEffect(() => {
        setToIndex('');
    }, [toRow]);

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
            const msg = err?.response?.data?.message || 'เกิดข้อผิดพลาด';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Success screen
    if (success) {
        return (
            <View style={styles.container}>
                <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>ส่งคำขอสำเร็จ!</Text>
                    <Text style={styles.successText}>รอดำเนินการ</Text>
                    <TouchableOpacity
                        style={styles.successButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.successButtonText}>กลับ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>แจ้งขอเปลี่ยนแปลง</Text>
                    <Text style={styles.subtitle}>สาขา: {storecode}</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Product Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ข้อมูลสินค้า</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>บาร์โค้ด *</Text>
                        {initialBarcode ? (
                            <View style={styles.readOnlyBox}>
                                <Text style={styles.readOnlyText}>{barcode}</Text>
                            </View>
                        ) : (
                            <View style={styles.inputWithButton}>
                                <TextInput
                                    style={styles.inputFlex}
                                    value={barcode}
                                    onChangeText={setBarcode}
                                    placeholder="กรอกบาร์โค้ด"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={[styles.searchBarButton, !barcode && styles.searchBarButtonDisabled]}
                                    onPress={() => {/* trigger lookup - already auto via existingProduct */ }}
                                    disabled={!barcode}
                                >
                                    <Text style={styles.searchBarButtonText}>🔍</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {/* Show lookup result */}
                        {!initialBarcode && barcode && !shelvesLoading && (
                            <View style={[styles.lookupResult, productExistsInShelf ? styles.lookupResultFound : styles.lookupResultNotFound]}>
                                {productExistsInShelf ? (
                                    <Text style={styles.lookupResultFoundText}>
                                        ✓ พบในสาขา: {existingProduct?.shelfCode} / ชั้น {existingProduct?.rowNo} / ลำดับ {existingProduct?.index}
                                    </Text>
                                ) : (
                                    <Text style={styles.lookupResultNotFoundText}>
                                        ✗ ไม่พบสินค้านี้ใน Planogram
                                    </Text>
                                )}
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

                {/* Action Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>เลือกประเภทการเปลี่ยนแปลง</Text>

                    {/* Show existing location info if found */}
                    {productExistsInShelf && existingProduct && (
                        <View style={styles.existingLocationBox}>
                            <Text style={styles.existingLocationText}>
                                📍 สินค้านี้อยู่ที่: {existingProduct.shelfCode} / ชั้น {existingProduct.rowNo} / ลำดับ {existingProduct.index}
                            </Text>
                        </View>
                    )}

                    {ACTION_OPTIONS.map((opt) => {
                        // Disable logic: same as web-BMR
                        const isAddDisabled = opt.value === 'add' && productExistsInShelf;
                        const isMoveDisabled = opt.value === 'move' && !productExistsInShelf;
                        const isDeleteDisabled = opt.value === 'delete' && !productExistsInShelf;
                        const isDisabled = isAddDisabled || isMoveDisabled || isDeleteDisabled;

                        return (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.actionOption,
                                    action === opt.value && styles.actionOptionActive,
                                    isDisabled && styles.actionOptionDisabled,
                                ]}
                                onPress={() => !isDisabled && setAction(opt.value)}
                                disabled={isDisabled}
                            >
                                <Text
                                    style={[
                                        styles.actionLabel,
                                        action === opt.value && styles.actionLabelActive,
                                        isDisabled && styles.actionLabelDisabled,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                                <Text style={[styles.actionDesc, isDisabled && styles.actionDescDisabled]}>
                                    {isAddDisabled && 'สินค้านี้มีใน shelf แล้ว'}
                                    {isMoveDisabled && 'สินค้านี้ยังไม่มีใน shelf'}
                                    {isDeleteDisabled && 'สินค้านี้ยังไม่มีใน shelf'}
                                    {!isDisabled && opt.desc}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Target Position (for add/move) */}
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

                                {/* Selected Position Info */}
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

                {/* Note */}
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
            </ScrollView>
        </View>
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 12,
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
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    inputWithButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputFlex: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    searchBarButton: {
        width: 44,
        height: 44,
        backgroundColor: '#10b981',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    searchBarButtonDisabled: {
        opacity: 0.4,
    },
    searchBarButtonText: {
        fontSize: 18,
    },
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
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    // Custom Picker styles
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    modalClose: {
        fontSize: 18,
        color: '#64748b',
        padding: 4,
    },
    optionList: {
        maxHeight: 300,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    optionItemActive: {
        backgroundColor: '#ecfdf5',
    },
    optionText: {
        fontSize: 15,
        color: '#374151',
    },
    optionTextActive: {
        color: '#059669',
        fontWeight: '500',
    },
    optionCheck: {
        fontSize: 16,
        color: '#10b981',
    },
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
    actionOption: {
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
    },
    actionOptionActive: {
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    actionLabelActive: {
        color: '#b45309',
    },
    actionDesc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    actionOptionDisabled: {
        opacity: 0.5,
        backgroundColor: '#f8fafc',
    },
    actionLabelDisabled: {
        color: '#94a3b8',
    },
    actionDescDisabled: {
        color: '#94a3b8',
    },
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
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#059669',
        marginBottom: 8,
    },
    successText: {
        fontSize: 15,
        color: '#64748b',
        marginBottom: 24,
    },
    successButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
    },
    successButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
