import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Platform,
    TextInput,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

export default function BarcodeScannerScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const storecode = user?.storecode || user?.name;

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    // Determine hasPermission from the hook
    const hasPermission = Platform.OS === 'web' ? true : permission?.granted;
    const permissionLoading = Platform.OS === 'web' ? false : !permission;

    // Request permission on mount for native
    useEffect(() => {
        if (Platform.OS !== 'web' && !permission) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    // Lookup barcode in planogram
    const lookupBarcode = async (barcode) => {
        if (!barcode || !storecode) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Get planogram data and find the barcode
            const res = await api.post('/template-item', { branchCode: storecode });
            const items = res.data?.items || [];

            const found = items.find(
                (item) => String(item.barcode) === String(barcode).trim()
            );

            if (found) {
                setResult({
                    found: true,
                    barcode: found.barcode,
                    productName: found.nameProduct || found.nameBrand,
                    shelfCode: found.shelfCode,
                    rowNo: found.rowNo,
                    index: found.index,
                    price: found.salesPriceIncVAT,
                    stock: found.stockQuantity,
                    minStore: found.minStore,
                    maxStore: found.maxStore,
                });
            } else {
                setResult({
                    found: false,
                    barcode: barcode,
                    reason: 'ไม่พบสินค้านี้ใน Planogram ของสาขา',
                });
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setError('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setLoading(false);
        }
    };

    // Handle barcode scanned
    const handleBarCodeScanned = ({ type, data }) => {
        if (scanned || loading) return;
        setScanned(true);
        lookupBarcode(data);
    };

    // Handle manual search
    const handleManualSearch = () => {
        if (!manualBarcode.trim()) return;
        setScanned(true);
        lookupBarcode(manualBarcode.trim());
    };

    // Navigate to create POG request
    const handleCreateRequest = () => {
        if (result?.found) {
            navigation.navigate('CreatePogRequest', {
                barcode: result.barcode,
                productName: result.productName,
                currentShelf: result.shelfCode,
                currentRow: result.rowNo,
                currentIndex: result.index,
            });
        } else if (result?.barcode) {
            // Not found - can add new
            navigation.navigate('CreatePogRequest', {
                barcode: result.barcode,
                productName: '',
                currentShelf: '',
                currentRow: '',
                currentIndex: '',
            });
        }
    };

    // Reset scanner
    const resetScanner = () => {
        setScanned(false);
        setResult(null);
        setError('');
        setManualBarcode('');
    };

    // Permission not determined yet
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

    // Permission denied
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>สแกนบาร์โค้ด</Text>
                    <Text style={styles.subtitle}>สาขา: {storecode}</Text>
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
                        barcodeScannerSettings={{
                            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'qr'],
                        }}
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

            {/* Loading */}
            {loading && (
                <View style={styles.resultContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังค้นหา...</Text>
                </View>
            )}

            {/* Error */}
            {error && (
                <View style={styles.resultContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
                        <Text style={styles.retryButtonText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Result */}
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
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Min</Text>
                                    <Text style={styles.detailValue}>{result.minStore || '-'}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Max</Text>
                                    <Text style={styles.detailValue}>{result.maxStore || '-'}</Text>
                                </View>
                                <View style={[styles.detailItem, styles.stockItem]}>
                                    <Text style={styles.detailLabel}>สต็อค</Text>
                                    <Text style={styles.stockValue}>{result.stock || '-'}</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.notFoundBadge}>
                                <Text style={styles.notFoundBadgeText}>✗ ไม่พบสินค้า</Text>
                            </View>
                            <Text style={styles.barcodeText}>บาร์โค้ด: {result.barcode}</Text>
                            <Text style={styles.reasonText}>{result.reason}</Text>
                        </>
                    )}

                    {/* Actions based on found/not found */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                            <Text style={styles.scanAgainButtonText}>สแกนใหม่</Text>
                        </TouchableOpacity>

                        {result.found ? (
                            // Found: can Move or Delete
                            <>
                                <TouchableOpacity
                                    style={styles.moveButton}
                                    onPress={() => navigation.navigate('CreatePogRequest', {
                                        barcode: result.barcode,
                                        productName: result.productName,
                                        currentShelf: result.shelfCode,
                                        currentRow: result.rowNo,
                                        currentIndex: result.index,
                                        defaultAction: 'move',
                                    })}
                                >
                                    <Text style={styles.moveButtonText}>↔️ ย้าย</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => navigation.navigate('CreatePogRequest', {
                                        barcode: result.barcode,
                                        productName: result.productName,
                                        currentShelf: result.shelfCode,
                                        currentRow: result.rowNo,
                                        currentIndex: result.index,
                                        defaultAction: 'delete',
                                    })}
                                >
                                    <Text style={styles.deleteButtonText}>🗑️ ลบ</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // Not found: can Add only
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('CreatePogRequest', {
                                    barcode: result.barcode,
                                    productName: '',
                                    currentShelf: '',
                                    currentRow: '',
                                    currentIndex: '',
                                    defaultAction: 'add',
                                })}
                            >
                                <Text style={styles.addButtonText}>➕ เพิ่มสินค้า</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e293b',
        paddingTop: 24,
        paddingBottom: 16,
    },
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
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#94a3b8',
    },
    resultContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
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
    stockItem: {
        backgroundColor: '#ecfdf5',
        borderRadius: 8,
        paddingVertical: 6,
    },
    stockValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
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
    requestButton: {
        flex: 1,
        backgroundColor: '#f59e0b',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    requestButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
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
