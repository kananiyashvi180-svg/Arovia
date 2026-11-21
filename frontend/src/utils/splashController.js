import * as SplashScreen from 'expo-splash-screen';

/**
 * Call this once the app has finished loading
 * (fonts loaded, auth state resolved, etc.)
 * to hide the native splash screen.
 */
export const hideSplash = async () => {
  try {
    await SplashScreen.hideAsync();
  } catch (e) {
    // Splash already hidden — safe to ignore
  }
};

/**
 * Keep the splash screen visible (call early in app lifecycle)
 */
export const preventSplashHide = async () => {
  try {
    await SplashScreen.preventAutoHideAsync();
  } catch (e) {
    // Already prevented
  }
};
