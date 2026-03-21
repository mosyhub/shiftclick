import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
  ScrollView, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, deleteProduct } from '../redux/slices/productSlice';
import { COLORS, CATEGORIES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProductListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: products, loading, total } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);
  const { items: cartItems } = useSelector((s) => s.cart);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback((overrides = {}) => {
    dispatch(fetchProducts({ search, category, minPrice, maxPrice, ...overrides }));
  }, [search, category, minPrice, maxPrice]);

  useEffect(() => { loadProducts(); }, [category]);

  // ✅ Use drawer's openDrawer instead of custom modal menu
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 14 }}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons name="menu" size={26} color={COLORS.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14, marginRight: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
            <View>
              <Ionicons name="cart-outline" size={24} color={COLORS.text} />
              {cartItems.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [cartItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchProducts({ search, category, minPrice, maxPrice }));
    setRefreshing(false);
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteProduct(id)) },
      ]
    );
  };

  const renderProduct = ({ item }) => {
    const image = item.images?.[0]?.url;
    const discountedPrice = item.discount > 0
      ? (item.price * (1 - item.discount / 100)).toFixed(2) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { id: item._id })}
        activeOpacity={0.85}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
          </View>
        )}
        {item.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardBrand}>{item.brand}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            {discountedPrice ? (
              <>
                <Text style={styles.discountedPrice}>₱{discountedPrice}</Text>
                <Text style={styles.originalPrice}>₱{item.price.toFixed(2)}</Text>
              </>
            ) : (
              <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'} ({item.numReviews})</Text>
            <Text style={styles.stock}>{item.stock > 0 ? `${item.stock} left` : 'Out of stock'}</Text>
          </View>
          {user?.role === 'admin' && (
            <View style={styles.adminActionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('ProductForm', { product: item })}
              >
                <Ionicons name="pencil" size={14} color={COLORS.primary} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item._id, item.name)}
              >
                <Ionicons name="trash" size={14} color={COLORS.error} />
                <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadProducts()}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadProducts({ search: '' }); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options" size={20} color={showFilters ? COLORS.primary : COLORS.textSecondary} />
        </TouchableOpacity>
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('ProductForm', { product: null })}
          >
            <Ionicons name="add" size={22} color={COLORS.background} />
          </TouchableOpacity>
        )}
      </View>

      {/* Price filter */}
      {showFilters && (
        <View style={styles.filterBox}>
          <Text style={styles.filterLabel}>Price Range (₱)</Text>
          <View style={styles.priceInputRow}>
            <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={COLORS.textMuted} value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
            <Text style={styles.priceDash}>—</Text>
            <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={COLORS.textMuted} value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
            <TouchableOpacity style={styles.applyBtn} onPress={() => loadProducts()}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.categoryPill, category === cat.value && styles.categoryPillActive]}
            onPress={() => setCategory(cat.value)}
          >
            <Text style={[styles.categoryText, category === cat.value && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.totalText}>{total} products found</Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cartBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.primary, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: COLORS.background, fontSize: 10, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 10, marginLeft: 8, fontSize: 14 },
  filterBtn: { backgroundColor: COLORS.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  addBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 10 },
  filterBox: { backgroundColor: COLORS.surface, marginHorizontal: 12, borderRadius: 10, padding: 12, marginBottom: 8 },
  filterLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: { flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: COLORS.text, fontSize: 13 },
  priceDash: { color: COLORS.textMuted },
  applyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  applyText: { color: COLORS.background, fontWeight: '700', fontSize: 13 },
  categoryScroll: { paddingLeft: 12, marginBottom: 4 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  categoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textSecondary, fontSize: 13 },
  categoryTextActive: { color: COLORS.background, fontWeight: '700' },
  totalText: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 14, paddingVertical: 6 },
  row: { justifyContent: 'space-between', paddingHorizontal: 12 },
  listContent: { paddingBottom: 24 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 14, width: '48%', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: { width: '100%', height: 140, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 10 },
  cardBrand: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  cardName: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  price: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  discountedPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  originalPrice: { color: COLORS.textMuted, fontSize: 11, textDecorationLine: 'line-through' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: COLORS.textSecondary, fontSize: 11 },
  stock: { color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 15 },
  adminActionRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});