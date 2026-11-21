import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette } from '../constants/theme';
import AroviaDrawer from './AroviaDrawer';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function AroviaHeader({ activeNav = 'Dashboard' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();

  // Top inset to ensure the Android status bar and iOS notch never overlap controls
  const topPadding = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top || 24) + 4
    : insets.top + 4;

  // Show both Login + Sign Up only on wider screens (tablets or wide phablets >= 420px)
  const showBothAuthButtons = width >= 420;

  const handleNotificationPress = () => {
    if (isAuthenticated) {
      router.push('/notifications');
    } else {
      router.push({
        pathname: '/(auth)/login',
        params: {
          redirect: '/notifications',
          message: 'Please sign in to view your notifications.',
        },
      });
    }
  };

  return (
    <>
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: topPadding,
            backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
            borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.headerRow}>
          {/* ── Left: Hamburger Menu + Arovia Brand ─────────────── */}
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              onPress={() => setDrawerOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Open Navigation Menu"
            >
              <Ionicons name="menu-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.brandTouchable}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
              accessibilityLabel="Arovia Home"
            >
              <View style={styles.heartLogoWrap}>
                <Ionicons name="medical" size={14} color="#FFFFFF" />
              </View>
              <Text
                style={[styles.brandText, { color: colors.text }]}
                numberOfLines={1}
              >
                Arovia
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Right: Language, Theme, Notifications, Auth ───────── */}
          <View style={styles.rightSection}>
            {/* Language Selector */}
            <LanguageSelector />

            {/* Dark / Light Mode Toggle */}
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              onPress={toggleTheme}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.75}
              accessibilityLabel="Toggle Theme"
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={isDark ? '#FBBF24' : '#475569'}
              />
            </TouchableOpacity>

            {/* Notifications Button */}
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              onPress={handleNotificationPress}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.75}
              accessibilityLabel="Notifications"
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>

            {/* Authentication State: Avatar OR Visitor Login/SignUp */}
            {isAuthenticated ? (
              <TouchableOpacity
                style={styles.userAvatarBtn}
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
                accessibilityLabel="View Profile"
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.visitorAuthGroup}>
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.85}
                  accessibilityLabel="Sign In"
                >
                  <Text style={styles.signInBtnText}>
                    {t('common.login') || 'Sign In'}
                  </Text>
                </TouchableOpacity>

                {showBothAuthButtons && (
                  <TouchableOpacity
                    style={[
                      styles.signUpBtn,
                      {
                        borderColor: Palette.primaryBlue,
                        backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                      },
                    ]}
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.85}
                    accessibilityLabel="Sign Up"
                  >
                    <Text
                      style={[
                        styles.signUpBtnText,
                        { color: Palette.primaryBlue },
                      ]}
                    >
                      {t('common.signUp') || 'Sign Up'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Slide-out Drawer */}
      <AroviaDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute={activeNav}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    borderBottomWidth: 1,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    minHeight: 46,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartLogoWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  userAvatarBtn: {
    padding: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  visitorAuthGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signInBtn: {
    backgroundColor: Palette.primaryBlue,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  signUpBtn: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
