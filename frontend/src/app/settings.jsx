import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Palette, Shadows } from '../constants/theme';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import { useTranslation } from 'react-i18next';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const { colors, isDark, toggleTheme, themeMode } = useAppTheme();
  const { currentLangInfo, changeLanguage, supportedLanguages } = useLanguage();
  const { t } = useTranslation();

  // Notification prefs from user object
  const [notifPrefs, setNotifPrefs] = useState({
    push: user?.notificationPrefs?.push ?? true,
    email: user?.notificationPrefs?.email ?? false,
    hospitalUpdates: user?.notificationPrefs?.hospitalUpdates ?? true,
    appointmentReminders: user?.notificationPrefs?.appointmentReminders ?? true,
    healthAlerts: user?.notificationPrefs?.healthAlerts ?? true,
  });

  const [privacyPrefs, setPrivacyPrefs] = useState({
    dataSharing: user?.privacyPrefs?.dataSharing ?? false,
    twoFactor: user?.privacyPrefs?.twoFactor ?? false,
  });

  // Password change
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwVisible, setPwVisible] = useState({ current: false, newPw: false, confirm: false });

  // Delete account
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Saving prefs
  const [savingPrefs, setSavingPrefs] = useState(false);

  const savePrefs = useCallback(async (notif, priv) => {
    if (!isAuthenticated) return;
    setSavingPrefs(true);
    try {
      await updateProfile({ notificationPrefs: notif, privacyPrefs: priv });
    } catch (e) {
      // fail silently for prefs
    } finally {
      setSavingPrefs(false);
    }
  }, [isAuthenticated, updateProfile]);

  const handleNotifToggle = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await savePrefs(updated, privacyPrefs);
  };

  const handlePrivacyToggle = async (key) => {
    if (key === 'twoFactor' && !privacyPrefs.twoFactor) {
      Alert.alert(
        t('settings.twoFactor'),
        'Two-factor authentication requires backend email verification setup. This toggle saves your preference but full 2FA requires email configuration.',
        [{ text: t('common.ok') }]
      );
    }
    const updated = { ...privacyPrefs, [key]: !privacyPrefs[key] };
    setPrivacyPrefs(updated);
    await savePrefs(notifPrefs, updated);
  };

  const handleLocationAccess = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      Alert.alert('✅', t('settings.locationGranted'));
    } else {
      Alert.alert(
        t('settings.locationAccess'),
        t('settings.locationDenied'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.openLocationSettings'), onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwError(t('errors.fieldRequired'));
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwError(t('settings.passwordShort'));
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError(t('settings.passwordMismatch'));
      return;
    }
    setPwSaving(true);
    try {
      const res = await changePassword(pwForm.current, pwForm.newPw);
      if (res.success) {
        setPwSuccess(t('settings.passwordChanged'));
        setPwForm({ current: '', newPw: '', confirm: '' });
        setTimeout(() => { setPwModal(false); setPwSuccess(''); }, 2000);
      } else {
        setPwError(res.message || t('errors.serverError'));
      }
    } catch (e) {
      setPwError(e?.response?.data?.message || t('errors.serverError'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm.');
      return;
    }
    if (!deletePassword) {
      setDeleteError(t('errors.fieldRequired') + ' (' + t('settings.currentPassword') + ')');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword);
      setDeleteModal(false);
      // AuthContext already navigates out
    } catch (e) {
      setDeleteError(e?.response?.data?.message || t('errors.serverError'));
    } finally {
      setDeleting(false);
    }
  };

  const SectionHeader = ({ title }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
  );

  const SettingRow = ({ icon, label, desc, right, onPress, borderBottom = true }) => (
    <TouchableOpacity
      style={[styles.settingRow, borderBottom && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {desc ? <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{desc}</Text> : null}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AroviaHeader activeNav="Settings" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('settings.title')}</Text>

        {/* ── NOTIFICATIONS ──────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SectionHeader title={t('settings.notifications')} />

          {[
            { key: 'push', icon: '🔔', label: t('settings.pushNotifications'), desc: t('settings.pushDesc') },
            { key: 'email', icon: '📧', label: t('settings.emailAlerts'), desc: t('settings.emailDesc') },
            { key: 'hospitalUpdates', icon: '🏥', label: t('settings.hospitalUpdates'), desc: null },
            { key: 'appointmentReminders', icon: '📅', label: t('settings.appointmentReminders'), desc: null },
            { key: 'healthAlerts', icon: '💊', label: t('settings.healthAlerts'), desc: null },
          ].map((item, idx, arr) => (
            <SettingRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              desc={item.desc}
              borderBottom={idx < arr.length - 1}
              right={
                <Switch
                  value={notifPrefs[item.key]}
                  onValueChange={() => handleNotifToggle(item.key)}
                  trackColor={{ false: '#CBD5E1', true: Palette.primaryBlue }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          ))}
        </View>

        {/* ── PRIVACY & SECURITY ─────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SectionHeader title={t('settings.privacy')} />

          <SettingRow
            icon="📍"
            label={t('settings.locationAccess')}
            desc={t('settings.locationDesc')}
            onPress={handleLocationAccess}
            right={<Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>}
          />

          <SettingRow
            icon="🔐"
            label={t('settings.twoFactor')}
            desc={t('settings.twoFactorDesc')}
            right={
              <Switch
                value={privacyPrefs.twoFactor}
                onValueChange={() => handlePrivacyToggle('twoFactor')}
                trackColor={{ false: '#CBD5E1', true: Palette.primaryBlue }}
                thumbColor="#FFFFFF"
              />
            }
          />

          <SettingRow
            icon="📊"
            label={t('settings.dataSharing')}
            desc={t('settings.dataSharingDesc')}
            right={
              <Switch
                value={privacyPrefs.dataSharing}
                onValueChange={() => handlePrivacyToggle('dataSharing')}
                trackColor={{ false: '#CBD5E1', true: Palette.primaryBlue }}
                thumbColor="#FFFFFF"
              />
            }
          />

          <SettingRow
            icon="📄"
            label={t('settings.privacyPolicy')}
            onPress={() => Linking.openURL('https://arovia.in/privacy')}
            right={<Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>}
          />

          <SettingRow
            icon="🔑"
            label={t('settings.changePassword')}
            borderBottom={false}
            onPress={() => {
              if (!isAuthenticated) {
                router.push({
                  pathname: '/(auth)/login',
                  params: { redirect: '/settings', message: 'Please sign in to change your password.' },
                });
                return;
              }
              setPwModal(true);
            }}
            right={<Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>}
          />
        </View>

        {/* ── APPEARANCE ─────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SectionHeader title={t('settings.appearance')} />

          <View style={styles.themeRow}>
            {[
              { mode: 'light', label: t('settings.lightMode'), icon: '☀️' },
              { mode: 'dark', label: t('settings.darkMode'), icon: '🌙' },
            ].map((item) => {
              const isActive = themeMode === item.mode;
              return (
                <TouchableOpacity
                  key={item.mode}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isActive ? Palette.primaryBlue : (isDark ? '#0B132B' : '#F1F5F9'),
                      borderColor: isActive ? Palette.primaryBlue : colors.cardBorder,
                    },
                  ]}
                  onPress={() => { if (!isActive) toggleTheme(); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.themeChipIcon}>{item.icon}</Text>
                  <Text style={[styles.themeChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── LANGUAGE ───────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SectionHeader title={t('settings.language')} />

          <View style={styles.themeRow}>
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === currentLangInfo.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isSelected ? Palette.primaryBlue : (isDark ? '#0B132B' : '#F1F5F9'),
                      borderColor: isSelected ? Palette.primaryBlue : colors.cardBorder,
                    },
                  ]}
                  onPress={() => changeLanguage(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.themeChipIcon}>{lang.flag}</Text>
                  <Text style={[styles.themeChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{lang.nativeLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── ABOUT ──────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SectionHeader title={t('settings.about')} />
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingIcon}>ℹ️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.version')}</Text>
            </View>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* ── DANGER ZONE ────────────────────── */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️ {t('settings.dangerZone')}</Text>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.signOut'), style: 'destructive', onPress: () => logout() },
              ])
            }
            activeOpacity={0.85}
          >
            <Text style={styles.dangerBtnIcon}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerBtnLabel}>{t('settings.logout')}</Text>
              <Text style={styles.dangerBtnDesc}>{t('settings.logoutDesc')}</Text>
            </View>
            <Text style={styles.dangerChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.dangerDivider} />

          <TouchableOpacity
            style={[styles.dangerBtn, { borderColor: '#7F1D1D' }]}
            onPress={() => {
              if (!isAuthenticated) {
                router.push({
                  pathname: '/(auth)/login',
                  params: { redirect: '/settings', message: 'Please sign in to manage account settings.' },
                });
                return;
              }
              setDeleteModal(true);
              setDeleteConfirmText('');
              setDeletePassword('');
              setDeleteError('');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.dangerBtnIcon}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerBtnLabel, { color: '#EF4444' }]}>{t('settings.deleteAccount')}</Text>
              <Text style={styles.dangerBtnDesc}>{t('settings.deleteAccountDesc')}</Text>
            </View>
            <Text style={styles.dangerChevron}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Change Password Modal ───────────── */}
      <Modal visible={pwModal} transparent animationType="slide" onRequestClose={() => setPwModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => {}}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🔑 {t('settings.changePassword')}</Text>

            {pwError ? <View style={styles.errorBox}><Text style={styles.errorTxt}>⚠️ {pwError}</Text></View> : null}
            {pwSuccess ? <View style={styles.successBox}><Text style={styles.successTxt}>✅ {pwSuccess}</Text></View> : null}

            {[
              { key: 'current', label: t('settings.currentPassword'), vis: 'current' },
              { key: 'newPw', label: t('settings.newPassword'), vis: 'newPw' },
              { key: 'confirm', label: t('settings.confirmPassword'), vis: 'confirm' },
            ].map((f) => (
              <View key={f.key} style={styles.pwField}>
                <Text style={[styles.pwLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                <View style={[styles.pwInputRow, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                  <TextInput
                    style={[styles.pwInput, { color: colors.text }]}
                    value={pwForm[f.key]}
                    onChangeText={(v) => setPwForm((p) => ({ ...p, [f.key]: v }))}
                    secureTextEntry={!pwVisible[f.vis]}
                    placeholder="••••••"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => setPwVisible((p) => ({ ...p, [f.vis]: !p[f.vis] }))}>
                    <Text style={{ fontSize: 16 }}>{pwVisible[f.vis] ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]} onPress={() => setPwModal(false)} activeOpacity={0.8}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, pwSaving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={pwSaving} activeOpacity={0.85}>
                {pwSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSaveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Delete Account Modal ────────────── */}
      <Modal visible={deleteModal} transparent animationType="slide" onRequestClose={() => setDeleteModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => {}}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>⚠️ {t('settings.deleteAccount')}</Text>
            <Text style={[styles.deleteWarning, { color: colors.text }]}>{t('settings.deleteConfirmMsg')}</Text>

            {deleteError ? <View style={styles.errorBox}><Text style={styles.errorTxt}>⚠️ {deleteError}</Text></View> : null}

            <View style={styles.pwField}>
              <Text style={[styles.pwLabel, { color: colors.textSecondary }]}>{t('settings.deleteTypeSafety')}</Text>
              <TextInput
                style={[styles.textInputDel, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: '#EF4444', borderColor: '#EF4444' }]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={t('settings.deleteTypeHint')}
                placeholderTextColor="#FCA5A5"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.pwField}>
              <Text style={[styles.pwLabel, { color: colors.textSecondary }]}>{t('settings.currentPassword')}</Text>
              <TextInput
                style={[styles.textInputDel, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: colors.text, borderColor: colors.cardBorder }]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]} onPress={() => setDeleteModal(false)} activeOpacity={0.8}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && { opacity: 0.6 }, deleteConfirmText !== 'DELETE' && { opacity: 0.4 }]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                activeOpacity={0.85}
              >
                {deleting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSaveText}>{t('settings.deleteAccount')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <AroviaBottomNav activeTab="Settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100, gap: 14 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  card: { borderRadius: 20, padding: 16, borderWidth: 1, ...Shadows.soft },
  sectionHeader: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },

  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  settingIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  chevron: { fontSize: 22, fontWeight: '300' },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, gap: 6 },
  themeChipIcon: { fontSize: 16 },
  themeChipText: { fontSize: 13, fontWeight: '700' },

  versionText: { fontSize: 13, fontWeight: '600' },

  // Danger Zone
  dangerCard: { borderRadius: 20, padding: 16, borderWidth: 2, borderColor: '#EF4444', backgroundColor: '#FFF5F5', gap: 4 },
  dangerTitle: { fontSize: 14, fontWeight: '800', color: '#DC2626', marginBottom: 10 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderRadius: 14, paddingHorizontal: 4 },
  dangerBtnIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  dangerBtnLabel: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  dangerBtnDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  dangerChevron: { fontSize: 22, color: '#DC2626' },
  dangerDivider: { height: 1, backgroundColor: '#FCA5A5', marginVertical: 4 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  deleteWarning: { fontSize: 13, lineHeight: 19 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10 },
  errorTxt: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10 },
  successTxt: { color: '#065F46', fontSize: 13, fontWeight: '600' },

  pwField: { gap: 6 },
  pwLabel: { fontSize: 12, fontWeight: '600' },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  pwInput: { flex: 1, fontSize: 14 },
  textInputDel: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '700' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: Palette.primaryBlue, alignItems: 'center' },
  modalSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
});
