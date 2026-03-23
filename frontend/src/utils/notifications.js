import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import api from '../api/api';
import Constants from 'expo-constants';
import { fetchOrderById, fetchMyOrders } from '../redux/slices/orderSlice';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  try {
    // Check if it's a physical device
    if (!Device.isDevice) {
      console.log('⚠️  Must use physical device for Push Notifications');
      return null;
    }
    
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️  Push notification permission denied');
      Alert.alert('Permission Denied', 'Enable notifications to receive updates', [{ text: 'OK' }]);
      return null;
    }

    // Get project ID from app.json or eas.json
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId || 
      Constants?.easConfig?.projectId ||
      'c81338ac-659f-46dc-9ac2-a3358eae9dfd'; // Fallback to your project ID

    console.log('📱 Getting expo push token for project:', projectId);

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId, 
    });
    
    const token = tokenData.data;
    console.log('✅ Expo Push Token:', token);

    // Get device info
    const deviceInfo = `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'} (${Platform.OS})`;

    // Save token to backend
    try {
      const response = await api.post('/notifications/save-token', { 
        token, 
        device: deviceInfo
      });
      console.log('✅ Push token saved to backend:', response.data);
    } catch (error) {
      console.error('❌ Error saving push token to backend:', error.response?.data || error.message);
      // Don't return null - token is still valid, just wasn't saved to DB
    }

    // Setup Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        bypassDnd: true,
      });
      console.log('✅ Android notification channel created');
    }

    return token;
  } catch (error) {
    console.error('❌ Error in registerForPushNotifications:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return null;
  }
};

// trigger local notification (for testing purposes)
export const triggerLocalPromo = async (title, body, promoId) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "Shift & Click Promo!",
        body: body || "Get 50% off on all items! Tap to view details.",
        data: { 
          screen: 'PromoDetail', 
          promoId: promoId || 'SALE50',
          title: title || "Shift & Click Promo!",
          body: body || "50% Off Details..."
        },
        sound: 'default',
      },
      trigger: {
        type: 'timeInterval',
        seconds: 2,
        channelId: 'default',
      },
    });
    console.log('Local notification triggered!');
  } catch (error) {
    console.error('Error triggering local notification:', error);
  }
};

export const setupNotificationListeners = (navigation, dispatch) => {
  console.log('Setting up notification listeners...');
  
  // Log when listeners are set up
  console.log('Notification listeners initializing for navigation:', !!navigation);
  
  // Handle notification when app is in foreground
  const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
    const title = notification.request.content.title;
    const body = notification.request.content.body;
    const data = notification.request.content.data;
    
    console.log('===== FOREGROUND NOTIFICATION RECEIVED =====');
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Data:', data);
    console.log('=========================================');
    
    // Refetch orders if this is an order status update notification
    if (data?.orderId && dispatch) {
      console.log('🔄 Refetching order data...');
      dispatch(fetchOrderById(data.orderId));
      dispatch(fetchMyOrders());
    }
    
    // Show alert in foreground so user knows they got a notification
    const buttons = [
      {
        text: 'View',
        onPress: () => {
          if (data?.orderId) {
            navigation.navigate('Orders', { 
              screen: 'OrderDetail', 
              params: { orderId: data.orderId } 
            });
          } else if (data?.productId) {
            navigation.navigate('Home', { 
              screen: 'ProductDetail', 
              params: { productId: data.productId } 
            });
          }
        },
      },
      {
        text: 'Dismiss',
        onPress: () => console.log('Notification dismissed'),
      },
    ];
    
    Alert.alert(
      title || 'Notification',
      body || 'You have a new message',
      buttons,
      { cancelable: true }
    );
  });

  // Handle notification when user taps it (background or foreground)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const title = response.notification.request.content.title;
    const body = response.notification.request.content.body;
    
    console.log('🔔 TAPPED Notification:', { title, body, data });

    // Refetch orders if this is an order status update notification
    if (data?.orderId && dispatch) {
      console.log('🔄 Refetching order data for tapped notification...');
      dispatch(fetchOrderById(data.orderId));
    }

    if (data?.orderId) {
      console.log('📦 Navigating to order:', data.orderId);
      navigation.navigate('Orders', { 
        screen: 'OrderDetail', 
        params: { orderId: data.orderId } 
      });
    } else if (data?.productId) {
      console.log('🎁 Navigating to promotion product:', data.productId);
      navigation.navigate('Home', { 
        screen: 'ProductDetail', 
        params: { productId: data.productId } 
      });
    }
  });

  console.log('✅ Notification listeners attached');
  
  return {
    remove: () => {
      responseSubscription.remove();
      notificationSubscription.remove();
      console.log('🔔 Notification listeners removed');
    }
  };
};