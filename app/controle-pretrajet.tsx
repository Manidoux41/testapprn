import { IconSymbol } from '@/components/ui/icon-symbol';
import type { CheckItem } from '@/types/journal';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INITIAL_CHECKLIST: CheckItem[] = [
  // Sécurité active
  { id: '1', category: 'Freinage', label: 'Frein de service (pression air > 6 bars)', critical: true, checked: false },
  { id: '2', category: 'Freinage', label: 'Frein de stationnement (serré/desserré)', critical: true, checked: false },
  { id: '3', category: 'Freinage', label: 'Frein de secours fonctionnel', critical: true, checked: false },
  // Direction / train roulant
  { id: '4', category: 'Train roulant', label: "Pression pneumatiques conforme (avant / arrière)", critical: true, checked: false },
  { id: '5', category: 'Train roulant', label: 'Usure des pneus (profondeur sculpture ≥ 1,6 mm)', critical: true, checked: false },
  { id: '6', category: 'Train roulant', label: 'Absence de dommages visibles (flancs, jantes)', critical: false, checked: false },
  // Éclairages
  { id: '7', category: 'Éclairages', label: 'Feux de position avant / arrière', critical: false, checked: false },
  { id: '8', category: 'Éclairages', label: 'Feux de croisement et de route', critical: true, checked: false },
  { id: '9', category: 'Éclairages', label: 'Feux de stop', critical: true, checked: false },
  { id: '10', category: 'Éclairages', label: 'Clignotants avant et arrière', critical: true, checked: false },
  { id: '11', category: 'Éclairages', label: 'Feux de recul et de brouillard', critical: false, checked: false },
  // Niveaux
  { id: '12', category: 'Niveaux', label: "Niveau d'huile moteur", critical: true, checked: false },
  { id: '13', category: 'Niveaux', label: 'Niveau liquide de refroidissement', critical: true, checked: false },
  { id: '14', category: 'Niveaux', label: 'Niveau liquide de frein', critical: true, checked: false },
  { id: '15', category: 'Niveaux', label: 'Niveau lave-glace', critical: false, checked: false },
  // Carrosserie & visibilité
  { id: '16', category: 'Visibilité', label: 'Pare-brise sans fissure dans le champ de vision', critical: true, checked: false },
  { id: '17', category: 'Visibilité', label: 'Rétroviseurs propres et bien orientés', critical: true, checked: false },
  { id: '18', category: 'Visibilité', label: 'Essuie-glaces fonctionnels', critical: false, checked: false },
  // Documents
  { id: '19', category: 'Documents', label: 'Carte grise à bord', critical: true, checked: false },
  { id: '20', category: 'Documents', label: "Attestation d'assurance valide", critical: true, checked: false },
  { id: '21', category: 'Documents', label: 'Contrôle technique valide', critical: true, checked: false },
  { id: '22', category: 'Documents', label: 'Disque ou carte tachygraphe inséré', critical: true, checked: false },
  // Sécurité passagers
  { id: '23', category: 'Passagers', label: 'Portes et soutes opérationnelles', critical: true, checked: false },
  { id: '24', category: 'Passagers', label: 'Issues de secours accessibles et déverrouillées', critical: true, checked: false },
  { id: '25', category: 'Passagers', label: 'Extincteur à bord et accessible', critical: true, checked: false },
  { id: '26', category: 'Passagers', label: 'Trousse de secours à bord', critical: false, checked: false },
  { id: '27', category: 'Passagers', label: 'Triangle de signalisation présent', critical: false, checked: false },
  // Intérieur chauffeur
  { id: '28', category: 'Poste de conduite', label: 'Siège et ceinture réglés / fonctionnels', critical: true, checked: false },
  { id: '29', category: 'Poste de conduite', label: 'Klaxon fonctionnel', critical: false, checked: false },
  { id: '30', category: 'Poste de conduite', label: 'Tableau de bord sans voyant critique allumé', critical: true, checked: false },
];

