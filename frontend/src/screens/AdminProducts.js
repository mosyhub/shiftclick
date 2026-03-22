import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, TextInput, RefreshControl, Modal,
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
  const [promotionModal, setPromotionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [promotionDiscount, setPromotionDiscount] = useState('');
  const [promotionSendNotif, setPromotionSendNotif] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);

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

  const openPromotionModal = (product) => {
    setSelectedProduct(product);
    setPromotionDiscount(product.discount?.toString() || '0');
    setPromotionSendNotif(false);
    setPromotionModal(true);
  };

  const applyPromotion = async () => {
    if (!selectedProduct) return;

    const discount = parseInt(promotionDiscount, 10);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Alert.alert('Invalid Discount', 'Discount must be between 0 and 100');
      return;
    }

    try {
      setPromotionLoading(true);
      const response = await api.post('/admin/apply-promotion', {
        productId: selectedProduct._id,
        discount,
        sendNotification: promotionSendNotif && discount > 0,
      });

      // Update product in list
      const updatedProducts = products.map((p) =>
        p._id === selectedProduct._id ? response.data.product : p
      );
      setProducts(updatedProducts);

      Alert.alert(
        'Success',
        promotionSendNotif
          ? `Discount applied and notification sent to ${response.data.promotion.sentCount} users`
          : 'Discount applied successfully'
      );

      setPromotionModal(false);
      setSelectedProduct(null);
      setPromotionDiscount('');
    } catch (error) {
      console.error('Error applying promotion:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to apply promotion');
    } finally {
      setPromotionLoading(false);
    }
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
          style={styles.promoteBtn}
          onPress={() => openPromotionModal(item)}
        >
          <Ionicons name="pricetags" size={16} color={COLORS.warning} />
        </TouchableOpacity>
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

      {/* Promotion Modal */}
      <Modal visible={promotionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Promotion</Text>
              <TouchableOpacity onPress={() => setPromotionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.productPreview}>
                  <Text style={styles.previewLabel}>Product</Text>
                  <Text style={styles.previewValue}>{selectedProduct.name}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Discount (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter discount percentage"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={promotionDiscount}
                    onChangeText={setPromotionDiscount}
                    maxLength={3}
                  />
                  <Text style={styles.helperText}>
                    Original: ₱{selectedProduct.price.toFixed(2)}
                    {promotionDiscount && parseInt(promotionDiscount) > 0 && (
                      <Text>
                        {' '} → New: ₱{(selectedProduct.price * (1 - parseInt(promotionDiscount) / 100)).toFixed(2)}
                      </Text>
                    )}
                  </Text>
                </View>

                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setPromotionSendNotif(!promotionSendNotif)}
                  >
                    <Ionicons
                      name={promotionSendNotif ? 'checkbox' : 'checkbox-outline'}
                      size={24}
                      color={promotionSendNotif ? COLORS.primary : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Send notification to all users</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setPromotionModal(false)}
                    disabled={promotionLoading}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.applyBtn, promotionLoading && styles.disabledBtn]}
                    onPress={applyPromotion}
                    disabled={promotionLoading}
                  >
                    {promotionLoading ? (
                      <ActivityIndicator color={COLORS.background} size="small" />
                    ) : (
                      <Text style={styles.applyBtnText}>Apply Promotion</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  actionButtons: { justifyContent: 'space-around', paddingRight: 12, gap: 6 },
  promoteBtn: { padding: 8, borderRadius: 8, backgroundColor: COLORS.warning + '20' },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  productPreview: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  previewValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
