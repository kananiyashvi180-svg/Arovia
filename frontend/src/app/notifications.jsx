import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import { useTranslation } from 'react-i18next';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  const notificationItems = [
    {
      id: '1',
      title: t('notifications.item1Title'),
      message: t('notifications.item1Msg'),
      time: '2h',
      type: 'info',
      unread: true,
    },
    {
      id: '2',
      title: t('notifications.item2Title'),
      message: t('notifications.item2Msg'),
      time: '1d',
      type: 'alert',
      unread: false,
    },
    {
      id: '3',
      title: t('notifications.item3Title'),
      message: t('notifications.item3Msg'),
      time: '3d',
      type: 'reminder',
      unread: false,
    },
  ];

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: '/notifications',
          message: 'Please sign in to view notifications.',
        },
      });
    }
  }, [isAuthenticated, authLoading]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AroviaHeader activeNav="Notifications" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('notifications.title')}</Text>
        </View>

        {notificationItems.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBg,
                borderColor: item.unread ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.cardMessage, { color: colors.textMuted }]}>{item.message}</Text>
            <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{item.time}</Text>
          </View>
        ))}
      </ScrollView>

      <AroviaBottomNav activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitleRow: {
    marginBottom: 16,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 12,
  },
});

