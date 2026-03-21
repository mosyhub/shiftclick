import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './src/redux/slices/authSlice';
import { clearCart } from './src/redux/slices/cartSlice';
import { registerForPushNotifications, setupNotificationListeners } from './src/utils/notifications';
import DrawerNavigator from './src/navigation/DrawerNavigator';

function AppWrapper() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const navigationRef = useRef(null);
  const prevUserRef = useRef(undefined);

  useEffect(() => { dispatch(loadUser()); }, []);

  useEffect(() => {
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    // User just logged out → clear Redux cart
    // SQLite cart will be cleared by CartScreen when it detects user is null
    if (!user && prevUser) {
      dispatch(clearCart());
    }
  }, [user]);

  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  useEffect(() => {
    if (!navigationRef.current) return;
    const sub = setupNotificationListeners(navigationRef.current);
    return () => sub.remove();
  }, [navigationRef.current]);

  return (
    <NavigationContainer ref={navigationRef}>
      <DrawerNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppWrapper />
      </Provider>
    </GestureHandlerRootView>
  );
}