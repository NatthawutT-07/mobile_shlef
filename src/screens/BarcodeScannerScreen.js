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
const SCAN_FRAME_SIZE = 250;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BarcodeScannerScreen({ navigation }) {
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
    // -------------------------------------------------------------------------
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

    const navigateToRequest = (action) => {
        const params = {
            barcode: result.barcode,
            productName: result.productName || '',
            currentShelf: result.found ? result.shelfCode : '',
            currentRow: result.found ? result.rowNo : '',
            currentIndex: result.found ? result.index : '',
            defaultAction: action,
            productExists: result.found,
        };
        navigation.navigate('CreatePogRequest', params);
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
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}>‹ กลับ</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>สแกนบาร์โค้ด</Text>
                </View>
                <View style={styles.centerContent}>
                    <Text style={styles.errorIcon}>📷</Text>
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>สแกนบาร์โค้ด</Text>
                    <Text style={styles.subtitle}>สาขา: {branchName}</Text>
                </View>
                <TouchableOpacity
                    style={styles.keyboardButton}
                    onPress={() => setShowManualInput(!showManualInput)}
                >
                    <Text style={styles.keyboardButtonText}>⌨️</Text>
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
                        style={styles.searchButton}
                        onPress={handleManualSearch}
                        disabled={!manualBarcode.trim()}
                    >
                        <Text style={styles.searchButtonText}>ค้นหา</Text>
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
                    <View style={styles.overlay}>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.cornerTopLeft]} />
                            <View style={[styles.corner, styles.cornerTopRight]} />
                            <View style={[styles.corner, styles.cornerBottomLeft]} />
                            <View style={[styles.corner, styles.cornerBottomRight]} />
                        </View>
                        <Text style={styles.scanHint}>วางบาร์โค้ดในกรอบ</Text>
                    </View>
                </View>
            )}

            {/* Loading State */}
            {loading && (
                <View style={styles.resultContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังค้นหา...</Text>
                </View>
            )}

            {/* Error State */}
            {error && (
                <View style={styles.resultContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
                        <Text style={styles.retryButtonText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Result Display */}
            {result && !loading && (
                <View style={styles.resultContainer}>
                    {result.found ? (
                        <>
                            <View style={styles.foundBadge}>
                                <Text style={styles.foundBadgeText}>✓ พบสินค้า</Text>
                            </View>
                            <Text style={styles.productName}>{result.productName}</Text>
                            <Text style={styles.barcodeText}>บาร์โค้ด: {result.barcode}</Text>

                            <View style={styles.locationBox}>
                                <Text style={styles.locationLabel}>ตำแหน่งใน Planogram</Text>
                                <Text style={styles.locationValue}>
                                    {result.shelfCode} / ชั้น {result.rowNo} / ลำดับ {result.index}
                                </Text>
                            </View>

                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>ราคา</Text>
                                    <Text style={styles.detailValue}>{result.price || '-'} ฿</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={[styles.notFoundBadge, result.isMasterFound && { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.notFoundBadgeText, result.isMasterFound && { color: '#b45309' }]}>
                                    {result.isMasterFound ? '⚠️ ยังไม่ลง Planogram' : '✗ ไม่พบสินค้า'}
                                </Text>
                            </View>
                            {result.productName && <Text style={styles.productName}>{result.productName}</Text>}
                            <Text style={styles.barcodeText}>บาร์โค้ด: {result.barcode}</Text>
                            <Text style={styles.reasonText}>{result.reason}</Text>
                        </>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                            <Text style={styles.scanAgainButtonText}>สแกนใหม่</Text>
                        </TouchableOpacity>

                        {result.found ? (
                            <>
                                <TouchableOpacity
                                    style={styles.moveButton}
                                    onPress={() => navigateToRequest('move')}
                                >
                                    <Text style={styles.moveButtonText}>↔️ ย้าย</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => navigateToRequest('delete')}
                                >
                                    <Text style={styles.deleteButtonText}>🗑️ ลบ</Text>
                                </TouchableOpacity>
                            </>
                        ) : result.isMasterFound ? (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigateToRequest('add')}
                            >
                                <Text style={styles.addButtonText}>➕ เพิ่มสินค้า</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
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
        backgroundColor: '#1e293b',
        paddingTop: 24,
        paddingBottom: 16,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0f172a',
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
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#94a3b8',
    },
    keyboardButton: {
        padding: 8,
    },
    keyboardButtonText: {
        fontSize: 24,
    },

    // Manual Input
    manualInputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#0f172a',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    manualInput: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        marginRight: 10,
    },
    searchButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 20,
        justifyContent: 'center',
        borderRadius: 10,
    },
    searchButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    // Camera
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#10b981',
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanHint: {
        marginTop: 270,
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
    },

    // Loading
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#94a3b8',
    },

    // Result Container
    resultContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },

    // Found Badge
    foundBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    foundBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },

    // Not Found Badge
    notFoundBadge: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    notFoundBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#dc2626',
    },

    // Product Info
    productName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    barcodeText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    reasonText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },

    // Location Box
    locationBox: {
        backgroundColor: '#f0f9ff',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    locationLabel: {
        fontSize: 12,
        color: '#0284c7',
        marginBottom: 4,
    },
    locationValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0369a1',
    },

    // Details Row
    detailsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    detailItem: {
        flex: 1,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },

    // Action Buttons
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 'auto',
    },
    scanAgainButton: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    scanAgainButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    moveButton: {
        flex: 1,
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    moveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    addButton: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },

    // Error States
    errorIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    manualButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    manualButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
