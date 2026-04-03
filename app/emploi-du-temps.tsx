import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    extractScheduleFromPdfBytes,
    ScheduleDay,
    ScheduleExtractionResult,
} from '@/utils/schedule-pdf';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#388E3C',
  primaryDark: '#2D5016',
  primaryLight: '#4A7C59',
  accent: '#81C784',
  background: '#F3F7F2',
  surface: '#FFFFFF',
  text: '#16301A',
  muted: '#6A7A69',
  border: '#D9E4D7',
  warningBg: '#FFF7E8',
  warningText: '#A06300',
};

export default function EmploiDuTempsScreen() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ScheduleExtractionResult | null>(null);

  const totals = useMemo(() => {
    if (!result) {
      return {
        dayCount: 0,
        serviceCount: 0,
        totalServiceMinutes: 0,
        totalAmplitudeMinutes: 0,
      };
    }

    return {
      dayCount: result.days.length,
      serviceCount: result.entries.length,
      totalServiceMinutes: result.days.reduce((sum, day) => sum + day.totalServiceMinutes, 0),
      totalAmplitudeMinutes: result.days.reduce((sum, day) => sum + day.amplitudeMinutes, 0),
    };
  }, [result]);

  const handleImportPdf = async () => {
    try {
      setIsImporting(true);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled) {
        return;
      }

      const asset = pickerResult.assets[0];
      const file = new File(asset.uri);
      const bytes = await file.bytes();
      const extraction = await extractScheduleFromPdfBytes(
        bytes,
        asset.name ?? 'feuille-de-route.pdf'
      );

      setResult(extraction);

      if (extraction.entries.length === 0) {
        Alert.alert(
          'Extraction limitee',
          extraction.extractionMode === 'local'
            ? 'Le PDF semble etre un scan image ou un format complexe. Configurez un service OCR distant pour obtenir un resultat fiable sur les PDF scannes.'
            : 'Le document a bien ete envoye vers le module OCR, mais aucun planning exploitable n\'a pu etre reconstruit automatiquement.'
        );
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'importer ou d\'analyser ce PDF.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Emploi du temps</Text>
          <Text style={styles.headerSubtitle}>Import PDF et calcul des temps de travail</Text>
        </View>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Feuille de route vers agenda journalier</Text>
          <Text style={styles.heroText}>
            Importez une feuille de route PDF. L&apos;application extrait les horaires detectables,
            reconstitue les services jour par jour et calcule les heures totales et l&apos;amplitude.
          </Text>
          <TouchableOpacity style={styles.importButton} onPress={handleImportPdf} disabled={isImporting}>
            {isImporting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <IconSymbol name="doc.text" size={20} color="#FFF" />
                <Text style={styles.importButtonText}>Importer un PDF</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>
            L&apos;import utilise l&apos;analyse locale pour les PDF texte et bascule vers un service OCR distant pour les PDF scannes si celui-ci est configure.
          </Text>
        </View>

        {result && (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Jours" value={String(totals.dayCount)} />
              <SummaryCard label="Services" value={String(totals.serviceCount)} />
              <SummaryCard label="Temps cumule" value={formatMinutes(totals.totalServiceMinutes)} />
              <SummaryCard label="Amplitude" value={formatMinutes(totals.totalAmplitudeMinutes)} />
            </View>

            <View style={styles.fileCard}>
              <Text style={styles.fileLabel}>Document charge</Text>
              <Text style={styles.fileName}>{result.fileName}</Text>
            </View>

            <View style={styles.fileCard}>
              <Text style={styles.fileLabel}>Moteur d&apos;analyse</Text>
              <Text style={styles.fileName}>{result.extractionProvider}</Text>
              <Text style={styles.engineText}>
                Mode {result.extractionMode === 'hybrid' ? 'hybride' : result.extractionMode}
              </Text>
            </View>

            {result.warnings.length > 0 && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Points d&apos;attention</Text>
                {result.warnings.map((warning) => (
                  <Text key={warning} style={styles.warningText}>
                    • {warning}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Agenda extrait</Text>
              <Text style={styles.sectionSubtitle}>Classement par jour et par horaire</Text>
            </View>

            {result.days.map((day) => (
              <DayCard key={day.date} day={day} />
            ))}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Texte source detecte</Text>
              <Text style={styles.sectionSubtitle}>Utile pour verifier ce que le parseur a compris</Text>
            </View>
            <View style={styles.rawTextCard}>
              <Text style={styles.rawText}>{result.extractedText || 'Aucun texte exploitable detecte.'}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DayCard({ day }: { day: ScheduleDay }) {
  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View>
          <Text style={styles.dayTitle}>{formatDay(day.date)}</Text>
          <Text style={styles.daySubtitle}>{day.entries.length} service(s)</Text>
        </View>
        <View style={styles.dayTotals}>
          <Text style={styles.dayTotalLabel}>Travail {formatMinutes(day.totalServiceMinutes)}</Text>
          <Text style={styles.dayTotalLabel}>Amplitude {formatMinutes(day.amplitudeMinutes)}</Text>
        </View>
      </View>

      {day.entries.map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={styles.timelineCol}>
            <Text style={styles.entryHours}>{entry.startTime}</Text>
            <View style={styles.timelineBar} />
            <Text style={styles.entryHours}>{entry.endTime}</Text>
          </View>

          <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryDuration}>{formatMinutes(entry.durationMinutes)}</Text>
            </View>

            {(entry.origin || entry.destination) && (
              <Text style={styles.entryRoute}>
                {entry.origin ?? 'Depart'} → {entry.destination ?? 'Arrivee'}
              </Text>
            )}

            <Text style={styles.entrySource}>{entry.sourceText}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${String(remaining).padStart(2, '0')}`;
}

function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#E5F2E6',
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  heroText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  importButton: {
    marginTop: 18,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  importButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: {
    color: COLORS.primaryDark,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 13,
  },
  fileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  fileLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fileName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  engineText: {
    color: COLORS.muted,
    marginTop: 8,
    fontSize: 13,
  },
  warningCard: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    color: COLORS.warningText,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  warningText: {
    color: COLORS.warningText,
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  daySubtitle: {
    marginTop: 4,
    color: COLORS.muted,
  },
  dayTotals: {
    alignItems: 'flex-end',
  },
  dayTotalLabel: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineCol: {
    width: 54,
    alignItems: 'center',
    paddingTop: 4,
  },
  entryHours: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  timelineBar: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.accent,
    marginVertical: 6,
    minHeight: 38,
  },
  entryCard: {
    flex: 1,
    backgroundColor: '#F8FBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  entryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  entryDuration: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  entryRoute: {
    color: COLORS.primaryDark,
    marginTop: 8,
    fontWeight: '600',
  },
  entrySource: {
    marginTop: 8,
    color: COLORS.muted,
    lineHeight: 19,
    fontSize: 13,
  },
  rawTextCard: {
    backgroundColor: '#132016',
    borderRadius: 16,
    padding: 16,
  },
  rawText: {
    color: '#E2F6E4',
    fontSize: 12,
    lineHeight: 18,
  },
});
