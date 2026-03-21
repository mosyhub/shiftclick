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

// Register for push notifications and save token to backend
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  // ask for permissions
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
    // fetch project ID from EAS config
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ||
                      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found. Ensure you have an EAS project ID in app.json');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const token = tokenData.data;
    // Save token to backend user model
    await api.post('/users/push-token', {
      token,
      device: `${Device.brand} ${Device.modelName} (${Platform.OS})`
    });

    console.log('✅ Push token saved to DB:', token);
    // Setup channel for Android
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

export const setupNotificationListeners = (navigation) => {
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const title = response.notification.request.content.title;
    const body = response.notification.request.content.body;
    console.log('Notification Tapped. Data:', data);
    // Click to view order details
    if (data?.orderId) {
      navigation.navigate('OrderDetail', { orderId: data.orderId });
    }

    // View promotion/discount details
    else if (data?.screen === 'PromoDetail' || data?.promoId) {
      navigation.navigate('PromoDetail', {
        promoId: data.promoId,
        title: title,
        body: body
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