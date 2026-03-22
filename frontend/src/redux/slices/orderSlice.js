import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';

// ================= ORDER THUNKS =================

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/orders/my');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/orders');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/create',
  async (orderData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/orders', orderData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to place order');
    }
  }
);

export const updateOrderStatusThunk = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status, note }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/orders/${id}/status`, { status, note });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const deleteOrderThunk = createAsyncThunk(
  'orders/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/orders/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete order');
    }
  }
);

// ================= SLICE =================

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],
    selectedOrder: null,
    loading: false,
    error: null,
  },
  reducers: {
    setOrders: (state, action) => { state.items = action.payload; },
    setSelectedOrder: (state, action) => { state.selectedOrder = action.payload; },
    updateOrderStatus: (state, action) => {
      const order = state.items.find((o) => o._id === action.payload.id);
      if (order) order.status = action.payload.status;
      if (state.selectedOrder?._id === action.payload.id) {
        state.selectedOrder.status = action.payload.status;
      }
    },
    clearOrderError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchMyOrders.pending, pending)
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyOrders.rejected, rejected)

      .addCase(fetchAllOrders.pending, pending)
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAllOrders.rejected, rejected)

      .addCase(fetchOrderById.pending, pending)
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, rejected)

      .addCase(createOrder.pending, pending)
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.selectedOrder = action.payload;
      })
      .addCase(createOrder.rejected, rejected)

      .addCase(updateOrderStatusThunk.pending, (state) => { state.loading = true; })
      .addCase(updateOrderStatusThunk.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((o) => o._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
        state.selectedOrder = action.payload;
      })
      .addCase(updateOrderStatusThunk.rejected, rejected)

      .addCase(deleteOrderThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((o) => o._id !== action.payload);
        if (state.selectedOrder?._id === action.payload) state.selectedOrder = null;
      });
  },
});

export const { setOrders, setSelectedOrder, updateOrderStatus, clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;