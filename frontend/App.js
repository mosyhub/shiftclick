import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch, useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';

import { store } from './src/redux/store';
import { loadUser } from './src/redux/slices/authSlice';
import { clearCart } from './src/redux/slices/cartSlice';
import { fetchMyOrders, fetchOrderById } from './src/redux/slices/orderSlice';
import { registerForPushNotifications, setupNotificationListeners } from './src/utils/notifications';
import DrawerNavigator from './src/navigation/DrawerNavigator';

// Request permission and setup Firebase Messaging
async function setupFirebaseMessaging() {
  try {
    // Request notifications permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('🔥 Firebase Messaging permission granted:', authStatus);
    } else {
      console.log('⚠️  Firebase Messaging permission not granted');
    }

    // Get and log FCM token
    const fcmToken = await messaging().getToken();
    console.log('🔥 FCM Token:', fcmToken);

    // Listen for messages when app is in foreground
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('🔥 FCM Message received in foreground:', remoteMessage);
      
      // Extract notification data
      const title = remoteMessage.notification?.title || 'Shift & Click';
      const body = remoteMessage.notification?.body || 'You have a new notification';
      const data = remoteMessage.data || {};
      
      // Display as local notification (visible on device)
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: 'default',
            badge: 1,
          },
          trigger: null, // Show immediately
        });
        console.log('✅ FCM notification displayed to user:', title);
      } catch (error) {
        console.error('❌ Error displaying FCM notification:', error);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Firebase Messaging setup error:', error);
  }
}

// Setup Firebase on app start
setupFirebaseMessaging();

function AppWrapper() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const navigationRef = useRef(null);
  const prevUserRef = useRef(undefined);

  // Load user on app start
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // Navigate to correct screen based on user role
  useEffect(() => {
    if (user && navigationRef.current) {
      console.log('🎯 User logged in, role:', user.role);
      if (user.role === 'admin') {
        console.log('🚀 Navigating to Admin Dashboard');
        navigationRef.current.navigate('Admin', { screen: 'AdminDashboard' });
      } else {
        console.log('🚀 Navigating to Product List');
        navigationRef.current.navigate('Home', { screen: 'ProductList' });
      }
    }
  }, [user?.role]); // Only trigger when user role changes

  // Detect logout → clear cart
  useEffect(() => {
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }

    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!user && prevUser) {
      dispatch(clearCart());
    }
  }, [user, dispatch]);

  // Register push notifications when logged in
  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user]);

  // Setup notification listeners
  useEffect(() => {
    if (!navigationRef.current) return;

    const sub = setupNotificationListeners(navigationRef.current, dispatch);
    return () => sub?.remove();
  }, [dispatch]);

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