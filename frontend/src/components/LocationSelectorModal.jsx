import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Palette } from '../constants/theme';

export default function LocationSelectorModal({
  visible,
  onClose,
  title,
  data = [],
  selectedItem,
  onSelect,
  placeholder = 'Search...',
}) {
  const { colors, isDark } = useAppTheme();
  const [search, setSearch] = useState('');

  const filteredData = data.filter((item) => {
    const textToSearch = typeof item === 'string' ? item : item?.name || '';
    return textToSearch.toLowerCase().includes(search.toLowerCase().trim());
  });

  const handleSelectItem = (item) => {
    onSelect(item);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalBox, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          {/* List items */}
          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => (typeof item === 'string' ? item : item?.name || index.toString())}
            renderItem={({ item }) => {
              const itemText = typeof item === 'string' ? item : item?.name;
              const isSelected = selectedItem === itemText;

              return (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' },
                    isSelected && { backgroundColor: isDark ? '#1E293B' : '#E0F2FE' },
                  ]}
                  onPress={() => handleSelectItem(item)}
                >
                  <Text
                    style={[
                      styles.itemText,
                      { color: isSelected ? Palette.primaryBlue : colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {itemText}
                  </Text>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No matching locations found
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBox: {
    padding: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 15,
  },
  checkIcon: {
    color: Palette.primaryBlue,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

