import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import type { JournalEntry } from '@/types/journal';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_CONFIG = {
  trajet: { label: 'Trajet', color: '#388E3C', icon: 'location' as const },
  incident: { label: 'Incident', color: '#FF6B35', icon: 'exclamationmark.triangle' as const },
  remarque: { label: 'Remarque', color: '#2196F3', icon: 'bubble.left' as const },
  maintenance: { label: 'Maintenance', color: '#9C27B0', icon: 'wrench.and.screwdriver' as const },
};

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: '04/04/2026',
    time: '07:30',
    title: 'Trajet Paris → Lyon',
    content: 'Départ à 7h30. Autoroute A6 fluide jusqu\'à Auxerre. Arrêt aire de repos Beaune à 10h15. Arrivée Lyon Part-Dieu 12h05.',
    category: 'trajet',
    tags: ['A6', 'ponctuel'],
  },
  {
    id: '2',
    date: '03/04/2026',
    time: '14:15',
    title: 'Problème porte arrière',
    content: 'La porte soute arrière gauche se ferme mal. Signalé à l\'atelier. Réparation prévue le 6 avril.',
    category: 'incident',
    tags: ['soute', 'atelier'],
  },
];

export default function JournalDeBordScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_ENTRIES);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    if (params.category) {
      setFilterCategory(params.category);
    }
  }, [params.category]);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: (params.category === 'incident' ? 'incident' : 'trajet') as JournalEntry['category'],
    tags: '',
  });

  const isPlanAllowed = user?.plan === 'private' || user?.plan === 'expert';

  const saveEntry = () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Champs manquants', 'Veuillez renseigner un titre et une note.');
      return;
    }
    const now = new Date();
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setEntries((prev) => [newEntry, ...prev]);
    setForm({ title: '', content: '', category: 'trajet', tags: '' });
    setModalVisible(false);
  };

  const deleteEntry = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette note du journal ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setEntries((prev) => prev.filter((e) => e.id !== id)),
      },
    ]);
  };

  const filtered = entries.filter((e) => {
    const matchSearch =
      !searchText ||
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.content.toLowerCase().includes(searchText.toLowerCase());
    const matchCat = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  // Écran grisé pour les utilisateurs free
  if (!isPlanAllowed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journal de bord</Text>
        </View>
        <View style={styles.lockedContainer}>
          <View style={styles.lockedIcon}>
            <IconSymbol name="lock.fill" size={48} color="#888" />
          </View>
          <Text style={styles.lockedTitle}>Fonctionnalité réservée</Text>
          <Text style={styles.lockedText}>
            Le Journal de bord est disponible à partir du forfait{' '}
            <Text style={{ color: '#FFA726', fontWeight: '700' }}>Intermédiaire</Text>{' '}
            (8,99 EUR / mois).
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push({ pathname: '/upgrade-plan', params: { plan: 'private' } })}
          >
            <IconSymbol name="arrow.up.circle.fill" size={18} color="#FFF" />
            <Text style={styles.upgradeButtonText}>Passer au forfait Intermédiaire</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Retour au tableau de bord</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Journal de bord</Text>
          <Text style={styles.headerSub}>{entries.length} note(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <IconSymbol name="plus" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <IconSymbol name="magnifyingglass" size={16} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher dans le journal..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <IconSymbol name="xmark.circle.fill" size={16} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtres catégorie */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
          onPress={() => setFilterCategory(null)}
        >
          <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>Tout</Text>
        </TouchableOpacity>
        {(Object.entries(CATEGORY_CONFIG) as [JournalEntry['category'], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, cfg]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filterCategory === key && { backgroundColor: cfg.color, borderColor: cfg.color }]}
            onPress={() => setFilterCategory(filterCategory === key ? null : key)}
          >
            <Text style={[styles.filterChipText, filterCategory === key && styles.filterChipTextActive]}>{cfg.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des notes */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="book" size={40} color="#555" />
            <Text style={styles.emptyText}>Aucune note trouvée</Text>
            <Text style={styles.emptySubText}>Appuyez sur + pour ajouter une entrée</Text>
          </View>
        )}
        {filtered.map((entry) => {
          const cfg = CATEGORY_CONFIG[entry.category];
          return (
            <View key={entry.id} style={[styles.entryCard, { borderLeftColor: cfg.color }]}>
              <View style={styles.entryHeader}>
                <View style={[styles.categoryTag, { backgroundColor: cfg.color }]}>
                  <IconSymbol name={cfg.icon} size={12} color="#FFF" />
                  <Text style={styles.categoryTagText}>{cfg.label}</Text>
                </View>
                <Text style={styles.entryDateTime}>{entry.date} · {entry.time}</Text>
                <TouchableOpacity onPress={() => deleteEntry(entry.id)} style={styles.deleteBtn}>
                  <IconSymbol name="trash" size={14} color="#FF6B35" />
                </TouchableOpacity>
              </View>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryContent} numberOfLines={3}>{entry.content}</Text>
              {entry.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {entry.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal ajout */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle note</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="xmark" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Catégorie */}
              <Text style={styles.modalLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {(Object.entries(CATEGORY_CONFIG) as [JournalEntry['category'], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, cfg]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.catChip, form.category === key && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setForm((f) => ({ ...f, category: key }))}
                  >
                    <IconSymbol name={cfg.icon} size={14} color={form.category === key ? '#FFF' : cfg.color} />
                    <Text style={[styles.catChipText, form.category === key && { color: '#FFF' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Titre */}
              <Text style={styles.modalLabel}>Titre *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex : Trajet Paris → Lyon"
                placeholderTextColor="#888"
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              />

              {/* Note */}
              <Text style={styles.modalLabel}>Note *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Décrivez votre trajet, incident ou remarque..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={5}
                value={form.content}
                onChangeText={(v) => setForm((f) => ({ ...f, content: v }))}
              />

              {/* Tags */}
              <Text style={styles.modalLabel}>Tags (séparés par des virgules)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex : A6, retard, pluie"
                placeholderTextColor="#888"
                value={form.tags}
                onChangeText={(v) => setForm((f) => ({ ...f, tags: v }))}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveEntry}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A3A1F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: { padding: 4 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#388E3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 11, color: '#A5D6A7' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#243B28',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#E8F5E8', fontSize: 14 },
  filterRow: { marginTop: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A7C59',
    backgroundColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#388E3C', borderColor: '#388E3C' },
  filterChipText: { fontSize: 12, color: '#A5D6A7' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#555' },
  entryCard: {
    backgroundColor: '#243B28',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  categoryTagText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  entryDateTime: { fontSize: 11, color: '#888', flex: 1 },
  deleteBtn: { padding: 4 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#E8F5E8', marginBottom: 4 },
  entryContent: { fontSize: 13, color: '#A5D6A7', lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#1A3A1F', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#66BB6A' },
  // Locked
  lockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockedIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#243B28',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockedTitle: { fontSize: 20, fontWeight: '700', color: '#E8F5E8', marginBottom: 12 },
  lockedText: { fontSize: 14, color: '#A5D6A7', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA726',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 14,
  },
  upgradeButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  backLink: { padding: 8 },
  backLinkText: { fontSize: 13, color: '#66BB6A', textDecorationLine: 'underline' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#1A3A1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  modalScroll: { padding: 20 },
  modalLabel: { fontSize: 12, color: '#A5D6A7', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: '#243B28',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#E8F5E8',
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  modalTextArea: { height: 110, textAlignVertical: 'top' },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A7C59',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  catChipText: { fontSize: 13, color: '#A5D6A7' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#388E3C',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    marginTop: 6,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
