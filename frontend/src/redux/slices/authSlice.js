import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';
import * as SecureStore from 'expo-secure-store';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/users/login', credentials);
    await SecureStore.setItemAsync('userToken', data.token);
    await SecureStore.setItemAsync('userData', JSON.stringify(data));
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/users/register', userData);
    await SecureStore.setItemAsync('userToken', data.token);
    await SecureStore.setItemAsync('userData', JSON.stringify(data));
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const loadUser = createAsyncThunk('auth/load', async (_, { rejectWithValue }) => {
  try {
    const stored = await SecureStore.getItemAsync('userData');
    if (stored) return JSON.parse(stored);
    return null;
  } catch {
    return rejectWithValue('Failed to load user');
  }
});

export const updateProfile = createAsyncThunk('auth/update', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/users/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await SecureStore.setItemAsync('userData', JSON.stringify(data));
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Update failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null, loading: false, error: null },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      // ✅ Only clear SecureStore here — SQLite handled in CartScreen
      SecureStore.deleteItemAsync('userToken');
      SecureStore.deleteItemAsync('userData');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };
    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.token = action.payload.token; })
      .addCase(loginUser.rejected, rejected)
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.token = action.payload.token; })
      .addCase(registerUser.rejected, rejected)
      .addCase(loadUser.fulfilled, (state, action) => { state.user = action.payload; state.token = action.payload?.token || null; })
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(updateProfile.rejected, rejected);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;