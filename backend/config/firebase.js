const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      // Note: If you have a service account JSON, use it here:
      // credential: admin.credential.cert(require('./path-to-serviceAccountKey.json'))
      // For now, using environment variables
    });
    console.log('✅ Firebase Admin initialized');
  }
} catch (error) {
  console.log('Firebase Admin already initialized or error:', error.message);
}

module.exports = admin;
