import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { COLORS } from '../constants/theme';

export const initializeGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};

export const handleGoogleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    
    console.log('Google Sign-In Response:', response);
    
    // Response structure: { data: { user: {...}, idToken, ... }, type: 'success' }
    const userInfo = response.data || response;
    const user = userInfo.user || {};
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.givenName,
        photo: user.photo,
        idToken: userInfo.idToken,
        accessToken: userInfo.accessToken,
      },
    };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, message: 'Sign in cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, message: 'Sign in in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, message: 'Play Services not available' };
    } else {
      return { success: false, message: error.message || 'Sign in failed' };
    }
  }
};

export const handleGoogleSignOut = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const isSignedIn = async () => {
  try {
    return await GoogleSignin.isSignedIn();
  } catch (error) {
    return false;
  }
};
