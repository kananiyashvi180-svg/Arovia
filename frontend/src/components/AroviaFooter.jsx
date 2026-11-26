import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function AroviaFooter() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  const handleCallEmergency = () => {
    Alert.alert(
      t('home.emergencyConfirmTitle') || 'Emergency Call 108',
      t('home.emergencyConfirmMsg') || 'Are you sure you want to call Gujarat Emergency Ambulance (108) now?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('home.call108Now') || 'Call 108',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:108'),
        },
      ]
    );
  };

  const handleProtectedNavigate = (path, msg) => {
    if (!isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirect: path, message: msg || 'Please sign in to access this feature.' },
      });
      return;
    }
    router.push(path);
  };

  const handleSpecialtyFilter = (spec) => {
    handleProtectedNavigate(`/hospitals?specialty=${encodeURIComponent(spec)}`, `Please sign in to explore ${spec} hospitals.`);
  };

  return (
    <View style={[styles.footerContainer, { backgroundColor: isDark ? '#0A0F1D' : '#0B132B' }]}>
      {/* Brand & Description */}
      <View style={styles.brandSection}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.heartIcon}>💙</Text>
          </View>
          <Text style={styles.brandName}>{t('common.appName')}</Text>
        </View>
        <Text style={styles.brandDesc}>
          {t('footer.description')}
        </Text>
      </View>

      {/* Emergency Call Action Card */}
      <View style={styles.emergencyCard}>
        <View>
          <Text style={styles.emergencyLabel}>{t('footer.emergencyHelpline')}</Text>
          <Text style={styles.emergencyNumber}>108</Text>
        </View>
        <TouchableOpacity style={styles.emergencyBtn} onPress={handleCallEmergency}>
          <Text style={styles.emergencyBtnText}>📞 {t('home.call108Now')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridSection}>
        {/* Quick Links Column */}
        <View style={styles.linkColumn}>
          <Text style={styles.columnHeader}>{t('footer.quickLinks')}</Text>
          <TouchableOpacity onPress={() => handleProtectedNavigate('/hospitals', 'Please sign in to find hospitals.')}>
            <Text style={styles.linkItem}>{t('footer.findHospitals')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleProtectedNavigate('/live-map', 'Please sign in to view map area.')}>
            <Text style={styles.linkItem}>{t('nav.mapView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleProtectedNavigate('/symptoms', 'Please sign in to check symptoms.')}>
            <Text style={styles.linkItem}>{t('nav.symptomsChecker')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleProtectedNavigate('/favorites', 'Please sign in to view saved hospitals.')}>
            <Text style={styles.linkItem}>{t('nav.savedHospitals')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleProtectedNavigate('/profile', 'Please sign in to view profile.')}>
            <Text style={styles.linkItem}>{t('nav.profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Specializations Column */}
        <View style={styles.linkColumn}>
          <Text style={styles.columnHeader}>{t('home.specializations')}</Text>
          {[
            { key: 'cardiology', label: t('hospitals.categories.cardiology'), api: 'Cardiology' },
            { key: 'neurology', label: t('hospitals.categories.neurology'), api: 'Neurology' },
            { key: 'orthopedics', label: t('hospitals.categories.orthopedics'), api: 'Orthopedics' },
            { key: 'pediatrics', label: t('hospitals.categories.pediatrics'), api: 'Pediatrics' },
            { key: 'cancer', label: t('hospitals.categories.cancer'), api: 'Cancer Care' },
            { key: 'general', label: t('hospitals.categories.general'), api: 'General Medicine' },
          ].map((spec) => (
            <TouchableOpacity key={spec.key} onPress={() => handleSpecialtyFilter(spec.api)}>
              <Text style={styles.linkItem}>{spec.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contact Information (Gujarat verified HQ) */}
      <View style={styles.contactSection}>
        <Text style={styles.columnHeader}>{t('footer.contactUs')}</Text>
        <Text style={styles.contactItem}>📍 Ahmedabad, Gujarat, India 380001</Text>
        <Text style={styles.contactItem}>📞 +91 98765 43210</Text>
        <Text style={styles.contactItem}>✉️ support@arovia.in</Text>
      </View>

      <View style={styles.divider} />

      {/* Legal & Copyright */}
      <View style={styles.legalSection}>
        <Text style={styles.copyrightText}>{t('footer.rightsReserved')}</Text>
        <View style={styles.legalLinksRow}>
          <TouchableOpacity>
            <Text style={styles.legalLink}>{t('nav.privacyPolicy')}</Text>
          </TouchableOpacity>
          <Text style={styles.bullet}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>{t('footer.termsOfService')}</Text>
          </TouchableOpacity>
          <Text style={styles.bullet}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>{t('footer.cookiePolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    padding: 24,
    paddingBottom: 36,
  },
  brandSection: {
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 18,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  emergencyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emergencyLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  emergencyNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
  },
  emergencyBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emergencyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  gridSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  linkColumn: {
    flex: 1,
  },
  columnHeader: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  linkItem: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
  },
  contactSection: {
    marginBottom: 20,
  },
  contactItem: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 16,
  },
  legalSection: {
    alignItems: 'center',
  },
  copyrightText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 8,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    color: '#94A3B8',
    fontSize: 11,
  },
  bullet: {
    color: '#475569',
    fontSize: 11,
  },
});

