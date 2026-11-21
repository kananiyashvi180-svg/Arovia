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

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Hospital Verification Update',
    message: 'Apollo Hospitals Mumbai has updated their cardiology emergency desk schedule.',
    time: '2 hours ago',
    type: 'info',
    unread: true,
  },
  {
    id: '2',
    title: 'Healthcare Advisory',
    message: 'Seasonal influenza alert in your region. Check AI Symptom Checker for early symptom screening.',
    time: '1 day ago',
    type: 'alert',
    unread: false,
  },
  {
    id: '3',
    title: 'Appointment Reminder',
    message: 'Remember to carry previous prescriptions for your specialist consultation.',
    time: '3 days ago',
    type: 'reminder',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

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
      <AroviaHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Notifications</Text>
        </View>

        {MOCK_NOTIFICATIONS.map((item) => (
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

