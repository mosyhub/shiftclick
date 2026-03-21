import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../api/api';

// Configure how notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications and save token to backend
export const registerForPushNotifications = async () => {
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

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Save token to backend
  try {
    await api.post('/users/push-token', { token, device: Platform.OS });
  } catch (error) {
    console.error('Failed to save push token:', error);
  }

  return token;
};

// Handle notification tap — navigate to order detail
export const setupNotificationListeners = (navigation) => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.orderId) {
      navigation.navigate('OrderDetail', { orderId: data.orderId });
    }
  });
  return subscription;
};