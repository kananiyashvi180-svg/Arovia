import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette, Shadows } from '../constants/theme';
import AroviaBottomNav from '../components/AroviaBottomNav';
import { getHospitalById, toggleFavoriteHospital, checkIsFavorite } from '../services/medicalService';
import { isValidHospitalPhone, cleanDialerPhone } from '../utils/phoneValidator';

export default function HospitalDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [hospital, setHospital] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: `/hospital-details?id=${id}`,
          message: 'Please sign in to view complete hospital details.',
        },
      });
    }
  }, [isAuthenticated, authLoading, id]);

  useEffect(() => {
    if (id) {
      loadHospitalDetails(id);
    }
  }, [id]);

  const loadHospitalDetails = async (hospId) => {
    try {
      setLoading(true);
      const [hospRes, favRes] = await Promise.all([
        getHospitalById(hospId),
        checkIsFavorite(hospId).catch(() => ({ isFavorite: false })),
      ]);

      if (hospRes?.success && hospRes?.data) {
        setHospital(hospRes.data);
      }
      if (favRes?.isFavorite !== undefined) {
        setIsFav(favRes.isFavorite);
      }
    } catch (err) {
      console.warn('Error loading hospital details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const next = !isFav;
      setIsFav(next);
      await toggleFavoriteHospital(id, isFav);
    } catch (e) {
      // Revert if error
      setIsFav(!isFav);
    }
  };

  const openPhone = (num) => {
    const cleaned = cleanDialerPhone(num);
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`);
    } else {
      Alert.alert(
        'Phone Number Unavailable',
        'A verified direct contact number is not available for this healthcare facility. Please verify with local directory or emergency services.'
      );
    }
  };

  const openDirections = (lat, lng, name) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.primaryBlue} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Arovia Hospital Record...</Text>
      </SafeAreaView>
    );
  }

  if (!hospital) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Hospital record not found.</Text>
        <TouchableOpacity style={styles.backButtonSimple} onPress={() => router.back()}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>← Return</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.navBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>Hospital Profile</Text>
        <TouchableOpacity style={styles.navFavBtn} onPress={handleToggleFavorite} activeOpacity={0.8}>
          <Text style={styles.navFavIcon}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <Image source={{ uri: hospital.image }} style={styles.bannerImage} resizeMode="cover" />

        {/* Primary Header Card */}
        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.hospitalName, { color: colors.text }]}>{hospital.name}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingNum}>{hospital.rating}</Text>
              <Text style={styles.reviewCount}>({hospital.reviewsCount})</Text>
            </View>
          </View>

          <Text style={[styles.fullAddress, { color: colors.textSecondary }]}>
            📍 {hospital.address}
          </Text>

          {/* Emergency Status Pill */}
          <View style={styles.statusRow}>
            {hospital.is24x7Emergency ? (
              <View style={styles.emergencyPill}>
                <Text style={styles.emergencyText}>🚨 24x7 Emergency Care Active</Text>
              </View>
            ) : null}
            {hospital.ayushmanBharatAccepted ? (
              <View style={styles.govtPill}>
                <Text style={styles.govtText}>🛡️ Ayushman Bharat Accepted</Text>
              </View>
            ) : null}
          </View>

          {/* Action Call & Navigation Buttons */}
          <View style={styles.actionButtonsRow}>
            {hospital.isPhoneVerified && isValidHospitalPhone(hospital.phone || hospital.contactNumber) ? (
              <TouchableOpacity
                style={styles.callPrimaryBtn}
                onPress={() => openPhone(hospital.phone || hospital.contactNumber)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnIcon}>📞</Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={styles.callPrimaryText}>Call Hospital</Text>
                  <Text style={styles.callPrimarySubText}>✓ {hospital.phone || hospital.contactNumber}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.callPrimaryBtn, { backgroundColor: '#64748B', opacity: 0.75 }]}>
                <Text style={styles.actionBtnIcon}>📞</Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={styles.callPrimaryText}>Unavailable</Text>
                  <Text style={styles.callPrimarySubText}>No verified number</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.mapPrimaryBtn}
              onPress={() => openDirections(hospital.location?.latitude || 19.07, hospital.location?.longitude || 72.87, hospital.name)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>🧭</Text>
              <Text style={styles.mapPrimaryText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Treatment Cost Estimates ───────────────────────────── */}
        {hospital.treatments && hospital.treatments.length > 0 ? (
          <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Treatment & Procedure Estimates</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Estimated costs verified for this center. Actual charges may vary by room type and complications.
            </Text>

            <View style={styles.treatmentsList}>
              {hospital.treatments.map((t, idx) => (
                <View key={idx} style={[styles.treatmentRow, { borderBottomColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.treatmentName, { color: colors.text }]}>{t.treatmentName}</Text>
                    <Text style={[styles.recoveryText, { color: colors.textSecondary }]}>
                      Recovery: {t.recoveryDays}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.treatmentPrice}>
                      ₹{t.minCost.toLocaleString('en-IN')} - ₹{t.maxCost.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.treatmentEstimateLabel}>Avg. Package</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Specialties Available ──────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical Specialties</Text>
          <View style={styles.specialtiesGrid}>
            {hospital.specialties?.map((sp) => (
              <View key={sp} style={[styles.specPill, { backgroundColor: isDark ? '#0B132B' : '#EFF6FF' }]}>
                <Text style={styles.specPillText}>✓ {sp}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Facilities & Amenities ─────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Facilities & Technology</Text>
          <View style={styles.facilitiesGrid}>
            {hospital.facilities?.map((f) => (
              <View key={f} style={[styles.facilityPill, { backgroundColor: isDark ? '#0B132B' : '#F1F5F9' }]}>
                <Text style={[styles.facilityText, { color: colors.text }]}>🏥 {f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Emergency Contact Card ──────────────────────────────── */}
        <View style={styles.emergencyCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyCardTitle}>🚨 Emergency Helpline</Text>
            <Text style={styles.emergencyCardSub}>Available 24x7 — Gujarat Ambulance Service</Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyCallBtn}
            onPress={() => Linking.openURL('tel:108')}
            activeOpacity={0.85}
          >
            <Text style={styles.emergencyCallBtnText}>📞 108</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <AroviaBottomNav activeTab="Nearby Hospitals" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1E3D',
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  navFavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navFavIcon: {
    fontSize: 18,
  },
  scroll: {
    paddingBottom: 100,
    gap: 14,
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  contentCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    ...Shadows.card,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  ratingStar: {
    color: '#D97706',
    fontSize: 12,
  },
  ratingNum: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewCount: {
    color: '#92400E',
    fontSize: 11,
  },
  fullAddress: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  statusRow: {
    gap: 6,
    marginBottom: 16,
  },
  emergencyPill: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emergencyText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  govtPill: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  govtText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  callPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  callPrimarySubText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  mapPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  mapPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  treatmentsList: {
    gap: 10,
  },
  treatmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  treatmentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  recoveryText: {
    fontSize: 11,
    marginTop: 2,
  },
  treatmentPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primaryBlue,
  },
  treatmentEstimateLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  specPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  specPillText: {
    fontSize: 12,
    color: Palette.primaryBlue,
    fontWeight: '700',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  facilityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  facilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  backButtonSimple: {
    marginTop: 14,
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 10,
  },
  emergencyCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emergencyCardSub: {
    color: '#FCA5A5',
    fontSize: 11,
    marginTop: 2,
  },
  emergencyCallBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emergencyCallBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

