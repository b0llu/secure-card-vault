import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Card Vault',
  slug: 'card-vault',
  owner: 'bollu',
  version: '6.0.0',
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
    bundleIdentifier: 'com.cardvault.free',
    infoPlist: {
      NSCameraUsageDescription:
        'Card Vault uses the camera to scan and capture document details.',
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
      UIBackgroundModes: [],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0E0E0E',
    },
    package: 'com.cardvault.free',
    versionCode: 6,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'react-native-vision-camera',
      {
        cameraPermissionText:
          'Vault needs camera access to scan and capture document details.',
        enableMicrophonePermission: false,
      },
    ],
    // Custom plugin to add FLAG_SECURE (screenshot prevention) on Android
    './plugins/withAndroidSecureFlag',
    // Pin android.kotlinVersion so expo-modules-core picks the Compose compiler
    // version that matches react-native's kotlin-gradle-plugin (1.9.24).
    './plugins/withKotlinVersion',
    // Enable Proguard minification and resource shrinking for release builds.
    './plugins/withReleaseOptimizations',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'b9ccff49-9170-4978-9ac1-9f34ae03e04b',
    },
  },
});
