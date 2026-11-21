import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Palette, Shadows } from '../constants/theme';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import { useTranslation } from 'react-i18next';

const PROFILE_IMAGE_KEY = '@arovia_profile_image';
const LEGACY_PROFILE_IMAGE_KEY = '@mediguide_profile_image';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { currentLangInfo, changeLanguage, supportedLanguages } = useLanguage();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localImage, setLocalImage] = useState(null);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    bio: '',
    city: '',
  });
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Load local profile image on mount
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_IMAGE_KEY).then((img) => {
      if (img) setLocalImage(img);
    });
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        mobile: user.mobile || '',
        bio: user.bio || '',
        city: user.location?.city || '',
      });
    }
  }, [user]);

  // ── Photo Actions ────────────────────────────────────────────
  const handlePickFromGallery = async () => {
    setPhotoMenuVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.permissionGallery'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalImage(uri);
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
    }
  };

  const handleTakePhoto = async () => {
    setPhotoMenuVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.permissionCamera'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalImage(uri);
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoMenuVisible(false);
    setLocalImage(null);
    await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
  };

  // ── Save Profile ─────────────────────────────────────────────
  const handleSave = async () => {
    setFormError('');
    setSaveSuccess('');

    // Validations
    if (!form.name.trim()) {
      setFormError(t('errors.fieldRequired') + ' (' + t('profile.fullName') + ')');
      return;
    }
    if (form.mobile && !/^[0-9]{10}$/.test(form.mobile.trim())) {
      setFormError(t('errors.invalidPhone'));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
      });
      setSaveSuccess(t('profile.updateSuccess'));
      setEditing(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setFormError(err?.response?.data?.message || t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  // ── Guest State ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AroviaHeader activeNav="Profile" />
        <View style={styles.guestWrap}>
          <Text style={styles.guestIcon}>👤</Text>
          <Text style={[styles.guestTitle, { color: colors.text }]}>{t('profile.loginToView')}</Text>
          <TouchableOpacity
            style={styles.loginNowBtn}
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { redirect: '/profile' },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.loginNowText}>{t('profile.loginBtn')}</Text>
          </TouchableOpacity>
        </View>
        <AroviaBottomNav activeTab="Profile" />
      </SafeAreaView>
    );
  }

  const avatarInitial = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AroviaHeader activeNav="Profile" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Page Title ─────────────────────── */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('profile.title')}</Text>

        {/* ── Profile Hero Card ───────────────── */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroRow}>
            {/* Avatar / Photo */}
            <TouchableOpacity onPress={() => setPhotoMenuVisible(true)} activeOpacity={0.85}>
              <View style={styles.avatarWrap}>
                {localImage ? (
                  <Image source={{ uri: localImage }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: Palette.primaryBlue }]}>
                    <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Profile Info */}
            <View style={styles.heroInfo}>
              {!editing ? (
                <>
                  <TouchableOpacity
                    style={styles.editProfileBtn}
                    onPress={() => { setEditing(true); setFormError(''); setSaveSuccess(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editProfileBtnText}>✏️ {t('profile.editProfile')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.heroName, { color: colors.text }]}>{user?.name}</Text>
                  <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                  {user?.mobile ? (
                    <Text style={[styles.heroPhone, { color: colors.textSecondary }]}>📱 {user.mobile}</Text>
                  ) : null}
                  {user?.location?.city ? (
                    <Text style={[styles.heroCity, { color: colors.textSecondary }]}>📍 {user.location.city}</Text>
                  ) : null}
                  {user?.bio ? (
                    <Text style={[styles.heroBio, { color: colors.textSecondary }]}>{user.bio}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.editingLabel, { color: Palette.primaryBlue }]}>
                  {t('profile.editProfile')}
                </Text>
              )}
            </View>
          </View>

          {/* Verified Badge */}
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedIcon}>🛡️</Text>
            <Text style={styles.verifiedText}>{t('profile.verifiedAccount')}</Text>
          </View>
        </View>

        {/* ── Edit Form ───────────────────────── */}
        {editing && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.editProfile')}</Text>

            {formError ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {formError}</Text></View> : null}
            {saveSuccess ? <View style={styles.successBox}><Text style={styles.successText}>✅ {saveSuccess}</Text></View> : null}

            {[
              { key: 'name', label: t('profile.fullName'), placeholder: t('profile.namePlaceholder'), keyboard: 'default' },
              { key: 'mobile', label: t('profile.phone'), placeholder: t('profile.phonePlaceholder'), keyboard: 'phone-pad' },
              { key: 'city', label: t('profile.city'), placeholder: t('profile.cityPlaceholder'), keyboard: 'default' },
            ].map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: colors.text, borderColor: colors.cardBorder }]}
                  value={form[field.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={field.keyboard}
                  autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                />
              </View>
            ))}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('profile.bio')}</Text>
              <TextInput
                style={[styles.textInput, styles.bioInput, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: colors.text, borderColor: colors.cardBorder }]}
                value={form.bio}
                onChangeText={(v) => setForm((prev) => ({ ...prev, bio: v }))}
                placeholder={t('profile.bioPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>{form.bio.length}/200</Text>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => { setEditing(false); setFormError(''); setSaveSuccess(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('profile.cancelEdit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile.saveChanges')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Personal Information ────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.personalInfo')}</Text>
          {[
            { label: t('profile.fullName'), value: user?.name },
            { label: t('profile.email'), value: user?.email },
            { label: t('profile.phone'), value: user?.mobile || '—' },
            { label: t('profile.city'), value: user?.location?.city || '—' },
            { label: t('profile.bio'), value: user?.bio || '—' },
          ].map((item) => (
            <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Account Information ─────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.accountInfo')}</Text>
          {[
            { label: t('profile.memberSince'), value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
            { label: t('profile.accountId'), value: user?._id ? `...${user._id.slice(-8)}` : '—' },
          ].map((item) => (
            <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Preferred Language ──────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.language')}</Text>
          <View style={styles.langRow}>
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === currentLangInfo.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: isSelected ? Palette.primaryBlue : (isDark ? '#0B132B' : '#F1F5F9'),
                      borderColor: isSelected ? Palette.primaryBlue : colors.cardBorder,
                    },
                  ]}
                  onPress={() => changeLanguage(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.langChipFlag}>{lang.flag}</Text>
                  <Text style={[styles.langChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                    {lang.nativeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Quick Links ─────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            { icon: '❤️', label: t('profile.savedHospitals'), route: '/favorites' },
            { icon: '🔔', label: t('profile.notifications'), route: '/notifications' },
            { icon: '⚙️', label: t('nav.settings'), route: '/settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, { borderBottomColor: colors.cardBorder }]}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.menuChevron, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ──────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.signOut'), style: 'destructive', onPress: () => logout() },
            ])
          }
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>🚪 {t('settings.logout')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Photo Menu Modal ─────────────────── */}
      <Modal visible={photoMenuVisible} transparent animationType="slide" onRequestClose={() => setPhotoMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPhotoMenuVisible(false)}>
          <View style={[styles.photoSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.photoSheetTitle, { color: colors.text }]}>{t('profile.profilePhoto')}</Text>
            {[
              { icon: '📷', label: t('profile.takePhoto'), action: handleTakePhoto },
              { icon: '🖼️', label: t('profile.chooseGallery'), action: handlePickFromGallery },
              { icon: '🗑️', label: t('profile.removePhoto'), action: handleRemovePhoto },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={[styles.photoOption, { borderBottomColor: colors.cardBorder }]} onPress={item.action} activeOpacity={0.75}>
                <Text style={styles.photoOptionIcon}>{item.icon}</Text>
                <Text style={[styles.photoOptionText, { color: item.label === t('profile.removePhoto') ? '#EF4444' : colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <AroviaBottomNav activeTab="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100, gap: 14 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  // Guest
  guestWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  guestIcon: { fontSize: 60 },
  guestTitle: { fontSize: 16, textAlign: 'center', fontWeight: '600' },
  loginNowBtn: { backgroundColor: Palette.primaryBlue, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 },
  loginNowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Hero Card
  heroCard: { borderRadius: 22, padding: 18, borderWidth: 1, ...Shadows.card, gap: 14 },
  heroRow: { flexDirection: 'row', gap: 16 },
  avatarWrap: { position: 'relative', width: 80, height: 80 },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarInitialText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  cameraIcon: { fontSize: 12 },
  heroInfo: { flex: 1, gap: 4 },
  editProfileBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6,
  },
  editProfileBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroName: { fontSize: 17, fontWeight: '800' },
  heroEmail: { fontSize: 12 },
  heroPhone: { fontSize: 12 },
  heroCity: { fontSize: 12 },
  heroBio: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  editingLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start',
  },
  verifiedIcon: { fontSize: 13 },
  verifiedText: { fontSize: 11, color: Palette.primaryBlue, fontWeight: '700' },

  // Cards
  card: { borderRadius: 20, padding: 18, borderWidth: 1, ...Shadows.soft },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },

  // Edit Form
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, marginBottom: 10 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10, marginBottom: 10 },
  successText: { color: '#065F46', fontSize: 13, fontWeight: '600' },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Palette.primaryBlue, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, flex: 1.5, textAlign: 'right' },

  // Language
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 6 },
  langChipFlag: { fontSize: 16 },
  langChipText: { fontSize: 13, fontWeight: '700' },

  // Menu rows
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600' },
  menuChevron: { fontSize: 20 },

  // Logout
  logoutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '800' },

  // Photo Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  photoSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  photoSheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  photoOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
  photoOptionIcon: { fontSize: 22 },
  photoOptionText: { fontSize: 15, fontWeight: '600' },
});
