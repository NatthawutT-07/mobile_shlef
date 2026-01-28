/**
 * BarcodeScannerScreen - Barcode scanning and product lookup
 * Uses device camera to scan barcodes and lookup products in planogram
 */

// =============================================================================
// IMPORTS
// =============================================================================

// React
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// React Native
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    TextInput,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Third-party
import { CameraView, useCameraPermissions } from 'expo-camera';

// Icons
import {
    ChevronLeft, Keyboard, AlertTriangle,
    Search, ScanLine, X, Check, ArrowRightLeft,
    Trash2, Plus, RefreshCw, MapPin, Tag
} from 'lucide-react-native';

// Local imports
import useAuthStore from '../store/authStore';
import { BRANCHES } from '../constants/branches';
import { lookupProduct } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported barcode types for scanning */
const BARCODE_TYPES = [
    'ean13', 'ean8', 'upc_a', 'upc_e',
    'code128', 'code39', 'code93',
    'itf14', 'codabar', 'qr'
];

/** Throttle delay for barcode scanning (ms) */
const SCAN_THROTTLE_MS = 500;

/** Cooldown after successful scan before allowing new scan (ms) */
const SCAN_COOLDOWN_MS = 2000;

/** Scan frame size (must match styles.scanFrame) */
const SCAN_FRAME_SIZE = 260;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BarcodeScannerScreen({ navigation, route }) {
    // -------------------------------------------------------------------------
    // State & Store
    // -------------------------------------------------------------------------
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    // Refs for throttling
    const lastScanTime = useRef(0);
    const lastBarcode = useRef('');
    const isProcessing = useRef(false);

    // -------------------------------------------------------------------------
    // Derived Values
    // -------------------------------------------------------------------------
    const branchName = useMemo(() => {
        if (!storecode) return 'ผู้ใช้';
        const branch = BRANCHES.find((b) => b.code === storecode);
        return branch ? branch.label.replace(`${storecode} - `, '') : storecode;
    }, [storecode]);

    const hasPermission = Platform.OS === 'web' ? true : permission?.granted;
    const permissionLoading = Platform.OS === 'web' ? false : !permission;

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------    // Effects
    useEffect(() => {
        if (route.params?.success) {
            resetScanner();
            // Clear params to avoid loop
            navigation.setParams({ success: undefined });
        }
    }, [route.params?.success, navigation]);

    useEffect(() => {
        if (Platform.OS !== 'web' && !permission) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    // -------------------------------------------------------------------------
    // API Functions
    // -------------------------------------------------------------------------

    /**
     * Lookup barcode in planogram and master product database
     * @param {string} barcode - Barcode to lookup
     */
    const lookupBarcode = async (barcode) => {
        if (!barcode || !storecode) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await lookupProduct(storecode, barcode);

            if (data.found) {
                const loc = data.locations?.[0] || {};
                setResult({
                    found: true,
                    barcode: data.product.barcode,
                    productName: data.product.name,
                    shelfCode: loc.shelfCode,
                    rowNo: loc.rowNo,
                    index: loc.index,
                    price: data.product.price,
                });
            } else if (data.reason === 'NO_LOCATION_IN_POG') {
                setResult({
                    found: false,
                    barcode: data.product.barcode,
                    productName: data.product.name,
                    reason: 'สินค้านี้ยังไม่มีใน Planogram (แต่มีในระบบ)',
                    isMasterFound: true
                });
            } else {
                setResult({
                    found: false,
                    barcode: barcode,
                    reason: 'ไม่พบสินค้านี้ในระบบ',
                });
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setError(getErrorMessage(err, 'เกิดข้อผิดพลาดในการค้นหา'));
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------
    const handleBarCodeScanned = useCallback(({ data, cornerPoints, bounds }) => {
        // Skip if already scanned, loading, or processing
        if (scanned || loading || isProcessing.current) return;

        const now = Date.now();
        const barcode = String(data).trim();

        // Throttle: ignore scans within SCAN_THROTTLE_MS
        if (now - lastScanTime.current < SCAN_THROTTLE_MS) return;

        // Ignore same barcode within cooldown period
        if (barcode === lastBarcode.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) return;

        // Validate barcode length (typical barcodes are 5-13 digits)
        if (barcode.length < 5 || barcode.length > 20) return;

        // ✅ Check if barcode is within scan frame
        // Calculate scan frame boundaries (center of screen)
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
        const frameLeft = (screenWidth - SCAN_FRAME_SIZE) / 2;
        const frameRight = frameLeft + SCAN_FRAME_SIZE;
        // Adjust for header (~120px) - scan frame is centered in camera view area
        const cameraTopOffset = 120;
        const cameraHeight = screenHeight - cameraTopOffset;
        const frameTop = cameraTopOffset + (cameraHeight - SCAN_FRAME_SIZE) / 2;
        const frameBottom = frameTop + SCAN_FRAME_SIZE;

        // Check bounds using cornerPoints or bounds object
        let isInFrame = false;
        if (cornerPoints && cornerPoints.length > 0) {
            // Use corner points to determine barcode position
            const minX = Math.min(...cornerPoints.map(p => p.x));
            const maxX = Math.max(...cornerPoints.map(p => p.x));
            const minY = Math.min(...cornerPoints.map(p => p.y));
            const maxY = Math.max(...cornerPoints.map(p => p.y));
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            isInFrame = centerX >= frameLeft && centerX <= frameRight &&
                centerY >= frameTop && centerY <= frameBottom;
        } else if (bounds && bounds.origin) {
            // Fallback to bounds object
            const centerX = bounds.origin.x + (bounds.size?.width || 0) / 2;
            const centerY = bounds.origin.y + (bounds.size?.height || 0) / 2;

            isInFrame = centerX >= frameLeft && centerX <= frameRight &&
                centerY >= frameTop && centerY <= frameBottom;
        } else {
            // If no position data, allow scan (fallback for web/older devices)
            isInFrame = true;
        }

        // Reject if barcode is outside frame
        if (!isInFrame) return;

        // Update refs
        lastScanTime.current = now;
        lastBarcode.current = barcode;
        isProcessing.current = true;

        // Process scan
        setScanned(true);
        lookupBarcode(barcode).finally(() => {
            isProcessing.current = false;
        });
    }, [scanned, loading, storecode]);

    const handleManualSearch = () => {
        if (!manualBarcode.trim()) return;
        setScanned(true);
        lookupBarcode(manualBarcode.trim());
    };

    const resetScanner = () => {
        setScanned(false);
        setResult(null);
        setError('');
        setManualBarcode('');
        // Reset throttle refs for fresh scan
        lastBarcode.current = '';
        isProcessing.current = false;
    };

    // Navigate back to Home screen (avoid stack buildup)
    const goToHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    const navigateToRequest = (action) => {
        const params = {
            barcode: result.barcode,
            productName: result.productName || '',
            currentShelf: result.found ? result.shelfCode : '',
            currentRow: result.found ? result.rowNo : '',
            currentIndex: result.found ? result.index : '',
            defaultAction: action,
            productExists: result.found,
            source: 'BarcodeScanner',
        };
        // Use replace to avoid stack buildup when navigating to CreatePogRequest
        navigation.replace('CreatePogRequest', params);
    };

    // -------------------------------------------------------------------------
    // Render: Permission States
    // -------------------------------------------------------------------------
    if (permissionLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังขออนุญาตใช้กล้อง...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (hasPermission === false) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={goToHome}>
                        <ChevronLeft color="#10b981" size={24} />
                        <Text style={styles.backButtonText}>กลับ</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>สแกนบาร์โค้ด</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centerContent}>
                    <AlertTriangle size={48} color="#ef4444" />
                    <Text style={styles.errorTitle}>ไม่ได้รับอนุญาตใช้กล้อง</Text>
                    <Text style={styles.errorText}>กรุณาอนุญาตการใช้กล้องในการตั้งค่า</Text>
                    <TouchableOpacity
                        style={styles.manualButton}
                        onPress={() => setShowManualInput(true)}
                    >
                        <Text style={styles.manualButtonText}>พิมพ์บาร์โค้ดแทน</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // -------------------------------------------------------------------------
    // Render: Main Screen
    // -------------------------------------------------------------------------
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goToHome}>
                    <ChevronLeft color="#1e293b" size={24} />
                    <Text style={styles.backButtonText}>กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>สแกนบาร์โค้ด</Text>
                    <Text style={styles.subtitle}>{branchName}</Text>
                </View>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowManualInput(!showManualInput)}
                >
                    {showManualInput ? (
                        <ScanLine color="#1e293b" size={24} />
                    ) : (
                        <Keyboard color="#1e293b" size={24} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Manual Input */}
            {showManualInput && (
                <View style={styles.manualInputContainer}>
                    <TextInput
                        style={styles.manualInput}
                        value={manualBarcode}
                        onChangeText={setManualBarcode}
                        placeholder="พิมพ์บาร์โค้ด..."
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        autoFocus
                    />
                    <TouchableOpacity
                        style={[styles.searchButton, !manualBarcode.trim() && styles.disabledButton]}
                        onPress={handleManualSearch}
                        disabled={!manualBarcode.trim()}
                    >
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Search color="#fff" size={20} />}
                    </TouchableOpacity>
                </View>
            )}

            {/* Camera View */}
            {!scanned && !showManualInput && (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    />
                    {/* Dark Overlay with Transparent Cutout */}
                    <View style={styles.overlayContainer}>
                        <View style={styles.overlayTop} />
                        <View style={styles.overlayCenter}>
                            <View style={styles.overlaySide} />
                            <View style={styles.scanFrame}>
                                {/* Corner Markers */}
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                                {/* Scanning Ray Animation (Static for now) */}
                                <View style={styles.scanRay} />
                            </View>
                            <View style={styles.overlaySide} />
                        </View>
                        <View style={styles.overlayBottom}>
                            <Text style={styles.scanHint}>วางบาร์โค้ดในกรอบเพื่อสแกน</Text>
                        </View>
                    </View>

                    {/* ปุ่มพิมพ์บาร์โค้ด - อยู่ใต้กล้อง */}
                    <TouchableOpacity
                        style={styles.manualInputButton}
                        onPress={() => setShowManualInput(true)}
                    >
                        <Keyboard size={20} color="#fff" />
                        <Text style={styles.manualInputButtonText}>พิมพ์บาร์โค้ด</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Results & Status Panel */}
            {(loading || error || result) && (
                <View style={styles.resultPanel}>
                    {/* Loading State */}
                    {loading && (
                        <View style={styles.statusContent}>
                            <ActivityIndicator size="large" color="#10b981" style={{ marginBottom: 16 }} />
                            <Text style={styles.loadingText}>กำลังค้นหาข้อมูล...</Text>
                        </View>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <View style={styles.statusContent}>
                            <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                                <AlertTriangle size={32} color="#dc2626" />
                            </View>
                            <Text style={styles.errorTitle}>เกิดข้อผิดพลาด</Text>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.secondaryButton} onPress={resetScanner}>
                                <RefreshCw size={18} color="#0f172a" />
                                <Text style={styles.secondaryButtonText}>ลองใหม่</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Result Display */}
                    {!loading && result && (
                        <View style={styles.resultContent}>
                            {/* Header Badge */}
                            <View style={[
                                styles.resultHeader,
                                result.found ? styles.bgFound :
                                    result.isMasterFound ? styles.bgWarning : styles.bgError
                            ]}>
                                {result.found ? (
                                    <>
                                        <Check size={20} color="#15803d" />
                                        <Text style={[styles.resultHeaderText, styles.textFound]}>พบสินค้าใน Planogram</Text>
                                    </>
                                ) : result.isMasterFound ? (
                                    <>
                                        <AlertTriangle size={20} color="#b45309" />
                                        <Text style={[styles.resultHeaderText, styles.textWarning]}>ยังไม่ลง Planogram</Text>
                                    </>
                                ) : (
                                    <>
                                        <X size={20} color="#b91c1c" />
                                        <Text style={[styles.resultHeaderText, styles.textError]}>ไม่พบสินค้า</Text>
                                    </>
                                )}
                            </View>

                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{result.productName || 'ไม่ระบุชื่อสินค้า'}</Text>
                                <View style={styles.barcodeRow}>
                                    <ScanLine size={16} color="#64748b" />
                                    <Text style={styles.barcodeText}>{result.barcode}</Text>
                                </View>
                            </View>

                            {/* Location Details (Only if found) */}
                            {result.found && (
                                <View style={styles.locationCard}>
                                    <View style={styles.locationHeader}>
                                        <MapPin size={16} color="#3b82f6" />
                                        <Text style={styles.locationTitle}>ตำแหน่งสินค้า</Text>
                                    </View>
                                    <View style={styles.locationDetails}>
                                        <View style={styles.locItem}>
                                            <Text style={styles.locLabel}>Shelf</Text>
                                            <Text style={styles.locValue}>{result.shelfCode}</Text>
                                        </View>
                                        <View style={styles.verticalDivider} />
                                        <View style={styles.locItem}>
                                            <Text style={styles.locLabel}>ชั้นที่</Text>
                                            <Text style={styles.locValue}>{result.rowNo}</Text>
                                        </View>
                                        <View style={styles.verticalDivider} />
                                        <View style={styles.locItem}>
                                            <Text style={styles.locLabel}>ลำดับ</Text>
                                            <Text style={styles.locValue}>{result.index}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.priceRow}>
                                        <Tag size={16} color="#64748b" />
                                        <Text style={styles.priceLabel}>ราคา:</Text>
                                        <Text style={styles.priceValue}>{result.price || '-'} ฿</Text>
                                    </View>
                                </View>
                            )}

                            {/* Not Found / Reason */}
                            {!result.found && (
                                <Text style={styles.reasonText}>{result.reason}</Text>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.actionGrid}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.btnSecondary]}
                                    onPress={resetScanner}
                                >
                                    <RefreshCw size={20} color="#475569" />
                                    <Text style={styles.btnTextSecondary}>สแกนใหม่</Text>
                                </TouchableOpacity>

                                {result.found ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.btnBlue]}
                                            onPress={() => navigateToRequest('move')}
                                        >
                                            <ArrowRightLeft size={20} color="#fff" />
                                            <Text style={styles.btnTextWhite}>ย้าย</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.btnRed]}
                                            onPress={() => navigateToRequest('delete')}
                                        >
                                            <Trash2 size={20} color="#fff" />
                                            <Text style={styles.btnTextWhite}>ลบออก</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : result.isMasterFound ? (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.btnGreen, { flex: 2 }]}
                                        onPress={() => navigateToRequest('add')}
                                    >
                                        <Plus size={20} color="#fff" />
                                        <Text style={styles.btnTextWhite}>เพิ่มสินค้าลง Shelf</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    backButtonText: {
        fontSize: 16,
        color: '#1e293b',
        marginLeft: 4,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
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
    iconButton: {
        padding: 8,
    },

    // Manual Input
    manualInputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 20,
    },
    manualInput: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1e293b',
        marginRight: 12,
    },
    searchButton: {
        backgroundColor: '#10b981',
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    disabledButton: {
        backgroundColor: '#334155',
    },

    // Camera & Overlay
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayCenter: {
        flexDirection: 'row',
        height: SCAN_FRAME_SIZE,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1.5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: 40,
    },
    scanFrame: {
        width: SCAN_FRAME_SIZE,
        height: SCAN_FRAME_SIZE,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderColor: '#10b981',
        borderWidth: 4,
    },
    cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
    cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
    cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
    cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },
    scanRay: {
        position: 'absolute',
        top: '50%',
        left: 20,
        right: 20,
        height: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    scanHint: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    // ปุ่มพิมพ์บาร์โค้ด
    manualInputButton: {
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
    manualInputButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    // Result Panel (Bottom Sheet style)
    resultPanel: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    statusContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        color: '#64748b',
        fontSize: 15,
        fontWeight: '500',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
    },

    // Result Content
    resultContent: {
        gap: 16,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    bgFound: { backgroundColor: '#dcfce7' },
    bgWarning: { backgroundColor: '#fef3c7' },
    bgError: { backgroundColor: '#fee2e2' },

    resultHeaderText: {
        fontSize: 14,
        fontWeight: '700',
    },
    textFound: { color: '#15803d' },
    textWarning: { color: '#b45309' },
    textError: { color: '#b91c1c' },

    productInfo: {
        marginBottom: 8,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
        lineHeight: 26,
    },
    barcodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    barcodeText: {
        fontSize: 14,
        color: '#64748b',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    // Location Card
    locationCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    locationTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3b82f6',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locItem: {
        alignItems: 'center',
        flex: 1,
    },
    locLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 2,
    },
    locValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#e2e8f0',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
        marginLeft: 'auto',
    },

    reasonText: {
        fontSize: 14,
        color: '#f59e0b',
        backgroundColor: '#fffbeb',
        padding: 12,
        borderRadius: 8,
        overflow: 'hidden',
    },

    // Buttons
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e2e8f0',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        gap: 8,
    },
    secondaryButtonText: {
        fontWeight: '600',
        color: '#334155',
    },

    btnSecondary: { backgroundColor: '#f1f5f9' },
    btnBlue: { backgroundColor: '#3b82f6' },
    btnRed: { backgroundColor: '#ef4444' },
    btnGreen: { backgroundColor: '#10b981' },

    btnTextSecondary: { color: '#475569', fontWeight: '600', fontSize: 13 },
    btnTextWhite: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
