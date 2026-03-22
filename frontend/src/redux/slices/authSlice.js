import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';
import * as SecureStore from 'expo-secure-store';

// ================= AUTH THUNKS =================

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('📡 [Auth] Sending login request for:', credentials.email);
      const { data } = await api.post('/users/login', credentials);
      console.log('🔐 [Auth] Login Response from Backend:', data); // Debug log

      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(data));
      
      console.log('✅ [Auth] Token and user data saved successfully');
      return data;
    } catch (error) {
      console.error('❌ [Auth] Login Error:', error.response?.status, error.response?.data);
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/users/register', userData);

      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(data));

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

export const googleSignIn = createAsyncThunk(
  'auth/googleSignIn',
  async (googleData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/users/google-signin', {
        email: googleData.email,
        name: googleData.name,
        googleIdToken: googleData.idToken,
      });

      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(data));

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Google sign-in failed'
      );
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/load',
  async (_, { rejectWithValue }) => {
    try {
      const stored = await SecureStore.getItemAsync('userData');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return rejectWithValue('Failed to load user');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/update',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await SecureStore.setItemAsync('userData', JSON.stringify(data));

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Update failed'
      );
    }
  }
);

// ================= SLICE =================

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    loading: false,
    error: null,
  },

  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;

      // ⚠️ Fire-and-forget (non-blocking)
      SecureStore.deleteItemAsync('userToken');
      SecureStore.deleteItemAsync('userData');
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = null;
    };

    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };

    builder
      // LOGIN
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, rejected)

      // REGISTER
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, rejected)

      // GOOGLE SIGN-IN
      .addCase(googleSignIn.pending, pending)
      .addCase(googleSignIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(googleSignIn.rejected, rejected)

      // LOAD USER
      .addCase(loadUser.pending, pending)
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload?.token || null;
      })
      .addCase(loadUser.rejected, rejected)

      // UPDATE PROFILE
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, rejected);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;