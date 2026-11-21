import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeModeProvider, useAppTheme } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { LocationProvider } from '@/context/LocationContext';
import { Palette } from '@/constants/theme';
import initI18n from '@/i18n/i18n';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/i18n/i18n';

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { isAuthenticated, loading } = useAuth();
  const theme = useAppTheme() as any;
  const colors = theme?.colors || { background: Palette.darkBg };
  const segments = useSegments();
  const router = useRouter();
  const initialRedirectDone = React.useRef(false);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});
    
    // Only redirect once on initial load if user opened app in auth group while already authenticated
    const inAuthGroup = segments[0] === '(auth)';
    if (isAuthenticated && inAuthGroup && !initialRedirectDone.current) {
      initialRedirectDone.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Palette.primaryBlue} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="live-map" options={{ headerShown: false }} />
      <Stack.Screen name="symptoms" options={{ headerShown: false }} />
      <Stack.Screen name="hospitals" options={{ headerShown: false }} />
      <Stack.Screen name="hospital-details" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Palette.darkBg }]}>
        <ActivityIndicator size="large" color={Palette.primaryBlue} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeModeProvider>
        <LanguageProvider>
          <AuthProvider>
            <LocationProvider>
              <RootNavigation />
            </LocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeModeProvider>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
