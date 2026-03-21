import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice';
import cartReducer, { clearCart } from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import reviewReducer from './slices/reviewSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    cart: cartReducer,
    orders: orderReducer,
    reviews: reviewReducer,
  },
});

// ✅ Listen for logout action and clear cart from Redux automatically
store.subscribe(() => {});

// Middleware approach — clear cart when logout is dispatched
const originalDispatch = store.dispatch;
store.dispatch = (action) => {
  if (action.type === 'auth/logout') {
    originalDispatch(clearCart()); // Clear Redux cart
  }
  return originalDispatch(action);
};

export { store };