import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function AdminProducts({ navigation }) {
  const { user, loading } = useSelector((s) => s.auth);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (loading) return;

    if (!user) {
      Alert.alert('Login Required', 'Please login to access admin panel.');
      navigation.navigate('Login');
      return;
    }

    if (user.role !== 'admin') {
      Alert.alert('Access Denied', 'You must be an admin to access this page.');
      navigation.navigate('ProductList');
      return;
    }

    loadProducts();
  }, [user, loading]);

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await api.get('/products?limit=1000');
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setProductsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const deleteProduct = async (id) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${id}`);
            setProducts(products.filter((p) => p._id !== id));
            Alert.alert('Success', 'Product deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      {item.images?.length > 0 ? (
        <Image
          source={{ uri: item.images[0].url }}
          style={styles.productImage}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
          {item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discount}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.stockIndicator}>
          <Ionicons
            name={item.stock > 0 ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={item.stock > 0 ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.stockText, item.stock === 0 && { color: COLORS.error }]}>
            Stock: {item.stock}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('ProductForm', { product: item })}
        >
          <Ionicons name="pencil" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteProduct(item._id)}
        >
          <Ionicons name="trash" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (productsLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Double-check admin status
  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons name="close-circle" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Add Product Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('ProductForm')}
      >
        <Ionicons name="add-circle" size={20} color={COLORS.background} />
        <Text style={styles.addBtnText}>Add New Product</Text>
      </TouchableOpacity>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{products.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>In Stock</Text>
          <Text style={styles.summaryValue}>{products.filter((p) => p.stock > 0).length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
          <Text style={styles.summaryValue}>{products.filter((p) => p.stock === 0).length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.error, fontSize: 16, fontWeight: '600', marginTop: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    margin: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  list: { padding: 12 },
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productImage: { width: 80, height: 80 },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1, padding: 12 },
  productName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  productBrand: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  price: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  discountBadge: { backgroundColor: COLORS.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: COLORS.error, fontSize: 10, fontWeight: '700' },
  stockIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  stockText: { color: COLORS.success, fontSize: 11, fontWeight: '600' },
  actionButtons: { justifyContent: 'space-around', paddingRight: 12, gap: 8 },
  editBtn: { padding: 8, borderRadius: 8, backgroundColor: COLORS.primary + '20' },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: COLORS.error + '20' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  summaryValue: { color: COLORS.primary, fontSize: 18, fontWeight: '800', marginTop: 4 },
});
