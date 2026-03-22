import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateQuantity, clearCart, setCart } from '../redux/slices/cartSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'shiftandclick.db';

const initDB = () => {
  const db = SQLite.openDatabaseSync(DB_NAME);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cart (
      id TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      image TEXT,
      quantity INTEGER,
      brand TEXT,
      category TEXT
    );
  `);
  return db;
};

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, total } = useSelector((s) => s.cart);
  const { user } = useSelector((s) => s.auth);
  const dbRef = useRef(null);
  const prevUserRef = useRef(undefined);

  // Init DB once on mount
  useEffect(() => {
    try {
      dbRef.current = initDB();

      // Load cart on mount
      const rows = dbRef.current.getAllSync('SELECT * FROM cart;');
      console.log('CartScreen mount - rows:', rows.length);
      if (rows.length > 0) {
        dispatch(setCart(rows.map((r) => ({
          _id: r.id,
          id: r.id,
          name: r.name,
          price: r.price,
          quantity: r.quantity,
          brand: r.brand || '',
          category: r.category || '',
          image: r.image || '',
          images: r.image ? [{ url: r.image }] : [],
        }))));
      }
    } catch (e) {
      console.log('CartScreen DB init error:', e);
    }
  }, []);

  // Watch user changes — clear SQLite when user logs out
  useEffect(() => {
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!user && prevUser) {
      // User logged out — clear SQLite
      try {
        if (dbRef.current) {
          dbRef.current.execSync('DELETE FROM cart;');
          console.log('Cart cleared from SQLite on logout');
        }
      } catch (e) {
        console.log('Clear cart error:', e);
      }
    } else if (user && !prevUser) {
      // User logged in — load from SQLite
      try {
        if (dbRef.current) {
          const rows = dbRef.current.getAllSync('SELECT * FROM cart;');
          console.log('User logged in - loading cart:', rows.length);
          if (rows.length > 0) {
            dispatch(setCart(rows.map((r) => ({
              _id: r.id,
              id: r.id,
              name: r.name,
              price: r.price,
              quantity: r.quantity,
              brand: r.brand || '',
              category: r.category || '',
              image: r.image || '',
              images: r.image ? [{ url: r.image }] : [],
            }))));
          }
        }
      } catch (e) {
        console.log('Load cart on login error:', e);
      }
    }
  }, [user]);

  // Sync Redux → SQLite whenever items change
  useEffect(() => {
    if (!dbRef.current) return;
    try {
      dbRef.current.execSync('DELETE FROM cart;');
      items.forEach((item) => {
        dbRef.current.runSync(
          'INSERT OR REPLACE INTO cart (id, name, price, image, quantity, brand, category) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [
            item._id || item.id,
            item.name,
            item.price,
            item.images?.[0]?.url || item.image || '',
            item.quantity,
            item.brand || '',
            item.category || '',
          ]
        );
      });
      console.log('Cart synced to SQLite:', items.length, 'items');
    } catch (error) {
      console.log('SQLite sync error:', error);
    }
  }, [items]);

  const handleCheckout = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    navigation.navigate('Orders', { screen: 'Checkout' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      {item.images?.[0]?.url || item.image ? (
        <Image source={{ uri: item.images?.[0]?.url || item.image }} style={styles.itemImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => {
              if (item.quantity <= 1) dispatch(removeFromCart(item._id || item.id));
              else dispatch(updateQuantity({ id: item._id || item.id, quantity: item.quantity - 1 }));
            }}
          >
            <Ionicons name="remove" size={14} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => dispatch(updateQuantity({ id: item._id || item.id, quantity: item.quantity + 1 }))}
          >
            <Ionicons name="add" size={14} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => dispatch(removeFromCart(item._id || item.id))}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item._id || item.id}
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Ionicons name="card" size={18} color={COLORS.background} />
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 12 },
  cartItem: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  imagePlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  itemPrice: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: COLORS.surfaceLight, padding: 6, borderRadius: 6 },
  qtyText: { color: COLORS.text, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto', padding: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  shopBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shopBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { color: COLORS.textMuted, fontSize: 12 },
  totalAmount: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  checkoutText: { color: COLORS.background, fontWeight: '800', fontSize: 15 },
});