import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function AroviaBottomNav({ activeTab = 'Home' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  // Exactly four main bottom tabs    
  const tabs = [
    {
      name: 'Home',
      route: '/',
      activeIcon: 'home',
      inactiveIcon: 'home-outline',
      labelKey: 'nav.home',
      requiresAuth: false,
    },
    {
      name: 'Nearby Hospitals',
      route: '/hospitals',
      activeIcon: 'business',
      inactiveIcon: 'business-outline',
      labelKey: 'nav.nearbyHospitals',
      requiresAuth: true,
      authPrompt: 'Please sign in to discover nearby hospitals.',
    },
    {
      name: 'Settings',
      route: '/settings',
      activeIcon: 'settings',
      inactiveIcon: 'settings-outline',
      labelKey: 'nav.settings',
      requiresAuth: false,
    },
    {
      name: 'Profile',
      route: '/profile',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
      labelKey: 'nav.profile',
      requiresAuth: true,
      authPrompt: 'Please sign in to view your profile.',
    },
  ];

  const handlePress = (tab) => {
    if (tab.requiresAuth && !isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: {
          redirect: tab.route,
          message: tab.authPrompt,
        },
      });
      return;
    }
    router.push(tab.route);
  };

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.name ||
          (activeTab === 'Dashboard' && tab.name === 'Home');
        const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;
        const iconColor = isActive ? Palette.primaryBlue : colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabBtn}
            onPress={() => handlePress(tab)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t(tab.labelKey)}
          >
            {/* Subtle top indicator bar */}
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: isActive ? Palette.primaryBlue : 'transparent' },
              ]}
            />

            {/* Icon - Clean vector icon */}
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={21} color={iconColor} />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.label,
                {
                  color: iconColor,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  activeIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginBottom: 4,
  },
  iconContainer: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
});
