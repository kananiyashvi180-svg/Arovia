import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { Palette, Shadows } from '../constants/theme';
import { getHospitals, getNearbyHospitals, reverseGeocodeBackend } from '../services/medicalService';
import { GUJARAT_CITY_OPTIONS } from '../utils/locationService';
import LocationSelectorModal from '../components/LocationSelectorModal';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import AroviaFooter from '../components/AroviaFooter';
import { useTranslation } from 'react-i18next';

const MANUAL_CITY_KEY = '@arovia_manual_city';
const LEGACY_MANUAL_CITY_KEY = '@mediguide_manual_city';

const SPECIALIZATIONS = [
  { id: '1', name: 'Cardiology', labelKey: 'hospitals.categories.cardiology', icon: '❤️' },
  { id: '2', name: 'Neurology', labelKey: 'hospitals.categories.neurology', icon: '🧠' },
  { id: '3', name: 'Orthopedics', labelKey: 'hospitals.categories.orthopedics', icon: '🦴' },
  { id: '4', name: 'Pediatrics', labelKey: 'hospitals.categories.pediatrics', icon: '👶' },
  { id: '5', name: 'Cancer Care', labelKey: 'hospitals.categories.cancer', icon: '🎗️' },
  { id: '6', name: 'General Medicine', labelKey: 'hospitals.categories.general', icon: '🩺' },
  { id: '7', name: 'Dermatology', labelKey: 'hospitals.categories.dermatology', icon: '🔬' },
  { id: '8', name: 'Gynecology', labelKey: 'hospitals.categories.gynecology', icon: '🌸' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  // Location from Global LocationContext (Single Source of Truth)
  const {
    coords,
    locationDetails,
    loading: locLoading,
    error: locError,
    gpsAccuracy,
    isGPSLocked,
    refreshLocation,
    setManualLocation,
  } = useLocation();

  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Hospital List Data for public preview
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Re-fetch hospitals whenever true GPS coordinates change
  useEffect(() => {
    fetchHospitals(coords);
  }, [coords?.latitude, coords?.longitude]);

  const handleRefreshOrChangeLocation = async () => {
    try {
      const res = await refreshLocation(true);
      if (res?.coords) {
        fetchHospitals(res.coords);
      } else {
        setCityModalVisible(true);
      }
    } catch (e) {
      setCityModalVisible(true);
    }
  };

  const handleSelectCity = async (selectedItem) => {
    const cityName = typeof selectedItem === 'string' ? selectedItem : selectedItem.name;
    setCityModalVisible(false);

    try {
      const matchedOption = GUJARAT_CITY_OPTIONS.find((c) => c.name === cityName || c.cityName === cityName);
      await setManualLocation(
        matchedOption?.cityName || cityName,
        matchedOption?.districtName || 'Gujarat'
      );
    } catch (e) {
      console.warn('City select notice:', e.message);
    }
  };

  const fetchHospitals = async (explicitCoords = null) => {
    try {
      setLoadingHospitals(true);
      const activeCoords = explicitCoords || coords;
      let res = null;
      if (activeCoords?.latitude && activeCoords?.longitude) {
        res = await getNearbyHospitals({
          latitude: activeCoords.latitude,
          longitude: activeCoords.longitude,
          radiusKm: 35,
        });
      } else {
        res = await getHospitals();
      }

      if (res && res.data) {
        setHospitals(res.data);
      }
    } catch (err) {
      try {
        const res = await getHospitals();
        if (res && res.data) {
          setHospitals(res.data);
        }
      } catch (fallbackErr) {
        console.warn('Failed to load hospitals:', fallbackErr.message);
      }
    } finally {
      setLoadingHospitals(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHospitals();
  };

  // ── Authentication Protection Handler ────────────────────────
  // When an unauthenticated visitor clicks any protected feature,
  // redirect them to the Login screen with the original target saved.
  const executeProtectedAction = (destination, promptMessage) => {
    if (!isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: {
          redirect: destination,
          message: promptMessage || 'Please sign in to access this feature.',
        },
      });
      return;
    }
    router.push(destination);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    const destination = q ? `/hospitals?search=${encodeURIComponent(q)}` : '/hospitals';
    executeProtectedAction(destination, 'Please sign in to search and discover nearby hospitals.');
  };

  const handleSpecialtyPress = (specName) => {
    const destination = `/hospitals?specialty=${encodeURIComponent(specName)}`;
    executeProtectedAction(destination, `Please sign in to explore ${specName} specialists.`);
  };

  const handleHospitalAction = (hospitalId, action = 'view') => {
    const destination = `/hospital-details?id=${hospitalId}`;
    executeProtectedAction(
      destination,
      action === 'save'
        ? 'Please sign in to save hospitals to your favorites.'
        : 'Please sign in to view complete hospital facilities & estimates.'
    );
  };

  // Emergency 108 Call with Confirmation Alert
  const handleCall108 = () => {
    Alert.alert(
      t('home.emergencyConfirmTitle') || 'Emergency Call 108',
      t('home.emergencyConfirmMsg') ||
        'Are you sure you want to call Gujarat Emergency Ambulance (108) now?',
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

  return (
    <View style={[styles.mainScreen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <AroviaHeader activeNav="Dashboard" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.primaryBlue}
            colors={[Palette.primaryBlue]}
          />
        }
      >
        {/* ── 1. CURRENT LOCATION BAR ──────────────────────────────── */}
        <View
          style={[
            styles.locationBar,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.locationLeft}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.locationIconWrap,
                { backgroundColor: isDark ? '#0B132B' : '#EFF6FF' },
              ]}
            >
              <Ionicons name="location" size={17} color={Palette.primaryBlue} />
            </View>
            <View style={styles.locationTextWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.locationSubLabel, { color: colors.textSecondary }]}>
                  {t('home.yourLocation') || 'Verified GPS Location'}
                </Text>
                {gpsAccuracy !== null && (
                  <View
                    style={{
                      backgroundColor: gpsAccuracy <= 100 ? '#DCFCE7' : gpsAccuracy <= 500 ? '#FEF3C7' : '#FEE2E2',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: gpsAccuracy <= 100 ? '#15803D' : gpsAccuracy <= 500 ? '#B45309' : '#B91C1C',
                      }}
                    >
                      ±{gpsAccuracy}m
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.locationCityText, { color: colors.text }]} numberOfLines={1}>
                {locLoading
                  ? t('home.lockingGps')
                  : (locationDetails?.displayName || locationDetails?.city || t('home.tapToDetectGps'))}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                styles.changeCityBtn,
                {
                  borderColor: Palette.primaryBlue,
                  backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                  paddingHorizontal: 10,
                },
              ]}
              onPress={handleRefreshOrChangeLocation}
              disabled={locLoading}
              activeOpacity={0.8}
              accessibilityLabel="Refresh live GPS"
            >
              {locLoading ? (
                <ActivityIndicator size="small" color={Palette.primaryBlue} />
              ) : (
                <Text style={styles.changeCityBtnText}>🔄 GPS</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.changeCityBtn,
                {
                  borderColor: colors.cardBorder,
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  paddingHorizontal: 8,
                },
              ]}
              onPress={() => setCityModalVisible(true)}
              activeOpacity={0.8}
              accessibilityLabel="Browse cities"
            >
              <Text style={[styles.changeCityBtnText, { color: colors.text }]}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. HERO SECTION ───────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#0B132B' : '#0F172A' }]}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>
              {isAuthenticated
                ? `${t('home.welcomeBack') || 'Welcome back'}, ${user?.name ? user.name.split(' ')[0] : t('home.patient')}`
                : t('home.verifiedDirectory')}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {t('home.heroTitle') || 'Find the Right Care, Faster.'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {t('home.heroSubtitle') ||
              'Discover nearby hospitals, explore medical specializations and get healthcare guidance across Gujarat.'}
          </Text>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                t('home.searchPlaceholder') || 'Search hospital, city or specialization...'
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchActionBtn}
              onPress={handleSearchSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.searchActionBtnText}>
                {t('common.search') || 'Search'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. FOUR CLEAN QUICK HEALTHCARE ACTIONS ───────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {t('home.quickActions') || 'Quick Healthcare Actions'}
            </Text>
          </View>

          <View style={styles.actionsGrid}>
            {/* 1. Check Symptoms */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() =>
                executeProtectedAction(
                  '/symptoms',
                  'Please sign in to use the AI Clinical Triage Symptom Navigator.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="pulse" size={20} color="#2563EB" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {t('nav.symptomsChecker') || 'Check Symptoms'}
              </Text>
              <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>
                {t('home.actionSubtitles.aiTriage')}
              </Text>
            </TouchableOpacity>

            {/* 2. Explore Hospitals */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() =>
                executeProtectedAction(
                  '/hospitals',
                  'Please sign in to explore hospital directories across Gujarat.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="business" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {t('home.features.verified') || 'Explore Hospitals'}
              </Text>
              <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>
                {t('home.actionSubtitles.hospitalDirectory')}
              </Text>
            </TouchableOpacity>

            {/* 3. Map Area View */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() =>
                executeProtectedAction(
                  '/live-map',
                  'Please sign in to access the interactive Nearby Hospital Map.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="map" size={20} color="#9333EA" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {t('nav.mapView') || 'Map Area View'}
              </Text>
              <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>
                {t('home.actionSubtitles.nearbyMap')}
              </Text>
            </TouchableOpacity>

            {/* 4. Saved Hospitals */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() =>
                executeProtectedAction(
                  '/favorites',
                  'Please sign in to view your saved favorite hospitals.'
                )
              }
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="heart" size={20} color="#E11D48" />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {t('nav.savedHospitals') || 'Saved Hospitals'}
              </Text>
              <Text style={[styles.actionCardSubtitle, { color: colors.textSecondary }]}>
                {t('home.actionSubtitles.quickBookmarks')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. AI SYMPTOMS HIGHLIGHT BANNER ──────────────────────── */}
        <View style={styles.sectionWrap}>
          <View
            style={[
              styles.symptomPromoCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#F0FDFA',
                borderColor: isDark ? '#134E4A' : '#99F6E4',
              },
            ]}
          >
            <View style={styles.symptomPromoHeader}>
              <View style={styles.symptomPromoIconBadge}>
                <Text style={styles.symptomPromoIcon}>🩺</Text>
              </View>
              <View style={styles.symptomPromoText}>
                <Text style={[styles.symptomPromoTitle, { color: isDark ? '#FFF' : '#134E4A' }]}>
                  {t('home.symptomPromoTitle')}
                </Text>
                <Text style={[styles.symptomPromoDesc, { color: isDark ? '#94A3B8' : '#0F766E' }]}>
                  {t('home.symptomPromoDesc')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.symptomCheckBtn}
              onPress={() =>
                executeProtectedAction(
                  '/symptoms',
                  'Please sign in to run the AI clinical symptom triage.'
                )
              }
              activeOpacity={0.85}
            >
              <Text style={styles.symptomCheckBtnText}>
                {t('home.symptomPromoBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 5. TOP HOSPITALS PREVIEW ──────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                {t('home.nearbyHospitals') || 'Hospitals Near You'}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {t('home.nearbySubtitle')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                executeProtectedAction(
                  '/hospitals',
                  'Please sign in to explore all hospitals.'
                )
              }
            >
              <Text style={[styles.viewAllText, { color: Palette.primaryBlue }]}>
                {t('common.viewAll') || 'View All'} →
              </Text>
            </TouchableOpacity>
          </View>

          {loadingHospitals ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={Palette.primaryBlue} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
                {t('common.loading') || 'Loading verified hospitals...'}
              </Text>
            </View>
          ) : (
            <View style={styles.hospitalList}>
              {hospitals.slice(0, 3).map((item) => (
                <View
                  key={item._id}
                  style={[
                    styles.hospitalCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.hospitalImgWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.hospitalImg} />
                    ) : (
                      <View style={styles.hospitalImgPlaceholder}>
                        <Text style={styles.hospitalImgIcon}>🏥</Text>
                      </View>
                    )}

                    <View style={styles.cardBadges}>
                      <View style={styles.specBadge}>
                        <Text style={styles.specBadgeText}>
                          {item.specialties?.[0] || 'Multi-Specialty'}
                        </Text>
                      </View>
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>🛡️ {t('common.verified')}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => handleHospitalAction(item._id, 'save')}
                      hitSlop={8}
                    >
                      <Text style={styles.favIcon}>🤍</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.hospitalBody}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[styles.hospitalName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.starIcon}>★</Text>
                        <Text style={styles.ratingText}>{item.rating || '4.8'}</Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.hospitalAddress, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      📍 {item.area ? `${item.area}, ` : ''}{item.city || 'Gujarat'}
                    </Text>

                    <View style={styles.hospitalActions}>
                      <TouchableOpacity
                        style={[styles.directionsBtn, { borderColor: Palette.primaryBlue }]}
                        onPress={() => {
                          const q = encodeURIComponent(`${item.name} ${item.city}`);
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                        }}
                      >
                        <Text style={[styles.directionsBtnText, { color: Palette.primaryBlue }]}>
                          🧭 {t('hospitals.directions')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.detailsBtn, { backgroundColor: Palette.primaryBlue }]}
                        onPress={() => handleHospitalAction(item._id, 'view')}
                      >
                        <Text style={styles.detailsBtnText}>{t('hospitals.viewDetails')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── 6. EXPLORE MEDICAL SPECIALIZATIONS ─────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {t('home.specializations') || 'Medical Specializations'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specScroll}
          >
            {SPECIALIZATIONS.map((spec) => (
              <TouchableOpacity
                key={spec.id}
                style={[
                  styles.specChip,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSpecialtyPress(spec.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.specIcon}>{spec.icon}</Text>
                <Text style={[styles.specName, { color: colors.text }]}>{t(spec.labelKey) || spec.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── 7. EMERGENCY ASSISTANCE SECTION (NEAR BOTTOM) ─────────── */}
        <View style={styles.emergencySectionContainer}>
          <View style={styles.emergencyMainCard}>
            <View style={styles.emergencyTextSection}>
              <View style={styles.emergencyBadgeRow}>
                <Text style={styles.emergencyBellIcon}>🚨</Text>
                <Text style={styles.emergencyBadgeHeading}>
                  {t('home.emergencyHelp') || 'Emergency Help'}
                </Text>
              </View>

              <Text style={styles.emergencyPromptTitle}>
                {t('home.emergencyPromptTitle')}
              </Text>
              <Text style={styles.emergencyPromptDesc}>
                {t('home.emergencyDesc') ||
                  'Available 24/7 across Gujarat & India for rapid ambulance, trauma care, and hospital coordination.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.emergencyCallBtn}
              onPress={handleCall108}
              activeOpacity={0.85}
              accessibilityLabel="Call 108 Emergency Helpline"
            >
              <Text style={styles.emergencyCallIcon}>📞</Text>
              <View>
                <Text style={styles.emergencyCallLabel}>
                  {t('home.call108Now') || 'Call 108'}
                </Text>
                <Text style={styles.emergencyCallSub}>{t('home.tollFreeAmbulance')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 8. FOOTER ─────────────────────────────────────────────── */}
        <AroviaFooter />
      </ScrollView>

      {/* Manual Gujarat City Selector Modal */}
      <LocationSelectorModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title={t('home.selectGujaratCity') || 'Select Gujarat City'}
        data={GUJARAT_CITY_OPTIONS}
        selectedItem={locationDetails?.city || ''}
        onSelect={handleSelectCity}
        placeholder={t('common.searchCitiesPlaceholder')}
      />

      {/* 4 Bottom Tabs */}
      <AroviaBottomNav activeTab="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  mainScreen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. Location Bar
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  locationIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  locationCityText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  changeCityBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  changeCityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primaryBlue,
  },

  // 2. Hero Section
  heroCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    ...Shadows.card,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  heroBadgeText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 29,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 46,
    ...Shadows.soft,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 8,
  },
  searchActionBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // 3. Quick Healthcare Actions
  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  actionCard: {
    width: '48.2%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 116,
    justifyContent: 'space-between',
    ...Shadows.soft,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  actionCardSubtitle: {
    fontSize: 11,
  },

  // 4. AI Symptom Promo Card
  symptomPromoCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
  },
  symptomPromoHeader: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  symptomPromoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomPromoIcon: {
    fontSize: 22,
  },
  symptomPromoText: {
    flex: 1,
  },
  symptomPromoTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  symptomPromoDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  symptomCheckBtn: {
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  symptomCheckBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // 5. Hospitals List
  hospitalList: {
    gap: 14,
  },
  hospitalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  hospitalImgWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  hospitalImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hospitalImgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalImgIcon: {
    fontSize: 36,
  },
  cardBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  specBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIcon: {
    fontSize: 16,
  },
  hospitalBody: {
    padding: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  starIcon: {
    color: '#D97706',
    fontSize: 11,
  },
  ratingText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  hospitalAddress: {
    fontSize: 12,
    marginBottom: 12,
  },
  hospitalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  directionsBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  directionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // 6. Specializations
  specScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  specIcon: {
    fontSize: 14,
  },
  specName: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 7. Emergency Help Section
  emergencySectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emergencyMainCard: {
    backgroundColor: '#7F1D1D',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    ...Shadows.card,
  },
  emergencyTextSection: {
    gap: 4,
  },
  emergencyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  emergencyBellIcon: {
    fontSize: 14,
  },
  emergencyBadgeHeading: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emergencyPromptTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emergencyPromptDesc: {
    color: '#FECACA',
    fontSize: 12,
    lineHeight: 17,
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  emergencyCallIcon: {
    fontSize: 20,
  },
  emergencyCallLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emergencyCallSub: {
    color: '#FEE2E2',
    fontSize: 10,
    textAlign: 'center',
  },

  // Loaders
  loaderBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    marginTop: 8,
  },
});
