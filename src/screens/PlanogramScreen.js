import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, ChevronLeft, ChevronDown, ChevronRight,
    Layers, Package, Edit, Clock, Inbox, AlertCircle
} from 'lucide-react-native';

import useAuthStore from '../store/authStore';
import { getTemplateAndProduct, getStockLastUpdate } from '../api/user';
import { getErrorMessage } from '../utils/errorHelper';

// Group products by shelf
const groupByShelf = (items) => {
    if (!items || !items.length) return [];

    const groups = items.reduce((acc, item) => {
        const code = item.shelfCode || '-';
        if (!acc[code]) acc[code] = [];
        acc[code].push(item);
        return acc;
    }, {});

    return Object.keys(groups).map((shelfCode) => {
        const products = groups[shelfCode];
        const rowNumbers = products.map((i) => i.rowNo || 1);
        const rowQty = Math.max(...rowNumbers);

        return {
            shelfCode,
            fullName: products[0]?.fullName || 'N/A',
            rowQty,
            products: products.sort(
                (a, b) => (a.rowNo || 0) - (b.rowNo || 0) || (a.index || 0) - (b.index || 0)
            ),
        };
    });
};

const formatValue = (v) => {
    if (v === null || v === undefined || v === 0) return '-';
    return v;
};

// Format Bangkok time (24-hour format)
const formatBangkokTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';

    // Add 7 hours for Bangkok timezone (UTC+7)
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
    const bangkokTime = new Date(utc + bangkokOffset);

    const day = String(bangkokTime.getDate()).padStart(2, '0');
    const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
    const year = bangkokTime.getFullYear() + 543; // Buddhist year
    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export default function PlanogramScreen({ navigation }) {
    const user = useAuthStore((s) => s.user);
    const checkAuthExpired = useAuthStore((s) => s.checkAuthExpired);
    const storecode = user?.storecode || user?.name;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [branchName, setBranchName] = useState('');
    const [searchText, setSearchText] = useState('');
    const [expandedShelf, setExpandedShelf] = useState(null);
    const [stockUpdatedAt, setStockUpdatedAt] = useState(null);

    const loadData = async (isRefresh = false) => {
        if (!storecode) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const result = await getTemplateAndProduct(storecode);
            setBranchName(result?.branchName || '');
            setData(Array.isArray(result?.items) ? result.items : []);
        } catch (err) {
            console.error('Load planogram error:', err);
            // Check if auth expired
            if (!checkAuthExpired()) {
                setData([]);
                const msg = getErrorMessage(err, 'ไม่สามารถโหลดข้อมูล Planogram ได้');
                if (Platform.OS === 'web') {
                    window.alert(msg);
                } else {
                    Alert.alert('ผิดพลาด', msg);
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // Load stock update time
        getStockLastUpdate()
            .then((res) => setStockUpdatedAt(res?.updatedAt))
            .catch(() => { });
    }, [storecode]);

    const shelves = useMemo(() => groupByShelf(data), [data]);

    // Filter shelves by search
    const filteredShelves = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return shelves;

        return shelves.filter((shelf) => {
            if (shelf.shelfCode.toLowerCase().includes(q)) return true;
            if (shelf.fullName.toLowerCase().includes(q)) return true;

            return shelf.products.some(
                (p) =>
                    String(p.barcode || '').includes(q) ||
                    String(p.nameBrand || '').toLowerCase().includes(q) ||
                    String(p.nameProduct || '').toLowerCase().includes(q)
            );
        });
    }, [shelves, searchText]);

    // Handle request action
    const handleRequestAction = (product) => {
        navigation.navigate('CreatePogRequest', {
            barcode: product.barcode,
            productName: product.nameProduct || product.nameBrand,
            currentShelf: product.shelfCode,
            currentRow: product.rowNo,
            currentIndex: product.index,
            productExists: true, // Product already exists, only show move/delete
            source: 'Planogram', // Tell CreatePogRequestScreen to return here on success
        });
    };

    const renderShelfItem = ({ item: shelf }) => {
        const isExpanded = expandedShelf === shelf.shelfCode;

        return (
            <View style={styles.shelfCard}>
                <TouchableOpacity
                    style={styles.shelfHeader}
                    onPress={() => setExpandedShelf(isExpanded ? null : shelf.shelfCode)}
                    activeOpacity={0.7}
                >
                    <View style={styles.shelfIconBg}>
                        <Layers size={20} color="#3b82f6" />
                    </View>
                    <View style={styles.shelfInfo}>
                        <View style={styles.shelfTitleRow}>
                            <Text style={styles.shelfCode}>{shelf.shelfCode}</Text>
                            <View style={styles.productCountBadge}>
                                <Text style={styles.productCountText}>{shelf.products.length} รายการ</Text>
                            </View>
                        </View>
                        <Text style={styles.shelfName} numberOfLines={1}>
                            {shelf.fullName} • {shelf.rowQty} ชั้น
                        </Text>
                    </View>
                    {isExpanded ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
                </TouchableOpacity>

                {/* Expanded: Show rows */}
                {isExpanded && (
                    <View style={styles.shelfContent}>
                        {Array.from({ length: shelf.rowQty }).map((_, idx) => {
                            const rowNo = idx + 1;
                            const rowProducts = shelf.products.filter((p) => (p.rowNo || 0) === rowNo);

                            return (
                                <View key={rowNo} style={styles.rowContainer}>
                                    <View style={styles.rowHeader}>
                                        <View style={styles.rowLabelBadge}>
                                            <Text style={styles.rowLabel}>ชั้นที่ {rowNo}</Text>
                                        </View>
                                        <Text style={styles.rowProductCount}>{rowProducts.length} รายการ</Text>
                                    </View>

                                    {/* Products in this row - compact view */}
                                    {rowProducts.map((product, pIdx) => (
                                        <View key={`${product.barcode}-${pIdx}`} style={styles.productCard}>
                                            <View style={styles.productRow}>
                                                {/* Index Badge */}
                                                <View style={styles.indexBadge}>
                                                    <Text style={styles.indexText}>{product.index || pIdx + 1}</Text>
                                                </View>

                                                {/* Product Info */}
                                                <View style={styles.productMainInfo}>
                                                    <Text style={styles.productName} numberOfLines={2}>
                                                        {product.nameProduct || product.nameBrand || '-'}
                                                    </Text>
                                                    <Text style={styles.productBarcode}>{product.barcode}</Text>
                                                </View>

                                                {/* Quick Stats */}
                                                <View style={styles.quickStats}>
                                                    <Text style={styles.priceText}>฿{formatValue(product.salesPriceIncVAT)}</Text>
                                                    <Text style={styles.stockText}>สต็อค {formatValue(product.stockQuantity)}</Text>
                                                </View>

                                                {/* Edit Button */}
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => handleRequestAction(product)}
                                                >
                                                    <Edit size={16} color="#64748b" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}

                                    {rowProducts.length === 0 && (
                                        <View style={styles.emptyRowState}>
                                            <Text style={styles.noProductsText}>ว่าง</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#10b981" />
                    <Text style={styles.backButtonText}>กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Planogram</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {branchName?.includes('/') ? branchName.split('/').pop().trim() : (branchName || storecode)}
                    </Text>
                </View>
                {stockUpdatedAt && (
                    <View style={styles.stockUpdateBadge}>
                        <Clock size={10} color="#fff" />
                        <Text style={styles.stockTimeText}>
                            Stock: {formatBangkokTime(stockUpdatedAt)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Search size={20} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหา Shelf, บาร์โค้ด หรือชื่อสินค้า..."
                        placeholderTextColor="#94a3b8"
                        value={searchText}
                        onChangeText={setSearchText}
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                            <AlertCircle size={16} color="#94a3b8" style={{ transform: [{ rotate: '45deg' }] }} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredShelves}
                    keyExtractor={(item) => item.shelfCode}
                    renderItem={renderShelfItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={5}
                    windowSize={5}
                    maxToRenderPerBatch={5}
                    removeClippedSubviews={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                            tintColor="#10b981"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Inbox size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>
                                {searchText ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูล Planogram'}
                            </Text>
                        </View>
                    }
                />
            )}
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
    stockUpdateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    stockTimeText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },

    // Search
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    clearButton: {
        padding: 4,
    },

    // Loading & Empty
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748b',
    },

    // List
    listContent: {
        padding: 16,
    },
    shelfCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    shelfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
    },
    shelfIconBg: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    shelfInfo: {
        flex: 1,
        marginRight: 8,
    },
    shelfTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    shelfCode: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    productCountBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    productCountText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
    },
    shelfName: {
        fontSize: 13,
        color: '#64748b',
    },

    // Expanded Content
    shelfContent: {
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        padding: 12,
    },
    rowContainer: {
        marginBottom: 16,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    rowLabelBadge: {
        backgroundColor: '#fff7ed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ffedd5',
    },
    rowLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#c2410c',
    },
    rowProductCount: {
        fontSize: 11,
        color: '#94a3b8',
    },
    emptyRowState: {
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    noProductsText: {
        fontSize: 12,
        color: '#94a3b8',
    },

    // Product Card
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    indexBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    productMainInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1e293b',
        lineHeight: 18,
    },
    productBarcode: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    quickStats: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10b981',
    },
    stockText: {
        fontSize: 10,
        color: '#64748b',
    },
    editButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
});
