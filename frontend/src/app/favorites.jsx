import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette, Shadows } from '../constants/theme';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import { getFavorites, toggleFavoriteHospital } from '../services/medicalService';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: '/favorites',
          message: 'Please sign in to access your saved favorite hospitals.',
        },
      });
    }
  }, [isAuthenticated, authLoading]);

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavs = useCallback(async () => {
    try {
      const res = await getFavorites();
      if (res?.success && Array.isArray(res?.data)) {
        setFavorites(res.data);
      }
    } catch (e) {
      console.warn('Error fetching favorites:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFavs();
    }, [fetchFavs])
  );

  useEffect(() => {
    fetchFavs();
  }, [fetchFavs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavs();
  };

  const removeFav = async (hospId) => {
    try {
      setFavorites((prev) => prev.filter((h) => h._id !== hospId));
      await toggleFavoriteHospital(hospId, true);
    } catch (e) {
      fetchFavs();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AroviaHeader activeNav="Favorites" />

      <ScrollView
        contentContainerStyle={styles.scroll}
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
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]}>Saved Hospitals</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Quick access to your preferred emergency centers and trusted clinics.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Palette.primaryBlue} />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading favorites...</Text>
          </View>
        ) : favorites.length > 0 ? (
          <View style={styles.list}>
            {favorites.map((hosp) => (
              <TouchableOpacity
                key={hosp._id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push({ pathname: '/hospital-details', params: { id: hosp._id } })}
                activeOpacity={0.88}
              >
                <Image source={{ uri: hosp.image }} style={styles.thumb} resizeMode="cover" />

                <View style={styles.cardBody}>
                  <View style={styles.topRow}>
                    <Text style={[styles.hospName, { color: colors.text }]} numberOfLines={1}>
                      {hosp.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => removeFav(hosp._id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.heartActive}>❤️</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
                    📍 {hosp.area}, {hosp.city}
                  </Text>

                  <View style={styles.bottomRow}>
                    <View style={styles.ratingWrap}>
                      <Text style={styles.star}>★</Text>
                      <Text style={styles.ratingVal}>{hosp.rating}</Text>
                    </View>
                    <Text style={styles.viewLink}>View Hospital →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.emptyIcon}>💙</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Saved Hospitals</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap the heart icon on any hospital profile to save it here for fast emergency lookup.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/hospitals')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Explore Hospitals</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AroviaBottomNav activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  headerInfo: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    gap: 14,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    ...Shadows.card,
  },
  thumb: {
    width: '100%',
    height: 130,
  },
  cardBody: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hospName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  trashBtn: {
    padding: 4,
  },
  heartActive: {
    fontSize: 18,
  },
  address: {
    fontSize: 12,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  star: {
    color: '#D97706',
    fontSize: 11,
  },
  ratingVal: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '800',
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primaryBlue,
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyWrap: {
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  browseBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

