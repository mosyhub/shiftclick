import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductById, deleteProduct } from '../redux/slices/productSlice';
import { addToCart } from '../redux/slices/cartSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import ReviewSection from './ReviewScreen';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const dispatch = useDispatch();
  const { selectedProduct: product, loading } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    dispatch(fetchProductById(id));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await dispatch(deleteProduct(id));
          navigation.goBack();
        },
      },
    ]);
  };

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    dispatch(addToCart({ ...product, quantity }));
    Alert.alert('Added to Cart ✅', `${product.name} added!`);
  };

  if (loading || !product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const discountedPrice = product.discount > 0
    ? (product.price * (1 - product.discount / 100)).toFixed(2)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.gallery}>
          {product.images?.length > 0 ? (
            <>
              <Image
                source={{ uri: product.images[activeImage]?.url }}
                style={styles.mainImage}
                resizeMode="contain"
              />
              {product.images.length > 1 && (
                <ScrollView horizontal style={styles.thumbnailRow} showsHorizontalScrollIndicator={false}>
                  {product.images.map((img, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setActiveImage(idx)}>
                      <Image
                        source={{ uri: img.url }}
                        style={[styles.thumbnail, activeImage === idx && styles.thumbnailActive]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={60} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            {discountedPrice ? (
              <>
                <Text style={styles.discountedPrice}>₱{discountedPrice}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
                <Text style={styles.originalPrice}>₱{product.price.toFixed(2)}</Text>
              </>
            ) : (
              <Text style={styles.price}>₱{product.price.toFixed(2)}</Text>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= Math.round(product.rating) ? 'star' : 'star-outline'}
                size={16}
                color={COLORS.warning}
              />
            ))}
            <Text style={styles.ratingText}>
              {product.rating?.toFixed(1)} ({product.numReviews} review{product.numReviews !== 1 ? 's' : ''})
            </Text>
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            <Ionicons
              name={product.stock > 0 ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={product.stock > 0 ? COLORS.success : COLORS.error}
            />
            <Text style={[styles.stockText, product.stock === 0 && { color: COLORS.error }]}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Specs */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.specs).map(([key, val]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specVal}>{val}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Reviews — display only, no write/edit form here */}
        <View style={styles.reviewsContainer}>
          <ReviewSection productId={product._id} displayOnly />
        </View>

      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {product.stock > 0 && (
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
            >
              <Ionicons name="add" size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cartBtn, (product.stock === 0 || !user) && styles.cartBtnDisabled]}
          disabled={product.stock === 0 || !user}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart" size={18} color={COLORS.background} />
          <Text style={styles.cartBtnText}>
            {!user ? 'Login to Add' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>

        {user?.role === 'admin' && (
          <>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('ProductForm', { product })}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  gallery: { backgroundColor: COLORS.surface },
  mainImage: { width, height: 300 },
  thumbnailRow: { paddingVertical: 10, paddingHorizontal: 12 },
  thumbnail: { width: 60, height: 60, marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  thumbnailActive: { borderColor: COLORS.primary, borderWidth: 2 },
  noImage: { height: 200, justifyContent: 'center', alignItems: 'center' },
  infoContainer: { padding: 16 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  categoryText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  brand: { color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  price: { color: COLORS.primary, fontSize: 24, fontWeight: '800' },
  discountedPrice: { color: COLORS.primary, fontSize: 24, fontWeight: '800' },
  originalPrice: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  ratingText: { color: COLORS.textSecondary, fontSize: 13, marginLeft: 6 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  stockText: { color: COLORS.success, fontSize: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  specKey: { color: COLORS.textMuted, fontSize: 13 },
  specVal: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  reviewsContainer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 8, overflow: 'hidden' },
  qtyBtn: { padding: 10 },
  qtyText: { color: COLORS.text, paddingHorizontal: 14, fontWeight: '700' },
  cartBtn: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, justifyContent: 'center', alignItems: 'center', gap: 8 },
  cartBtnDisabled: { backgroundColor: COLORS.textMuted },
  cartBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  editBtn: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  deleteBtn: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.error },
});