import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { createProduct, updateProduct } from '../redux/slices/productSlice';
import { COLORS, CATEGORIES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const FIELDS = [
  { key: 'name', label: 'Product Name *', placeholder: 'e.g. Logitech G Pro X' },
  { key: 'brand', label: 'Brand *', placeholder: 'e.g. Logitech' },
  { key: 'description', label: 'Description *', placeholder: 'Describe the product...', multiline: true },
  { key: 'price', label: 'Price (₱) *', placeholder: '0.00', keyboardType: 'decimal-pad' },
  { key: 'stock', label: 'Stock Quantity *', placeholder: '0', keyboardType: 'numeric' },
  { key: 'discount', label: 'Discount (%)', placeholder: '0', keyboardType: 'numeric' },
];

export default function ProductFormScreen({ route, navigation }) {
  const { product } = route.params || {};
  const isEdit = !!product;
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.products);

  const [form, setForm] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    stock: product?.stock?.toString() || '',
    discount: product?.discount?.toString() || '0',
    category: product?.category || 'Mouse',
    specs: product?.specs || {},
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [existingImages] = useState(product?.images || []);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Product' : 'Add Product' });
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Gallery access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera access is required.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) {
      setNewImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const buildFormData = () => {
    const formData = new FormData();

    Object.entries(form).forEach(([key, val]) => {
      formData.append(key, val);
    });

    if (form.specs) {
      formData.append('specs', JSON.stringify(form.specs));
    }

    newImages.forEach((uri, idx) => {
      const ext = uri.split('.').pop();
      formData.append('images', {
        uri,
        name: `image_${idx}.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });
    });
    return formData;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.brand || !form.price || !form.description) {
      return Alert.alert('Missing Fields', 'Please fill in all required fields.');
    }
    const formData = buildFormData();
    if (isEdit) {
      await dispatch(updateProduct({ id: product._id, formData }));
      Alert.alert('Updated ✅', 'Product updated successfully.');
    } else {
      await dispatch(createProduct(formData));
      Alert.alert('Created ✅', 'Product created successfully.');
    }
    navigation.navigate('ProductList');
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Text fields */}
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={[styles.input, field.multiline && styles.textarea]}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textMuted}
            value={form[field.key]}
            onChangeText={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
            keyboardType={field.keyboardType || 'default'}
            multiline={field.multiline}
            numberOfLines={field.multiline ? 4 : 1}
          />
        </View>
      ))}

      {/* Category picker */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
          <Text style={styles.selectText}>{form.category}</Text>
          <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {showCategoryPicker && (
          <View style={styles.dropdown}>
            {CATEGORIES.filter((c) => c.value).map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.dropdownOption, form.category === cat.value && styles.dropdownOptionActive]}
                onPress={() => { setForm((p) => ({ ...p, category: cat.value })); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.dropdownText, form.category === cat.value && styles.dropdownTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Technical Specs Section */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Technical Specifications (e.g., DPI: 16000)</Text>
        <View style={styles.specInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Key (e.g. DPI)"
            value={specKey}
            onChangeText={setSpecKey}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Value (e.g. 25k)"
            value={specValue}
            onChangeText={setSpecValue}
          />
          <TouchableOpacity
            style={styles.addSpecBtn}
            onPress={() => {
              if (specKey && specValue) {
                setForm(p => ({ ...p, specs: { ...p.specs, [specKey]: specValue } }));
                setSpecKey(''); setSpecValue('');
              }
            }}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Display Added Specs */}
        {Object.entries(form.specs).map(([key, val]) => (
          <View key={key} style={styles.specBadge}>
            <Text style={styles.specText}>{key}: {val}</Text>
            <TouchableOpacity onPress={() => {
              const newSpecs = { ...form.specs };
              delete newSpecs[key];
              setForm(p => ({ ...p, specs: newSpecs }));
            }}>
              <Ionicons name="close-circle" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Images */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Product Images (max 5)</Text>

        {existingImages.length > 0 && (
          <View style={styles.imageRow}>
            {existingImages.map((img, idx) => (
              <View key={idx} style={styles.imageThumb}>
                <Image source={{ uri: img.url }} style={styles.thumbImg} />
                <Text style={styles.savedTag}>Saved</Text>
              </View>
            ))}
          </View>
        )}

        {newImages.length > 0 && (
          <View style={styles.imageRow}>
            {newImages.map((uri, idx) => (
              <View key={idx} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity
                  style={styles.removeImg}
                  onPress={() => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.uploadRow}>
          <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.background} /> : (
          <>
            <Ionicons name={isEdit ? 'save' : 'add-circle'} size={20} color={COLORS.background} />
            <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Product'}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  textarea: { height: 100, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { color: COLORS.text, fontSize: 14 },
  dropdown: { backgroundColor: COLORS.surfaceLight, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownOptionActive: { backgroundColor: COLORS.primary + '20' },
  dropdownText: { color: COLORS.text, fontSize: 14 },
  dropdownTextActive: { color: COLORS.primary, fontWeight: '700' },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  imageThumb: { position: 'relative', width: 80, height: 80 },
  thumbImg: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  savedTag: { position: 'absolute', bottom: 2, right: 2, fontSize: 9, color: COLORS.primary, backgroundColor: COLORS.surface + 'cc', borderRadius: 4, paddingHorizontal: 4 },
  removeImg: { position: 'absolute', top: -6, right: -6 },
  uploadRow: { flexDirection: 'row', gap: 10 },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.primary + '60', borderStyle: 'dashed' },
  uploadText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  submitText: { color: COLORS.background, fontWeight: '800', fontSize: 16 },
  specInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  addSpecBtn: { justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  specBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceLight, padding: 8, borderRadius: 8, marginBottom: 4 },
  specText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
});