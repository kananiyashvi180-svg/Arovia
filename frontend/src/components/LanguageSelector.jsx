import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { Palette, Shadows } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
  const { currentLanguage, currentLangInfo, changeLanguage, supportedLanguages } = useLanguage();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.triggerBtn,
          {
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
        accessibilityLabel="Select Language"
      >
        <Ionicons name="globe-outline" size={13} color={colors.text} />
        <Text style={[styles.langCode, { color: colors.text }]}>
          {currentLangInfo.code.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  🌐 {t('language.selectTitle')}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  English • ગુજરાતી • हिन्दी
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn} hitSlop={8}>
                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.langList}>
              {supportedLanguages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langRow,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#1E3A5F' : '#EFF6FF')
                          : (isDark ? '#1E293B' : '#F8FAFC'),
                        borderColor: isSelected ? Palette.primaryBlue : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      setVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.langNative,
                          {
                            color: isSelected ? Palette.primaryBlue : colors.text,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {lang.nativeLabel}
                      </Text>
                      <Text style={[styles.langEnglish, { color: colors.textSecondary }]}>
                        {lang.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  langCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    ...Shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  langList: {
    gap: 10,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  langFlag: {
    fontSize: 22,
  },
  langNative: {
    fontSize: 15,
  },
  langEnglish: {
    fontSize: 12,
    marginTop: 1,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
