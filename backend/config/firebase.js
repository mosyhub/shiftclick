const admin = require('firebase-admin');

try {
 
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      
    });
    console.log('✅ Firebase Admin initialized');
  }
} catch (error) {
  console.log('Firebase Admin already initialized or error:', error.message);
}

module.exports = admin;
