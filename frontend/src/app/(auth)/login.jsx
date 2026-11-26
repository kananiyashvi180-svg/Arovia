import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { Palette } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const router = useRouter();
  const { message, redirect } = useLocalSearchParams();
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMsg(t('auth.enterCredentialsError'));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await login(identifier.trim(), password);
      // Route user to requested destination or Dashboard
      const destination = redirect ? decodeURIComponent(String(redirect)) : '/';
      router.replace(destination);
    } catch (err) {
      console.warn('Login error:', err.response?.data || err.message);
      const serverMsg = typeof err.response?.data === 'object' && err.response?.data?.message
        ? err.response.data.message
        : t('auth.invalidCredentialsOrNetwork');
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Brand */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>💙</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>{t('common.appName')}</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              {t('home.tagline')}
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t('nav.welcomeBack')}</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              {t('auth.loginSubtitle')}
            </Text>

            {/* Contextual notification banner if redirected from saved hospital */}
            {message ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>ℹ️ {message}</Text>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Identifier field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('auth.emailOrMobileLabel')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                placeholder={t('auth.emailOrMobilePlaceholder')}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('auth.password')}</Text>
              <View
                style={[
                  styles.passwordWrap,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: Palette.primaryBlue }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>{t('auth.loginBtn')}</Text>
              )}
            </TouchableOpacity>

            {/* Explore as Guest Link */}
            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/')}
            >
              <Text style={[styles.guestLinkText, { color: colors.textSecondary }]}>
                {t('auth.continueAsGuest')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer sign up redirect */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('auth.noAccount')}{' '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register',
                  params: redirect ? { redirect } : undefined,
                })
              }
            >
              <Text style={[styles.signupLink, { color: Palette.primaryBlue }]}>{t('auth.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoBannerText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  loginBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});
