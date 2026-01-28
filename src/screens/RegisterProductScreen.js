/**
 * RegisterProductScreen - ลงทะเบียนสินค้าโดยตรง
 * สแกนบาร์โค้ด → เลือก Shelf/Row → บันทึกลง DB ทันที
 */

// =============================================================================
// IMPORTS
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    TextInput,
    ScrollView,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
    ChevronLeft, ScanLine, Check, X, Package,
    MapPin, ChevronDown, Keyboard, AlertTriangle
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import { BRANCHES } from '../constants/branches';
import {
    checkProductExists,
    getShelvesForRegister,
    getNextIndex,
    registerProduct
} from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';

// =============================================================================
// CONSTANTS
// =============================================================================

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'qr'];
const SCAN_THROTTLE_MS = 500;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RegisterProductScreen({ navigation }) {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const branchCode = user?.storecode || user?.name;

    const [permission, requestPermission] = useCameraPermissions();
    const [step, setStep] = useState('scan'); // scan, select, confirm, success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Product info
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [product, setProduct] = useState(null);
    const [alreadyExists, setAlreadyExists] = useState(false);
    const [existingLocation, setExistingLocation] = useState(null);

    // Shelf/Row selection
    const [shelves, setShelves] = useState([]);
    const [selectedShelf, setSelectedShelf] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);
    const [nextIndex, setNextIndex] = useState(1);

    // UI states
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualBarcode, setManualBarcode] = useState('');
    const [showShelfPicker, setShowShelfPicker] = useState(false);
    const [showRowPicker, setShowRowPicker] = useState(false);

    // Refs for throttling
    const lastScanTime = useRef(0);
    const isProcessing = useRef(false);

    // -------------------------------------------------------------------------
    // Derived Values
    // -------------------------------------------------------------------------
    const branchName = BRANCHES.find(b => b.code === branchCode)?.label.replace(`${branchCode} - `, '') || branchCode;
    const hasPermission = Platform.OS === 'web' ? true : permission?.granted;

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (Platform.OS !== 'web' && !permission) {
            requestPermission();
        }
    }, [permission]);

    useEffect(() => {
        if (branchCode) {
            loadShelves();
        }
    }, [branchCode]);

    useEffect(() => {
        if (selectedShelf && selectedRow) {
            loadNextIndex();
        }
    }, [selectedShelf, selectedRow]);

    // -------------------------------------------------------------------------
    // API Functions
    // -------------------------------------------------------------------------
    const loadShelves = async () => {
        try {
            const data = await getShelvesForRegister(branchCode);
            if (data.ok) {
                // เรียงลำดับแบบ natural sort (W1, W2, W3...W10, W11, W12)
                const sorted = [...data.shelves].sort((a, b) => {
                    return a.shelfCode.localeCompare(b.shelfCode, undefined, { numeric: true, sensitivity: 'base' });
                });
                setShelves(sorted);
            }
        } catch (err) {
            console.error('Failed to load shelves:', err);
        }
    };

    const loadNextIndex = async () => {
        try {
            const data = await getNextIndex(branchCode, selectedShelf.shelfCode, selectedRow);
            if (data.ok) {
                setNextIndex(data.nextIndex);
            }
        } catch (err) {
            console.error('Failed to get next index:', err);
        }
    };

    const handleBarcodeScan = useCallback(async (barcode) => {
        const now = Date.now();
        if (now - lastScanTime.current < SCAN_THROTTLE_MS) return;
        if (isProcessing.current) return;

        lastScanTime.current = now;
        isProcessing.current = true;
        setLoading(true);
        setError('');

        try {
            const data = await checkProductExists(branchCode, barcode);
            setScannedBarcode(barcode);

            if (!data.ok) {
                setError(data.msg || 'เกิดข้อผิดพลาด');
                isProcessing.current = false;
                setLoading(false);
                return;
            }

            if (!data.found) {
                setError('ไม่พบสินค้าในระบบ Master - กรุณาติดต่อ Admin');
                isProcessing.current = false;
                setLoading(false);
                return;
            }

            setProduct(data.product);

            if (data.exists) {
                setAlreadyExists(true);
                setExistingLocation(data.location);
                setStep('exists');
            } else {
                setAlreadyExists(false);
                setStep('select');
            }

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
            isProcessing.current = false;
        }
    }, [branchCode]);

    const handleBarcodeScanned = ({ data }) => {
        if (step === 'scan' && data?.length >= 5 && data?.length <= 20) {
            handleBarcodeScan(data);
        }
    };

    const handleManualSubmit = () => {
        if (manualBarcode.length >= 5) {
            setShowManualInput(false);
            handleBarcodeScan(manualBarcode);
        }
    };

    const handleRegister = async () => {
        if (!selectedShelf || !selectedRow) {
            Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเลือกชั้นวาง');
            return;
        }

        setLoading(true);
        try {
            const data = await registerProduct({
                branchCode,
                barcode: scannedBarcode,
                shelfCode: selectedShelf.shelfCode,
                rowNo: selectedRow,
            });

            if (data.ok) {
                setStep('success');
            } else {
                Alert.alert('ผิดพลาด', data.msg || 'ไม่สามารถลงทะเบียนได้');
            }
        } catch (err) {
            Alert.alert('ผิดพลาด', getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setStep('scan');
        setScannedBarcode('');
        setProduct(null);
        setAlreadyExists(false);
        setExistingLocation(null);
        setSelectedShelf(null);
        setSelectedRow(null);
        setNextIndex(1);
        setError('');
        setManualBarcode('');
        isProcessing.current = false;
    };

    // -------------------------------------------------------------------------
    // Render Functions
    // -------------------------------------------------------------------------
    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <ChevronLeft size={24} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>ลงทะเบียนสินค้า</Text>
                <Text style={styles.headerSubtitle}>{branchName}</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderScanner = () => (
        <View style={styles.scannerContainer}>
            {/* แสดงกล้องเฉพาะเมื่อไม่ได้เปิด Manual Input */}
            {hasPermission && !showManualInput ? (
                <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                    onBarcodeScanned={handleBarcodeScanned}
                >
                    <View style={styles.scanOverlay}>
                        <View style={styles.scanFrame}>
                            <ScanLine size={200} color="rgba(255,255,255,0.3)" strokeWidth={0.5} />
                        </View>
                        <Text style={styles.scanHint}>วางบาร์โค้ดในกรอบ</Text>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.noPermission}>
                    <AlertTriangle size={48} color="#f59e0b" />
                    <Text style={styles.noPermissionText}>ไม่มีสิทธิ์เข้าถึงกล้อง</Text>
                </View>
            )}

            {/* Manual Input Button */}
            <TouchableOpacity
                style={styles.manualButton}
                onPress={() => setShowManualInput(true)}
            >
                <Keyboard size={20} color="#fff" />
                <Text style={styles.manualButtonText}>พิมพ์บาร์โค้ด</Text>
            </TouchableOpacity>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังตรวจสอบ...</Text>
                </View>
            )}

            {error ? (
                <View style={styles.errorContainer}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={resetScanner}>
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );

    const renderProductExists = () => (
        <View style={styles.resultContainer}>
            <View style={styles.existsCard}>
                <View style={styles.existsIcon}>
                    <AlertTriangle size={32} color="#f59e0b" />
                </View>
                <Text style={styles.existsTitle}>สินค้านี้มีอยู่แล้ว</Text>
                <Text style={styles.productName}>{product?.nameProduct}</Text>
                <Text style={styles.productBrand}>{product?.nameBrand}</Text>

                <View style={styles.locationBadge}>
                    <MapPin size={16} color="#2563eb" />
                    <Text style={styles.locationText}>
                        {existingLocation?.shelfCode} / ชั้น {existingLocation?.rowNo} / ตำแหน่ง {existingLocation?.index}
                    </Text>
                </View>

                {/* ปุ่มสแกนสินค้าอื่น */}
                <TouchableOpacity style={styles.successButton} onPress={resetScanner}>
                    <Text style={styles.successButtonText}>สแกนสินค้าอื่น</Text>
                </TouchableOpacity>

                {/* ปุ่มกลับหน้าหลัก */}
                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.replace('Home')}
                >
                    <Text style={styles.linkButtonText}>กลับหน้าหลัก</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSelectLocation = () => (
        <ScrollView style={styles.selectContainer} contentContainerStyle={styles.selectContent}>
            {/* Product Info */}
            <View style={styles.productCard}>
                <Package size={24} color="#10b981" />
                <View style={styles.productInfo}>
                    <Text style={styles.productNameLeft}>{product?.nameProduct}</Text>
                    <Text style={styles.productBrand}>{product?.nameBrand}</Text>
                    <Text style={styles.productBarcode}>บาร์โค้ด: {scannedBarcode}</Text>
                </View>
            </View>

            {/* Shelf Selector */}
            <Text style={styles.selectLabel}>เลือกชั้นวาง</Text>
            <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowShelfPicker(true)}
            >
                <Text style={selectedShelf ? styles.selectText : styles.selectPlaceholder}>
                    {selectedShelf ? `${selectedShelf.shelfCode} - ${selectedShelf.fullName}` : 'กดเพื่อเลือกชั้นวาง'}
                </Text>
                <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Row Selector */}
            {selectedShelf && (
                <>
                    <Text style={styles.selectLabel}>เลือกชั้น (Row)</Text>
                    <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setShowRowPicker(true)}
                    >
                        <Text style={selectedRow ? styles.selectText : styles.selectPlaceholder}>
                            {selectedRow ? `ชั้นที่ ${selectedRow}` : 'กดเพื่อเลือกชั้น'}
                        </Text>
                        <ChevronDown size={20} color="#64748b" />
                    </TouchableOpacity>
                </>
            )}

            {/* Next Index Preview */}
            {selectedShelf && selectedRow && (
                <View style={styles.indexPreview}>
                    <Text style={styles.indexLabel}>ตำแหน่งที่จะบันทึก:</Text>
                    <Text style={styles.indexValue}>
                        {selectedShelf.shelfCode} / ชั้น {selectedRow} / ตำแหน่ง {nextIndex}
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={resetScanner}>
                    <X size={20} color="#64748b" />
                    <Text style={styles.secondaryButtonText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.primaryButton, (!selectedShelf || !selectedRow) && styles.disabledButton]}
                    onPress={handleRegister}
                    disabled={!selectedShelf || !selectedRow || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Check size={20} color="#fff" />
                            <Text style={styles.primaryButtonText}>ยืนยันลงทะเบียน</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderSuccess = () => (
        <View style={styles.resultContainer}>
            <View style={styles.successCard}>
                <View style={styles.successIcon}>
                    <Check size={48} color="#fff" />
                </View>
                <Text style={styles.successTitle}>ลงทะเบียนสำเร็จ!</Text>
                <Text style={styles.productName}>{product?.nameProduct}</Text>

                <View style={styles.locationBadge}>
                    <MapPin size={16} color="#10b981" />
                    <Text style={[styles.locationText, { color: '#10b981' }]}>
                        {selectedShelf?.shelfCode} / ชั้น {selectedRow} / ตำแหน่ง {nextIndex}
                    </Text>
                </View>

                {/* ปุ่มสแกนสินค้าถัดไป */}
                <TouchableOpacity style={styles.successButton} onPress={resetScanner}>
                    <Text style={styles.successButtonText}>สแกนสินค้าถัดไป</Text>
                </TouchableOpacity>

                {/* ปุ่มไปดู Planogram */}
                {/* <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={() => navigation.replace('Planogram')}
                >
                    <Text style={styles.outlineButtonText}>ตรวจสอบ Planogram</Text>
                </TouchableOpacity> */}

                {/* ปุ่มกลับหน้าหลัก */}
                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.replace('Home')}
                >
                    <Text style={styles.linkButtonText}>กลับหน้าหลัก</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // -------------------------------------------------------------------------
    // Main Render
    // -------------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {renderHeader()}

            {step === 'scan' && renderScanner()}
            {step === 'exists' && renderProductExists()}
            {step === 'select' && renderSelectLocation()}
            {step === 'success' && renderSuccess()}

            {/* Manual Input Modal */}
            <Modal visible={showManualInput} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>พิมพ์บาร์โค้ด</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="บาร์โค้ด"
                            value={manualBarcode}
                            onChangeText={setManualBarcode}
                            keyboardType="number-pad"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnCancel]}
                                onPress={() => setShowManualInput(false)}
                            >
                                <Text style={styles.btnTextCancel}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.btnPrimary]}
                                onPress={handleManualSubmit}
                            >
                                <Text style={styles.btnTextWhite}>ตกลง</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Shelf Picker Modal */}
            <Modal visible={showShelfPicker} transparent animationType="slide">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>เลือกชั้นวาง</Text>
                            <TouchableOpacity onPress={() => setShowShelfPicker(false)}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {shelves.map((shelf) => (
                                <TouchableOpacity
                                    key={shelf.shelfCode}
                                    style={[
                                        styles.pickerItem,
                                        selectedShelf?.shelfCode === shelf.shelfCode && styles.pickerItemSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedShelf(shelf);
                                        setSelectedRow(null);
                                        setShowShelfPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>
                                        {shelf.shelfCode} - {shelf.fullName}
                                    </Text>
                                    <Text style={styles.pickerItemSub}>{shelf.rowQty} ชั้น</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Row Picker Modal */}
            <Modal visible={showRowPicker} transparent animationType="slide">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>เลือกชั้น</Text>
                            <TouchableOpacity onPress={() => setShowRowPicker(false)}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {selectedShelf && Array.from({ length: selectedShelf.rowQty }, (_, i) => i + 1).map((row) => (
                                <TouchableOpacity
                                    key={row}
                                    style={[
                                        styles.pickerItem,
                                        selectedRow === row && styles.pickerItemSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedRow(row);
                                        setShowRowPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>ชั้นที่ {row}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
    },

    // Scanner
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    scanOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanFrame: {
        width: 260,
        height: 260,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanHint: {
        marginTop: 24,
        color: '#fff',
        fontSize: 16,
    },
    noPermission: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e293b',
    },
    noPermissionText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
    },
    manualButton: {
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    manualButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
    },
    errorContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: '#fee2e2',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        flex: 1,
        color: '#dc2626',
    },
    retryText: {
        color: '#2563eb',
        fontWeight: '600',
    },

    // Result containers
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    existsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
            android: { elevation: 8 },
        }),
    },
    existsIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    existsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#92400e',
        marginBottom: 8,
    },
    successCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
            android: { elevation: 8 },
        }),
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#059669',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'center',
    },
    productBrand: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
        marginBottom: 24,
        gap: 8,
    },
    locationText: {
        color: '#2563eb',
        fontWeight: '600',
    },

    // Select Location
    selectContainer: {
        flex: 1,
    },
    selectContent: {
        padding: 20,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#ecfdf5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        gap: 12,
    },
    productInfo: {
        flex: 1,
    },
    productNameLeft: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'left',
    },
    productBarcode: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    // ปุ่มหน้า success
    successButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 8,
        width: '100%',
        alignItems: 'center',
    },
    successButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // ปุ่ม outline
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 12,
        width: '100%',
        alignItems: 'center',
    },
    outlineButtonText: {
        color: '#10b981',
        fontSize: 16,
        fontWeight: '600',
    },
    // ปุ่ม link
    linkButton: {
        marginTop: 16,
        paddingVertical: 8,
    },
    linkButtonText: {
        color: '#64748b',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    selectLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginTop: 16,
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
    },
    selectText: {
        fontSize: 16,
        color: '#1e293b',
    },
    selectPlaceholder: {
        fontSize: 16,
        color: '#94a3b8',
    },
    indexPreview: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'center',
    },
    indexLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    indexValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#059669',
        marginTop: 4,
    },

    // Buttons
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    secondaryButton: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
    },
    secondaryButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#cbd5e1',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 320,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: '#10b981',
    },
    btnCancel: {
        backgroundColor: '#f1f5f9',
    },
    btnTextWhite: {
        color: '#fff',
        fontWeight: '600',
    },
    btnTextCancel: {
        color: '#64748b',
        fontWeight: '600',
    },

    // Picker Modal
    pickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '60%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    pickerList: {
        padding: 12,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#f8fafc',
    },
    pickerItemSelected: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
    },
    pickerItemSub: {
        fontSize: 14,
        color: '#64748b',
    },
});
