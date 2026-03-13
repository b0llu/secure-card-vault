import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Card Vault',
  slug: 'card-vault',
  owner: 'bollu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0E0E0E',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.securecardvault.free',
    infoPlist: {
      NSCameraUsageDescription:
        'Card Vault uses the camera to scan your credit/debit cards via OCR.',
      NSFaceIDUsageDescription:
        'Card Vault uses Face ID to unlock your encrypted vault.',
      UIBackgroundModes: [],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0E0E0E',
    },
    package: 'com.securecardvault.free',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Allow Card Vault to use Face ID to unlock your vault.',
      },
    ],
    [
      'react-native-vision-camera',
      {
        cameraPermissionText:
          'Card Vault needs camera access to scan your credit/debit cards.',
        enableMicrophonePermission: false,
      },
    ],
    // Custom plugin to add FLAG_SECURE (screenshot prevention) on Android
    './plugins/withAndroidSecureFlag',
    // Pin android.kotlinVersion so expo-modules-core picks the Compose compiler
    // version that matches react-native's kotlin-gradle-plugin (1.9.24).
    './plugins/withKotlinVersion',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    freeCardLimit: 3,
    eas: {
      projectId: '079016eb-5a11-4140-a036-b865443bbd25',
    },
  },
});
