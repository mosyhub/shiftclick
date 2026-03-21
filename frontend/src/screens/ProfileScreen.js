import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, logout } from '../redux/slices/authSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((s) => s.auth);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(null);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Gallery access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera access is required.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    if (avatar) {
      const ext = avatar.split('.').pop();
      formData.append('avatar', { uri: avatar, name: `avatar.${ext}`, type: `image/${ext}` });
    }
    await dispatch(updateProfile(formData));
    Alert.alert('Updated ✅', 'Profile updated successfully!');
  };

  const avatarUrl = avatar || user?.avatar?.url;

  return (
    <ScrollView style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={styles.editOverlay}>
            <Ionicons name="camera" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickAvatar}>
            <Ionicons name="images" size={16} color={COLORS.primary} />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={16} color={COLORS.primary} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.role === 'admin' && (
          <View style={styles.adminBadge}><Text style={styles.adminText}>ADMIN</Text></View>
        )}
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Edit Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={COLORS.textMuted} placeholder="Full name" />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholderTextColor={COLORS.textMuted} placeholder="+63 9XX XXX XXXX" keyboardType="phone-pad" />

        <Text style={styles.label}>Email (cannot be changed)</Text>
        <TextInput style={[styles.input, styles.disabledInput]} value={user?.email} editable={false} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.background} /> : (
            <>
              <Ionicons name="save" size={18} color={COLORS.background} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Admin Panel Button */}
      {user?.role === 'admin' && (
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => navigation.navigate('Admin', { screen: 'AdminDashboard' })}
        >
          <Ionicons name="shield-checkmark" size={20} color={COLORS.background} />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logout())}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  avatarSection: { alignItems: 'center', paddingTop: 30, paddingBottom: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: COLORS.background, fontSize: 40, fontWeight: '800' },
  editOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.accent, borderRadius: 14, padding: 6 },
  photoButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary + '60' },
  photoBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  userName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  userEmail: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  adminBadge: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  adminText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  form: { margin: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceLight, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  disabledInput: { opacity: 0.5 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  saveBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 15 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.primary },
  adminBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.error + '60' },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});