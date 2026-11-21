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
import gujaratData from '../../constants/gujaratLocations.json';
import LocationSelectorModal from '../../components/LocationSelectorModal';
import LocationDetector from '../../components/LocationDetector';
import { matchDistrictAndCity } from '../../utils/locationService';

export default function RegisterScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams();
  const { register } = useAuth();
  const { colors, isDark } = useAppTheme();

  // Basic Account Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Administrative Gujarat Location Hierarchy (Empty by default until user taps GPS or selects manually)
  const [state] = useState('Gujarat, India');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [taluka, setTaluka] = useState('');
  const [villageArea, setVillageArea] = useState('');
  const [coords, setCoords] = useState(null);

  // Selector Modal States
  const [activeModal, setActiveModal] = useState(null); // 'district' | 'city' | 'area' | null

  // Status & Validation
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // When a District is chosen:
  const handleSelectDistrict = (dist) => {
    setSelectedDistrict(dist);
    if (dist.cities && dist.cities.length > 0) {
      const firstCity = dist.cities[0];
      setSelectedCity(firstCity);
      setTaluka(firstCity.taluka);
      setVillageArea(firstCity.areas?.[0] || '');
    } else {
      setSelectedCity(null);
      setTaluka('');
      setVillageArea('');
    }
  };

  // When a City is chosen:
  const handleSelectCity = (cityObj) => {
    setSelectedCity(cityObj);
    setTaluka(cityObj.taluka);
    setVillageArea(cityObj.areas?.[0] || '');
  };

  // Callback from GPS Auto-Detector
  const handleGPSDetected = (loc) => {
    setCoords({ latitude: loc.latitude, longitude: loc.longitude });

    const { matchedDistrict, matchedCity } = matchDistrictAndCity(
      loc.district,
      loc.city,
      loc.taluka,
      { latitude: loc.latitude, longitude: loc.longitude }
    );

    if (matchedDistrict) {
      setSelectedDistrict(matchedDistrict);
      const chosenCity = matchedCity || matchedDistrict.cities[0];
      setSelectedCity(chosenCity);
      setTaluka(chosenCity.taluka || loc.taluka || chosenCity.name);
      setVillageArea(loc.villageArea || chosenCity.areas?.[0] || '');
    } else {
      const fallbackDist = {
        name: loc.district || 'Gujarat',
        cities: [{ name: loc.city || 'Local Area', taluka: loc.taluka || '' }],
      };
      setSelectedDistrict(fallbackDist);
      setSelectedCity(fallbackDist.cities[0]);
      setTaluka(loc.taluka || '');
      setVillageArea(loc.villageArea || '');
    }
  };

  const handleRegister = async () => {
    // 1. Validations
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mobile.trim() && !/^[0-9]{10}$/.test(mobile.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!selectedDistrict?.name || !selectedCity?.name) {
      setErrorMsg('Please select your Gujarat District and City/Town.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim() || undefined,
        password,
        location: {
          country: 'India',
          state: 'Gujarat',
          district: selectedDistrict.name,
          city: selectedCity.name,
          taluka: taluka || selectedCity.taluka,
          villageArea: villageArea.trim(),
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
        },
      };

      await register(payload);
      // Seamlessly navigate to original destination or Dashboard after registration
      const destination = redirect ? decodeURIComponent(String(redirect)) : '/';
      router.replace(destination);
    } catch (err) {
      console.warn('Registration failed:', err.response?.data || err.message);
      const serverMsg = typeof err.response?.data === 'object' && err.response?.data?.message
        ? err.response.data.message
        : 'Server connection error. Please make sure the backend is reachable.';
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
          {/* Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>💙</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Join Arovia</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Create your healthcare account with Gujarat district coverage
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
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {/* SECTION: Personal Information */}
            <Text style={[styles.sectionHeading, { color: Palette.primaryBlue }]}>
              1. Personal Details
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                placeholder="Dr. / Mr. / Ms. Full Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                placeholder="patient@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Mobile Number (10 Digits)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                placeholder="9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Password (Min. 6 characters) *</Text>
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
                  placeholder="Create password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
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
                  placeholder="Re-enter password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* SECTION: Gujarat Administrative Location */}
            <Text style={[styles.sectionHeading, { color: Palette.primaryBlue }]}>
              2. Gujarat Location (LGD Government Directory)
            </Text>

            {/* GPS Auto-Detect Button */}
            <LocationDetector onLocationDetected={handleGPSDetected} />

            {/* State (Fixed to Gujarat) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>State</Text>
              <View style={[styles.readOnlyPill, { backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }]}>
                <Text style={[styles.readOnlyText, { color: colors.text }]}>📍 {state}</Text>
              </View>
            </View>

            {/* District Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>District *</Text>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setActiveModal('district')}
              >
                <Text style={[styles.selectorBtnText, { color: colors.text }]}>
                  {selectedDistrict?.name || 'Select Gujarat District'}
                </Text>
                <Text style={styles.chevronIcon}>⌄</Text>
              </TouchableOpacity>
            </View>

            {/* City / Town Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>City / Town *</Text>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setActiveModal('city')}
              >
                <Text style={[styles.selectorBtnText, { color: colors.text }]}>
                  {selectedCity?.name || 'Select City/Town'}
                </Text>
                <Text style={styles.chevronIcon}>⌄</Text>
              </TouchableOpacity>
            </View>

            {/* Taluka (Auto-filled by City / Dependent) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Taluka</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                placeholder="Taluka"
                placeholderTextColor="#94A3B8"
                value={taluka}
                onChangeText={setTaluka}
              />
            </View>

            {/* Village / Area Selector or manual input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Village / Area (Optional)</Text>
              {selectedCity?.areas && selectedCity.areas.length > 0 ? (
                <TouchableOpacity
                  style={[
                    styles.selectorBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => setActiveModal('area')}
                >
                  <Text style={[styles.selectorBtnText, { color: colors.text }]}>
                    {villageArea || 'Select Area/Locality'}
                  </Text>
                  <Text style={styles.chevronIcon}>⌄</Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="e.g. Near Bus Stand, Main Bazar"
                  placeholderTextColor="#94A3B8"
                  value={villageArea}
                  onChangeText={setVillageArea}
                />
              )}
            </View>

            {/* Note on Data Source */}
            <Text style={styles.dataSourceNote}>
              Source: Local Government Directory (LGD), Ministry of Panchayati Raj, Government of India.
            </Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: Palette.primaryBlue }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Arovia Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already registered?{' '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/login',
                  params: redirect ? { redirect } : undefined,
                })
              }
            >
              <Text style={[styles.loginLink, { color: Palette.primaryBlue }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* District Selection Modal */}
      <LocationSelectorModal
        visible={activeModal === 'district'}
        onClose={() => setActiveModal(null)}
        title="Select Gujarat District"
        data={gujaratData.districts}
        selectedItem={selectedDistrict?.name}
        onSelect={handleSelectDistrict}
        placeholder="Search all 33 Gujarat districts..."
      />

      {/* City/Town Selection Modal */}
      <LocationSelectorModal
        visible={activeModal === 'city'}
        onClose={() => setActiveModal(null)}
        title={`Cities & Towns in ${selectedDistrict?.name || 'District'}`}
        data={selectedDistrict?.cities || []}
        selectedItem={selectedCity?.name}
        onSelect={handleSelectCity}
        placeholder="Search cities/towns..."
      />

      {/* Village/Area Selection Modal */}
      <LocationSelectorModal
        visible={activeModal === 'area'}
        onClose={() => setActiveModal(null)}
        title={`Areas in ${selectedCity?.name || 'City'}`}
        data={selectedCity?.areas || []}
        selectedItem={villageArea}
        onSelect={(areaName) => setVillageArea(areaName)}
        placeholder="Search localities/areas..."
      />
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
    padding: 18,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoIcon: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    elevation: 3,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
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
  divider: {
    height: 1,
    marginVertical: 14,
  },
  readOnlyPill: {
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  readOnlyText: {
    fontWeight: '600',
    fontSize: 13,
  },
  selectorBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#64748B',
  },
  dataSourceNote: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 15,
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});
