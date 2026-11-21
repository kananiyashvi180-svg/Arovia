import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  Linking,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette, Shadows } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function AroviaDrawer({ visible, onClose, activeRoute = 'Home' }) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { t } = useTranslation();

  const [activeModal, setActiveModal] = useState(null); // 'help' | 'about' | 'privacy' | 'terms' | null

  // Slide-in animation from left
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -320,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (path, requiresAuth = false, authPrompt = '') => {
    onClose();
    if (requiresAuth && !isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: {
          redirect: path,
          message: authPrompt || 'Please sign in to access this feature.',
        },
      });
      return;
    }
    router.push(path);
  };

  const handleLogout = () => {
    onClose();
    Alert.alert(
      t('settings.logoutConfirmTitle') || 'Sign Out',
      t('settings.logoutConfirmMsg') || 'Are you sure you want to log out of Arovia?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.signOut') || 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  // Exactly 8 items specified by prompt:
  // 1. Map Area View
  // 2. Saved Hospitals
  // 3. Notifications
  // 4. Help & Support
  // 5. About Arovia
  // 6. Privacy Policy
  // 7. Terms & Conditions
  // 8. Logout (authenticated users only)
  const menuItems = [
    {
      id: 'map',
      title: t('nav.mapView') || 'Map Area View',
      icon: '🗺️',
      action: () => handleNavigate('/live-map', true, 'Please sign in to access Map Area View.'),
    },
    {
      id: 'saved',
      title: t('nav.savedHospitals') || 'Saved Hospitals',
      icon: '❤️',
      action: () => handleNavigate('/favorites', true, 'Please sign in to view your saved hospitals.'),
    },
    {
      id: 'notifications',
      title: t('nav.notifications') || 'Notifications',
      icon: '🔔',
      action: () => handleNavigate('/notifications', true, 'Please sign in to view notifications.'),
    },
    {
      id: 'help',
      title: t('nav.helpSupport') || 'Help & Support',
      icon: '🛟',
      action: () => setActiveModal('help'),
    },
    {
      id: 'about',
      title: t('nav.about') || 'About Arovia',
      icon: 'ℹ️',
      action: () => setActiveModal('about'),
    },
    {
      id: 'privacy',
      title: t('nav.privacyPolicy') || 'Privacy Policy',
      icon: '🛡️',
      action: () => setActiveModal('privacy'),
    },
    {
      id: 'terms',
      title: t('nav.terms') || 'Terms & Conditions',
      icon: '📋',
      action: () => setActiveModal('terms'),
    },
  ];

  return (
    <>
      <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          {/* Backdrop with fade animation */}
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          {/* Slide-out Panel */}
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                backgroundColor: isDark ? '#0B132B' : '#FFFFFF',
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <SafeAreaView style={styles.safeContainer}>
              {/* ── Drawer Header: Brand + Close ─────────── */}
              <View
                style={[
                  styles.drawerHeader,
                  { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' },
                ]}
              >
                <View style={styles.brandRow}>
                  <View style={styles.heartLogoWrap}>
                    <Text style={styles.heartIcon}>💙</Text>
                  </View>
                  <Text style={[styles.brandTitle, { color: colors.text }]}>
                    Arovia
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                  <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* ── User Profile / Welcome Section ──────── */}
              <View
                style={[
                  styles.userSection,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {isAuthenticated ? (
                  <View style={styles.userInfoRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.welcomeGreeting, { color: Palette.primaryBlue }]}>
                        {t('nav.welcomeBack') || 'Welcome back'}
                      </Text>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {user?.name || 'Healthcare Patient'}
                      </Text>
                      <Text
                        style={[styles.userEmail, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {user?.email || 'patient@arovia.in'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.guestInfoBlock}>
                    <View style={styles.guestTopRow}>
                      <View style={[styles.avatarCircle, { backgroundColor: '#94A3B8' }]}>
                        <Text style={styles.avatarInitial}>👤</Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                          {t('nav.guestUser') || 'Guest Visitor'}
                        </Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                          Sign in for full access
                        </Text>
                      </View>
                    </View>

                    {/* Prominent Login & Sign Up for visitors */}
                    <View style={styles.guestBtnRow}>
                      <TouchableOpacity
                        style={[styles.guestLoginBtn, { backgroundColor: Palette.primaryBlue }]}
                        onPress={() => {
                          onClose();
                          router.push('/(auth)/login');
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.guestLoginText}>
                          {t('common.login') || 'Log In'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.guestSignupBtn,
                          {
                            borderColor: Palette.primaryBlue,
                            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          },
                        ]}
                        onPress={() => {
                          onClose();
                          router.push('/(auth)/register');
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.guestSignupText, { color: Palette.primaryBlue }]}>
                          {t('common.signUp') || 'Sign Up'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* ── 8 Dedicated Drawer Items ────────────── */}
              <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.navItem}
                    onPress={item.action}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navIcon}>{item.icon}</Text>
                    <Text style={[styles.navText, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                ))}

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                  ]}
                />

                {/* Quick Theme Switch */}
                <TouchableOpacity style={styles.navItem} onPress={toggleTheme} activeOpacity={0.7}>
                  <Text style={styles.navIcon}>{isDark ? '☀️' : '🌙'}</Text>
                  <Text style={[styles.navText, { color: colors.text }]}>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </TouchableOpacity>

                {/* Item 8: Logout (Only for Authenticated users) */}
                {isAuthenticated && (
                  <>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                      ]}
                    />
                    <TouchableOpacity
                      style={styles.logoutNavItem}
                      onPress={handleLogout}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.navIcon}>🚪</Text>
                      <Text style={styles.logoutNavText}>
                        {t('common.logout') || 'Log Out'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>

              {/* Emergency Banner at bottom of drawer */}
              <View
                style={[
                  styles.drawerEmergencyFooter,
                  { borderTopColor: isDark ? '#1E293B' : '#E2E8F0' },
                ]}
              >
                <TouchableOpacity
                  style={styles.emergencyPill}
                  onPress={() => {
                    Alert.alert(
                      'Emergency Helpline',
                      'Call Gujarat Emergency Ambulance (108) now?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Call 108', onPress: () => Linking.openURL('tel:108') },
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emergencyPillIcon}>🚨</Text>
                  <Text style={styles.emergencyPillText}>Emergency? Call 108</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Help & Support Modal ────────────────────────────── */}
      <Modal visible={activeModal === 'help'} transparent animationType="slide">
        <Pressable style={styles.infoModalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={[styles.infoSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <Text style={[styles.infoSheetTitle, { color: colors.text }]}>🛟 Help & Support</Text>
            <Text style={[styles.infoSheetBody, { color: colors.textSecondary }]}>
              Arovia helps you navigate healthcare facilities across Gujarat with verified hospital details and AI symptom guidance.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>🚨 Emergency Medical Helpline</Text>
              <Text style={styles.infoBoxDesc}>Toll-Free 24x7 Ambulance across Gujarat</Text>
              <TouchableOpacity
                style={styles.call108Btn}
                onPress={() => Linking.openURL('tel:108')}
              >
                <Text style={styles.call108Text}>📞 Call 108 Now</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>✉️ Contact Support</Text>
              <Text style={styles.infoBoxDesc}>Email: support@arovia.in</Text>
              <Text style={styles.infoBoxDesc}>Hours: Monday – Saturday, 9 AM – 6 PM</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeSheetBtn, { backgroundColor: Palette.primaryBlue }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeSheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── About Arovia Modal ───────────────────────────── */}
      <Modal visible={activeModal === 'about'} transparent animationType="slide">
        <Pressable style={styles.infoModalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={[styles.infoSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <Text style={[styles.infoSheetTitle, { color: colors.text }]}>ℹ️ About Arovia</Text>
            <Text style={[styles.infoSheetBody, { color: colors.textSecondary }]}>
              Arovia is an AI-powered healthcare navigator designed for Gujarat, India. Our goal is to make healthcare discovery fast, transparent, and accessible to everyone.
            </Text>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletIcon}>🏥</Text>
              <Text style={[styles.infoBulletText, { color: colors.text }]}>
                Verified hospitals across all 33 Gujarat districts from Government LGD records.
              </Text>
            </View>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletIcon}>🩺</Text>
              <Text style={[styles.infoBulletText, { color: colors.text }]}>
                AI Clinical Urgency assessment with triage recommendations.
              </Text>
            </View>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletIcon}>🌐</Text>
              <Text style={[styles.infoBulletText, { color: colors.text }]}>
                Full trilingual support in English, Gujarati (ગુજરાતી), and Hindi (हिन्दी).
              </Text>
            </View>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              Version 1.0.0 (Expo SDK 58)
            </Text>
            <TouchableOpacity
              style={[styles.closeSheetBtn, { backgroundColor: Palette.primaryBlue }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeSheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Privacy Policy Modal ────────────────────────────── */}
      <Modal visible={activeModal === 'privacy'} transparent animationType="slide">
        <Pressable style={styles.infoModalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={[styles.infoSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <Text style={[styles.infoSheetTitle, { color: colors.text }]}>🛡️ Privacy Policy</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <Text style={[styles.infoSheetBody, { color: colors.textSecondary }]}>
                1. Location Privacy: Arovia accesses GPS location only with your explicit foreground permission to compute distances to nearby hospitals. We never track your location in the background.{'\n\n'}
                2. Medical Data: Any symptoms submitted to the AI Symptom Navigator are used solely for immediate educational triage and are never shared with third-party advertisers.{'\n\n'}
                3. Account Security: Your passwords are encrypted with bcrypt and JWT authentication tokens are stored securely on your device using AsyncStorage.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeSheetBtn, { backgroundColor: Palette.primaryBlue, marginTop: 12 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeSheetBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Terms & Conditions Modal ────────────────────────── */}
      <Modal visible={activeModal === 'terms'} transparent animationType="slide">
        <Pressable style={styles.infoModalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={[styles.infoSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <Text style={[styles.infoSheetTitle, { color: colors.text }]}>📋 Terms & Conditions</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <Text style={[styles.infoSheetBody, { color: colors.textSecondary }]}>
                1. Educational Healthcare Guidance: Arovia provides informational guidance only. AI triage results do NOT constitute a medical diagnosis or medical advice.{'\n\n'}
                2. Emergencies: In case of life-threatening emergencies, cardiac symptoms, or acute trauma, users must immediately dial 108 or proceed to the nearest emergency room.{'\n\n'}
                3. Hospital Listings: Hospital timings, fee estimates, and bed availability are based on official directories and may vary. Please contact the hospital directly before traveling.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeSheetBtn, { backgroundColor: Palette.primaryBlue, marginTop: 12 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeSheetBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    width: '80%',
    maxWidth: 310,
    height: '100%',
    ...Shadows.card,
  },
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartLogoWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userSection: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestInfoBlock: {
    gap: 10,
  },
  guestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guestLoginBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestLoginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  guestSignupBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  guestSignupText: {
    fontWeight: '700',
    fontSize: 13,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  logoutNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  logoutNavText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  drawerEmergencyFooter: {
    padding: 12,
    borderTopWidth: 1,
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emergencyPillIcon: {
    fontSize: 15,
  },
  emergencyPillText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },

  // Info Modals
  infoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    ...Shadows.card,
  },
  infoSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoSheetBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  infoBoxDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  call108Btn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  call108Text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  infoBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoBulletIcon: {
    fontSize: 16,
  },
  infoBulletText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  versionText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  closeSheetBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeSheetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
