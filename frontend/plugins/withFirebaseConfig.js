const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseConfig(config) {
  // Update Android Manifest to ensure Firebase is initialized
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // Ensure application tag exists
    if (!manifest.application) {
      manifest.application = [{}];
    }

    // Set android:usesCleartextTraffic for development
    manifest.application[0].$['android:usesCleartextTraffic'] = 'true';

    return config;
  });

  // Update MainActivity to ensure Firebase is initialized before app runs
  config = withMainActivity(config, async (config) => {
    let mainActivity = config.modResults.contents;

    // Ensure Firebase is imported
    if (!mainActivity.includes('import com.google.firebase.FirebaseApp;')) {
      mainActivity = mainActivity.replace(
        'package com.shiftclick.frontend;',
        'package com.shiftclick.frontend;\n\nimport com.google.firebase.FirebaseApp;'
      );
    }

    // Ensure Firebase is initialized in onCreate
    if (!mainActivity.includes('FirebaseApp.initializeApp(this);')) {
      mainActivity = mainActivity.replace(
        'super.onCreate(savedInstanceState);',
        'super.onCreate(savedInstanceState);\n    if (FirebaseApp.getApps(this).isEmpty()) {\n      FirebaseApp.initializeApp(this);\n    }'
      );
    }

    config.modResults.contents = mainActivity;
    return config;
  });

  return config;
};
