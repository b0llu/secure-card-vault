/**
 * Expo Config Plugin: withKotlinVersion
 *
 * Pins android.kotlinVersion in gradle.properties to match the Kotlin version
 * that react-native ships in its libs.versions.toml (1.9.24).
 *
 * Without this, expo-modules-core defaults to assuming Kotlin 1.9.25 and picks
 * Compose compiler 1.5.15, which is incompatible with the 1.9.24 kotlin-gradle-
 * plugin that react-native actually resolves — causing a build failure.
 *
 * This plugin runs on every `expo prebuild` so the fix is permanent and survives
 * clean builds.
 */
const { withGradleProperties } = require('@expo/config-plugins');

const KOTLIN_VERSION = '1.9.24';

const withKotlinVersion = (config) => {
  return withGradleProperties(config, (mod) => {
    const properties = mod.modResults;

    // Remove any existing android.kotlinVersion entry first
    const filtered = properties.filter(
      (item) => !(item.type === 'property' && item.key === 'android.kotlinVersion'),
    );

    // Add the pinned value
    filtered.push({ type: 'property', key: 'android.kotlinVersion', value: KOTLIN_VERSION });

    mod.modResults = filtered;
    return mod;
  });
};

module.exports = withKotlinVersion;
