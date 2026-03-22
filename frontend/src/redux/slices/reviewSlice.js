import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';

// ================= REVIEW THUNKS =================

export const fetchProductReviews = createAsyncThunk(
  'reviews/fetchByProduct',
  async ({ productId, rating, sort }, { rejectWithValue }) => {
    try {
      const params = {};
      if (rating) params.rating = rating;
      if (sort) params.sort = sort;
      const { data } = await api.get(`/reviews/product/${productId}`, { params });
      return data; // { reviews, summary }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/reviews/my-all');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const fetchAllReviews = createAsyncThunk(
  'reviews/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/reviews', { params });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/create',
  async (reviewData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/reviews', reviewData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create review');
    }
  }
);

export const updateReviewThunk = createAsyncThunk(
  'reviews/update',
  async ({ id, reviewData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/reviews/${id}`, reviewData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update review');
    }
  }
);

export const deleteReviewThunk = createAsyncThunk(
  'reviews/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/reviews/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete review');
    }
  }
);

export const checkCanReview = createAsyncThunk(
  'reviews/canReview',
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/reviews/can-review/${productId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check review status');
    }
  }
);

// ================= SLICE =================

const reviewSlice = createSlice({
  name: 'reviews',
  initialState: {
    items: [],
    myReviews: [],
    summary: null,
    canReviewStatus: null,
    loading: false,
    error: null,
  },
  reducers: {
    setReviews: (state, action) => { state.items = action.payload; },
    addReview: (state, action) => { state.items.unshift(action.payload); },
    updateReview: (state, action) => {
      const idx = state.items.findIndex((r) => r._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
      const myIdx = state.myReviews.findIndex((r) => r._id === action.payload._id);
      if (myIdx !== -1) state.myReviews[myIdx] = action.payload;
    },
    clearReviewError: (state) => { state.error = null; },
    clearCanReview: (state) => { state.canReviewStatus = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchProductReviews.pending, pending)
      .addCase(fetchProductReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.reviews;
        state.summary = action.payload.summary;
      })
      .addCase(fetchProductReviews.rejected, rejected)

      .addCase(fetchMyReviews.pending, pending)
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.myReviews = action.payload;
      })
      .addCase(fetchMyReviews.rejected, rejected)

      .addCase(fetchAllReviews.pending, pending)
      .addCase(fetchAllReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAllReviews.rejected, rejected)

      .addCase(createReview.pending, pending)
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.myReviews.unshift(action.payload);
      })
      .addCase(createReview.rejected, rejected)

      .addCase(updateReviewThunk.pending, (state) => { state.loading = true; })
      .addCase(updateReviewThunk.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((r) => r._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
        const myIdx = state.myReviews.findIndex((r) => r._id === action.payload._id);
        if (myIdx !== -1) state.myReviews[myIdx] = action.payload;
      })
      .addCase(updateReviewThunk.rejected, rejected)

      .addCase(deleteReviewThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r._id !== action.payload);
        state.myReviews = state.myReviews.filter((r) => r._id !== action.payload);
      })

      .addCase(checkCanReview.fulfilled, (state, action) => {
        state.canReviewStatus = action.payload;
      });
  },
});

export const { setReviews, addReview, updateReview, clearReviewError, clearCanReview } = reviewSlice.actions;
export default reviewSlice.reducer;