export default function ControlePretrajetScreen() {
  const [checklist, setChecklist] = useState<CheckItem[]>(INITIAL_CHECKLIST);
  const [tripTitle, setTripTitle] = useState('');
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSaved(false);
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const resetAll = () => {
    Alert.alert(
      'Réinitialiser',
      'Vider tous les contrôles pour un nouveau trajet ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            setChecklist(INITIAL_CHECKLIST);
            setSaved(false);
          },
        },
      ]
    );
  };

  const validateAndSave = () => {
    const blocking = checklist.filter((i) => i.critical && !i.checked);
    if (blocking.length > 0) {
      Alert.alert(
        '⚠️ Points critiques non validés',
        `${blocking.length} point(s) obligatoire(s) non cochés :\n\n${blocking.map((b) => `• ${b.label}`).join('\n')}\n\nVous ne pouvez pas partir sans les valider.`,
        [{ text: 'Corriger', style: 'cancel' }]
      );
      return;
    }
    setSaved(true);
    Alert.alert(
      '✅ Contrôle validé',
      `Tous les points critiques ont été vérifiés.\nTrajet autorisé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
      [{ text: 'OK' }]
    );
  };

  const categories = [...new Set(checklist.map((i) => i.category))];
  const totalChecked = checklist.filter((i) => i.checked).length;
  const totalCritical = checklist.filter((i) => i.critical).length;
  const criticalChecked = checklist.filter((i) => i.critical && i.checked).length;
  const progress = Math.round((totalChecked / checklist.length) * 100);
  const allCriticalDone = criticalChecked === totalCritical;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Contrôle Pré-trajet</Text>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity onPress={resetAll} style={styles.resetButton}>
          <IconSymbol name="arrow.counterclockwise" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{totalChecked}/{checklist.length} points vérifiés</Text>
          <Text style={[styles.progressLabel, { color: allCriticalDone ? '#A5D6A7' : '#FFAB91' }]}>
            {criticalChecked}/{totalCritical} critiques ✓
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: allCriticalDone ? '#66BB6A' : '#FFA726' }]} />
        </View>
        <Text style={styles.progressPercent}>{progress}%</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {categories.map((cat) => {
          const items = checklist.filter((i) => i.category === cat);
          const catChecked = items.filter((i) => i.checked).length;
          return (
            <View key={cat} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat}</Text>
                <Text style={styles.categoryCount}>{catChecked}/{items.length}</Text>
              </View>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checkRow, item.checked && styles.checkRowDone]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <IconSymbol name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <View style={styles.checkContent}>
                    <Text style={[styles.checkLabel, item.checked && styles.checkLabelDone]}>
                      {item.label}
                    </Text>
                    {item.critical && !item.checked && (
                      <Text style={styles.criticalBadge}>OBLIGATOIRE</Text>
                    )}
                  </View>
                  {item.critical && (
                    <IconSymbol
                      name={item.checked ? 'checkmark.shield.fill' : 'exclamationmark.shield'}
                      size={18}
                      color={item.checked ? '#66BB6A' : '#FF6B35'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {/* Bouton valider */}
        <TouchableOpacity
          style={[styles.validateButton, allCriticalDone && styles.validateButtonReady]}
          onPress={validateAndSave}
        >
          <IconSymbol name={allCriticalDone ? 'checkmark.circle.fill' : 'xmark.circle'} size={22} color="#FFF" />
          <Text style={styles.validateText}>
            {saved ? '✅ Contrôle validé' : allCriticalDone ? 'Valider et partir' : 'Points critiques manquants'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  resetButton: { padding: 4, marginLeft: 'auto' },
  headerTitleBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 11, color: '#A5D6A7', textTransform: 'capitalize' },
  progressContainer: {
    backgroundColor: '#2D5016',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#E8F5E8' },
  progressBar: { height: 6, backgroundColor: '#1A3A1F', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressPercent: { fontSize: 11, color: '#A5D6A7', textAlign: 'right', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  categoryBlock: { marginBottom: 16 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: '#A5D6A7', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryCount: { fontSize: 12, color: '#66BB6A', fontWeight: '600' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#243B28',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  checkRowDone: { borderLeftColor: '#66BB6A', backgroundColor: '#1E3322' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#66BB6A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: '#388E3C', borderColor: '#388E3C' },
  checkContent: { flex: 1 },
  checkLabel: { fontSize: 13, color: '#E8F5E8', lineHeight: 18 },
  checkLabelDone: { color: '#6A9A70', textDecorationLine: 'line-through' },
  criticalBadge: { fontSize: 9, color: '#FF6B35', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
  },
  validateButtonReady: { backgroundColor: '#2E7D32' },
  validateText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
