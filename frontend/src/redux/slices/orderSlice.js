import { createSlice } from '@reduxjs/toolkit';

const orderSlice = createSlice({
  name: 'orders',
  initialState: { items: [], selectedOrder: null, loading: false, error: null },
  reducers: {
    setOrders: (state, action) => { state.items = action.payload; },
    setSelectedOrder: (state, action) => { state.selectedOrder = action.payload; },
    updateOrderStatus: (state, action) => {
      const order = state.items.find((o) => o._id === action.payload.id);
      if (order) order.status = action.payload.status;
      if (state.selectedOrder?._id === action.payload.id) state.selectedOrder.status = action.payload.status;
    },
  },
});

export const { setOrders, setSelectedOrder, updateOrderStatus } = orderSlice.actions;
export default orderSlice.reducer;