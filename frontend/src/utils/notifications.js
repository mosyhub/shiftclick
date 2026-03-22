import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../api/api';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId, 
    });
    const token = tokenData.data;

    // I-save ang token sa backend
    await api.post('/users/push-token', { 
      token, 
      device: `${Device.brand} ${Device.modelName} (${Platform.OS})` 
    });
    
    console.log('✅ Push token saved to DB:', token);

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error('❌ Failed to register or save push token:', error.message);
    return null;
  }
};

// trigger local notification (for testing purposes)
export const triggerLocalPromo = async (title, body, promoId) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "Shift & Click Promo! 🎁",
        body: body || "Get 50% off on all items! Tap to view details.",
        data: { 
          screen: 'PromoDetail', 
          promoId: promoId || 'SALE50',
          title: title || "Shift & Click Promo!",
          body: body || "50% Off Details..."
        },
        sound: 'default',
      },
      trigger: null, 
    });
    console.log('✅ Local notification triggered!');
  } catch (error) {
    console.error('❌ Error triggering local notification:', error);
  }
};

export const setupNotificationListeners = (navigation) => {
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const title = response.notification.request.content.title;
    const body = response.notification.request.content.body;
    
    console.log('Notification Tapped. Data:', data);

    // 1. Term Test: View Order Details
    if (data?.orderId) {
      navigation.navigate('OrderDetail', { orderId: data.orderId });
    }

    // 2. Quiz 2: View Promotion Details
    else if (data?.screen === 'PromoDetail' || data?.promoId) {
      navigation.navigate('Home', { 
        promoId: data.promoId, 
        title: data.title || title,
        body: data.body || body 
      });
    }
  });

  const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification.request.content.title);
  });
  
  return {
    remove: () => {
      responseSubscription.remove();
      notificationSubscription.remove();
    }
  };
};