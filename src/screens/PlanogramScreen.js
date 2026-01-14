import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl,
    Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';
import { getTemplateAndProduct } from '../api/user';

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

// Format display value
const formatValue = (v) => {
    if (v === null || v === undefined || v === 0) return '-';
    return v;
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
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
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
                    <View style={styles.shelfInfo}>
                        <Text style={styles.shelfCode}>{shelf.shelfCode}</Text>
                        <Text style={styles.shelfName} numberOfLines={1}>
                            {shelf.fullName}
                        </Text>
                    </View>
                    <View style={styles.shelfMeta}>
                        <View style={styles.rowBadge}>
                            <Text style={styles.rowBadgeText}>{shelf.rowQty} ชั้น</Text>
                        </View>
                        <Text style={styles.productCount}>{shelf.products.length} รายการ</Text>
                        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </View>
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
                                        <Text style={styles.rowLabel}>ชั้นที่ {rowNo}</Text>
                                        <Text style={styles.rowProductCount}>{rowProducts.length} รายการ</Text>
                                    </View>

                                    {/* Products in this row - compact view */}
                                    {rowProducts.map((product, pIdx) => (
                                        <View key={`${product.barcode}-${pIdx}`} style={styles.productCard}>
                                            <View style={styles.productRow}>
                                                {/* Index */}
                                                <Text style={styles.indexText}>{product.index || pIdx + 1}</Text>

                                                {/* Product Info */}
                                                <View style={styles.productMainInfo}>
                                                    <Text style={styles.productName} numberOfLines={2}>
                                                        {product.nameProduct || product.nameBrand || '-'}
                                                    </Text>
                                                    <Text style={styles.productBarcode}>{product.barcode}</Text>
                                                </View>

                                                {/* Quick Stats */}
                                                <View style={styles.quickStats}>
                                                    <Text style={styles.statText}>฿{formatValue(product.salesPriceIncVAT)}</Text>
                                                    <Text style={styles.stockText}>สต็อค {formatValue(product.stockQuantity)}</Text>
                                                </View>

                                                {/* Small Edit Button */}
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => handleRequestAction(product)}
                                                >
                                                    <Text style={styles.editButtonText}>✏️</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}

                                    {rowProducts.length === 0 && (
                                        <Text style={styles.noProductsText}>ไม่มีสินค้าในชั้นนี้</Text>
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>‹ กลับ</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Planogram</Text>
                    <Text style={styles.subtitle}>
                        {storecode} {branchName ? `- ${branchName}` : ''}
                    </Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍 ค้นหา shelf, บาร์โค้ด หรือชื่อสินค้า..."
                    placeholderTextColor="#94a3b8"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                />
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                            tintColor="#10b981"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={styles.emptyText}>
                                {searchText ? 'ไม่พบ shelf ที่ค้นหา' : 'ไม่มีข้อมูล Planogram'}
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
    addButton: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    searchContainer: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    searchInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
    },
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
    listContent: {
        padding: 12,
    },
    shelfCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
            },
        }),
    },
    shelfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    shelfInfo: {
        flex: 1,
    },
    shelfCode: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3b82f6',
    },
    shelfName: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    shelfMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    rowBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563eb',
    },
    productCount: {
        fontSize: 12,
        color: '#64748b',
    },
    expandIcon: {
        fontSize: 12,
        color: '#9ca3af',
        marginLeft: 4,
    },
    shelfContent: {
        padding: 12,
    },
    rowContainer: {
        marginBottom: 16,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 10,
    },
    rowLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#92400e',
    },
    rowProductCount: {
        fontSize: 11,
        color: '#b45309',
    },
    productCard: {
        backgroundColor: '#f8fafc',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        width: 20,
        textAlign: 'center',
    },
    productMainInfo: {
        flex: 1,
        marginLeft: 8,
    },
    productName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1e293b',
    },
    productBarcode: {
        fontSize: 10,
        color: '#94a3b8',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    quickStats: {
        alignItems: 'flex-end',
        marginRight: 8,
    },
    statText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    stockText: {
        fontSize: 10,
        color: '#059669',
        fontWeight: '500',
    },
    editButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    editButtonText: {
        fontSize: 14,
    },
    noProductsText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
        paddingVertical: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
    },
});
