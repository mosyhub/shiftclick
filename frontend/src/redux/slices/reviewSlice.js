import { createSlice } from '@reduxjs/toolkit';

const reviewSlice = createSlice({
  name: 'reviews',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    setReviews: (state, action) => { state.items = action.payload; },
    addReview: (state, action) => { state.items.unshift(action.payload); },
    updateReview: (state, action) => {
      const idx = state.items.findIndex((r) => r._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
  },
});

export const { setReviews, addReview, updateReview } = reviewSlice.actions;
export default reviewSlice.reducer;