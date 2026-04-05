import { IconSymbol } from '@/components/ui/icon-symbol';
import type {
    AgendaDay,
    AgendaEntry,
    CalendarCell,
    ManualMission,
    ScheduleExtractionResult,
} from '@/types/schedule';
import { extractScheduleFromPdfBytes } from '@/utils/schedule-pdf';
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
    TextInput,
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

const MISSION_COLORS = ['#388E3C', '#1E88E5', '#F9A825', '#8E24AA', '#E53935', '#00897B'];


const CALENDAR_WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function EmploiDuTempsScreen() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ScheduleExtractionResult | null>(null);
  const [manualMissions, setManualMissions] = useState<ManualMission[]>([]);
  const [missionDate, setMissionDate] = useState(getTodayIsoDate());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayIsoDate());
  const [visibleMonth, setVisibleMonth] = useState(getMonthKeyFromIsoDate(getTodayIsoDate()));
  const [missionStartTime, setMissionStartTime] = useState('08:00');
  const [missionEndTime, setMissionEndTime] = useState('10:00');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionOrigin, setMissionOrigin] = useState('');
  const [missionDestination, setMissionDestination] = useState('');
  const [selectedMissionColor, setSelectedMissionColor] = useState(MISSION_COLORS[0]);

  const agendaDays = useMemo<AgendaDay[]>(() => {
    const importedEntries: AgendaEntry[] = (result?.entries ?? []).map((entry) => ({
      ...entry,
      sourceType: 'import',
      missionColor: undefined,
    }));

    const manualEntries: AgendaEntry[] = manualMissions.map((mission) => ({
      id: mission.id,
      date: mission.date,
      startTime: normalizeTimeInput(mission.startTime),
      endTime: normalizeTimeInput(mission.endTime),
      title: mission.title,
      origin: mission.origin,
      destination: mission.destination,
      durationMinutes: calculateDurationMinutes(
        normalizeTimeInput(mission.startTime),
        normalizeTimeInput(mission.endTime)
      ),
      sourceText: 'Mission ajoutee manuellement',
      confidence: 'high',
      sourceType: 'manual',
      missionColor: mission.missionColor,
    }));

    const grouped = new Map<string, AgendaEntry[]>();
    for (const entry of [...importedEntries, ...manualEntries]) {
      const dayEntries = grouped.get(entry.date) ?? [];
      dayEntries.push(entry);
      grouped.set(entry.date, dayEntries);
    }

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, entries]) => {
        const sortedEntries = [...entries].sort((left, right) => {
          if (left.startTime !== right.startTime) {
            return left.startTime.localeCompare(right.startTime);
          }

          return left.title.localeCompare(right.title);
        });

        return {
          date,
          entries: sortedEntries,
          totalServiceMinutes: sortedEntries.reduce(
            (sum, entry) => sum + entry.durationMinutes,
            0
          ),
          amplitudeMinutes:
            sortedEntries.length > 0
              ? calculateDurationMinutes(
                  sortedEntries[0].startTime,
                  sortedEntries[sortedEntries.length - 1].endTime
                )
              : 0,
        };
      });
  }, [manualMissions, result]);

  const totals = useMemo(() => {
    if (agendaDays.length === 0) {
      return {
        dayCount: 0,
        serviceCount: 0,
        totalServiceMinutes: 0,
        totalAmplitudeMinutes: 0,
      };
    }

    return {
      dayCount: agendaDays.length,
      serviceCount: agendaDays.reduce((sum, day) => sum + day.entries.length, 0),
      totalServiceMinutes: agendaDays.reduce((sum, day) => sum + day.totalServiceMinutes, 0),
      totalAmplitudeMinutes: agendaDays.reduce((sum, day) => sum + day.amplitudeMinutes, 0),
    };
  }, [agendaDays]);

  const selectedAgendaDay = useMemo(
    () => agendaDays.find((day) => day.date === selectedCalendarDate) ?? null,
    [agendaDays, selectedCalendarDate]
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonth, agendaDays),
    [agendaDays, visibleMonth]
  );

  const selectedDateStatus = useMemo(
    () => getDateStatus(selectedCalendarDate),
    [selectedCalendarDate]
  );

  const monthMissionCount = useMemo(
    () => calendarCells.reduce((sum, cell) => sum + (cell.isCurrentMonth ? cell.missionCount : 0), 0),
    [calendarCells]
  );

  const monthDaysWithMissions = useMemo(
    () => calendarCells.filter((cell) => cell.isCurrentMonth && cell.missionCount > 0).length,
    [calendarCells]
  );

  const handleSelectCalendarDate = (date: string) => {
    setSelectedCalendarDate(date);
    setMissionDate(date);
    setVisibleMonth(getMonthKeyFromIsoDate(date));
  };

  const handleAddMission = () => {
    const normalizedDate = missionDate.trim();
    const normalizedTitle = missionTitle.trim();
    const startTime = normalizeTimeInput(missionStartTime);
    const endTime = normalizeTimeInput(missionEndTime);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
      return;
    }

    if (!normalizedTitle) {
      Alert.alert('Mission incomplete', 'Ajoutez au minimum un titre de mission.');
      return;
    }

    if (!isValidTimeInput(startTime) || !isValidTimeInput(endTime)) {
      Alert.alert('Horaire invalide', 'Utilisez le format HH:MM pour les heures.');
      return;
    }

    const mission: ManualMission = {
      id: `manual-${Date.now()}`,
      date: normalizedDate,
      startTime,
      endTime,
      title: normalizedTitle,
      origin: missionOrigin.trim() || undefined,
      destination: missionDestination.trim() || undefined,
      missionColor: selectedMissionColor,
    };

    setManualMissions((current) => [...current, mission]);
  setSelectedCalendarDate(normalizedDate);
  setVisibleMonth(getMonthKeyFromIsoDate(normalizedDate));
    setMissionTitle('');
    setMissionOrigin('');
    setMissionDestination('');
    setMissionStartTime(endTime);
    setMissionEndTime(endTime);
  };

  const handleDeleteMission = (missionId: string) => {
    setManualMissions((current) => current.filter((mission) => mission.id !== missionId));
  };

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

        <View style={styles.heroCard}>
          <View style={styles.sectionHeaderCompact}>
            <Text style={styles.heroTitle}>Agenda manuel</Text>
            <Text style={styles.heroText}>
              Ajoutez vos missions a la main, jour par jour et heure par heure, avec une couleur libre pour visualiser rapidement votre planning.
            </Text>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={missionDate}
                onChangeText={setMissionDate}
                placeholder="2026-04-04"
                placeholderTextColor="#90A191"
              />
            </View>

            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Titre de mission</Text>
              <TextInput
                style={styles.input}
                value={missionTitle}
                onChangeText={setMissionTitle}
                placeholder="Ligne scolaire matin"
                placeholderTextColor="#90A191"
              />
            </View>

            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Debut</Text>
              <TextInput
                style={styles.input}
                value={missionStartTime}
                onChangeText={setMissionStartTime}
                placeholder="08:00"
                placeholderTextColor="#90A191"
              />
            </View>

            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Fin</Text>
              <TextInput
                style={styles.input}
                value={missionEndTime}
                onChangeText={setMissionEndTime}
                placeholder="10:30"
                placeholderTextColor="#90A191"
              />
            </View>

            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Depart</Text>
              <TextInput
                style={styles.input}
                value={missionOrigin}
                onChangeText={setMissionOrigin}
                placeholder="Depot, ecole, hopital..."
                placeholderTextColor="#90A191"
              />
            </View>

            <View style={styles.formFieldHalf}>
              <Text style={styles.inputLabel}>Arrivee</Text>
              <TextInput
                style={styles.input}
                value={missionDestination}
                onChangeText={setMissionDestination}
                placeholder="Destination"
                placeholderTextColor="#90A191"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Couleur de mission</Text>
          <View style={styles.colorRow}>
            {MISSION_COLORS.map((color) => {
              const isSelected = selectedMissionColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedMissionColor(color)}
                >
                  {isSelected && <IconSymbol name="checkmark.circle.fill" size={18} color="#FFF" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.addMissionButton} onPress={handleAddMission}>
            <IconSymbol name="checkmark.circle.fill" size={18} color="#FFF" />
            <Text style={styles.importButtonText}>Ajouter la mission</Text>
          </TouchableOpacity>

          {manualMissions.length > 0 && (
            <Text style={styles.helperText}>
              {manualMissions.length} mission(s) ajoutee(s) manuellement seront fusionnees avec les missions importees.
            </Text>
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.calendarHeaderRow}>
            <View>
              <Text style={styles.heroTitle}>Calendrier des missions</Text>
              <Text style={styles.heroText}>
                Choisissez une date exacte pour consulter une journee passee, presente ou future.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.todayShortcutButton}
              onPress={() => handleSelectCalendarDate(getTodayIsoDate())}
            >
              <Text style={styles.todayShortcutText}>Aujourd&apos;hui</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthNavigationRow}>
            <TouchableOpacity
              style={styles.monthNavButton}
              onPress={() => setVisibleMonth(shiftMonthKey(visibleMonth, -1))}
            >
              <IconSymbol name="chevron.left" size={18} color={COLORS.primaryDark} />
            </TouchableOpacity>

            <View style={styles.monthLabelBlock}>
              <Text style={styles.monthLabel}>{formatMonthLabel(visibleMonth)}</Text>
              <Text style={styles.monthSummaryText}>
                {monthDaysWithMissions} jour(s) charges • {monthMissionCount} mission(s)
              </Text>
            </View>

            <TouchableOpacity
              style={styles.monthNavButton}
              onPress={() => setVisibleMonth(shiftMonthKey(visibleMonth, 1))}
            >
              <IconSymbol name="chevron.right" size={18} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekdayLabel}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              const isSelected = cell.date === selectedCalendarDate;
              return (
                <TouchableOpacity
                  key={cell.date}
                  style={[
                    styles.calendarCell,
                    !cell.isCurrentMonth && styles.calendarCellMuted,
                    cell.isToday && styles.calendarCellToday,
                    isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => handleSelectCalendarDate(cell.date)}
                >
                  <Text
                    style={[
                      styles.calendarDayNumber,
                      !cell.isCurrentMonth && styles.calendarDayNumberMuted,
                      (cell.isToday || isSelected) && styles.calendarDayNumberActive,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                  {cell.missionCount > 0 ? (
                    <View style={[styles.calendarMissionDot, isSelected && styles.calendarMissionDotSelected]}>
                      <Text style={styles.calendarMissionCount}>{cell.missionCount}</Text>
                    </View>
                  ) : (
                    <View style={styles.calendarMissionPlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.selectedDateCard}>
            <View style={styles.selectedDateHeader}>
              <View>
                <Text style={styles.selectedDateLabel}>Date selectionnee</Text>
                <Text style={styles.selectedDateTitle}>{formatDay(selectedCalendarDate)}</Text>
              </View>
              <View style={[
                styles.dateStatusBadge,
                selectedDateStatus === 'past'
                  ? styles.dateStatusPast
                  : selectedDateStatus === 'present'
                    ? styles.dateStatusPresent
                    : styles.dateStatusFuture,
              ]}>
                <Text style={styles.dateStatusText}>{formatDateStatusLabel(selectedDateStatus)}</Text>
              </View>
            </View>

            {selectedAgendaDay ? (
              <View style={styles.selectedDateMetrics}>
                <View style={styles.selectedDateMetricCard}>
                  <Text style={styles.selectedDateMetricValue}>{selectedAgendaDay.entries.length}</Text>
                  <Text style={styles.selectedDateMetricLabel}>mission(s)</Text>
                </View>
                <View style={styles.selectedDateMetricCard}>
                  <Text style={styles.selectedDateMetricValue}>{formatMinutes(selectedAgendaDay.totalServiceMinutes)}</Text>
                  <Text style={styles.selectedDateMetricLabel}>travail</Text>
                </View>
                <View style={styles.selectedDateMetricCard}>
                  <Text style={styles.selectedDateMetricValue}>{formatMinutes(selectedAgendaDay.amplitudeMinutes)}</Text>
                  <Text style={styles.selectedDateMetricLabel}>amplitude</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.selectedDateEmptyText}>
                Aucune mission n&apos;est planifiee pour cette date. Vous pouvez l&apos;alimenter via l&apos;import PDF ou le formulaire manuel.
              </Text>
            )}
          </View>
        </View>

        {agendaDays.length > 0 && (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Jours" value={String(totals.dayCount)} />
              <SummaryCard label="Services" value={String(totals.serviceCount)} />
              <SummaryCard label="Temps cumule" value={formatMinutes(totals.totalServiceMinutes)} />
              <SummaryCard label="Amplitude" value={formatMinutes(totals.totalAmplitudeMinutes)} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Journee selectionnee</Text>
              <Text style={styles.sectionSubtitle}>Detail de la date choisie dans le calendrier</Text>
            </View>

            {selectedAgendaDay ? (
              <DayCard day={selectedAgendaDay} onDeleteMission={handleDeleteMission} />
            ) : (
              <View style={styles.emptyAgendaCard}>
                <Text style={styles.emptyAgendaTitle}>Aucun service sur cette date</Text>
                <Text style={styles.emptyAgendaText}>
                  Essayez une autre date du calendrier pour consulter un planning passe, en cours ou futur.
                </Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vue d&apos;ensemble</Text>
              <Text style={styles.sectionSubtitle}>Toutes les journees consolidees actuellement detectees</Text>
            </View>

            {agendaDays.map((day) => (
              <DayCard key={day.date} day={day} onDeleteMission={handleDeleteMission} />
            ))}

            {result && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Source PDF analysee</Text>
                  <Text style={styles.sectionSubtitle}>Informations issues de l&apos;import automatique</Text>
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
                  <Text style={styles.sectionTitle}>Texte source detecte</Text>
                  <Text style={styles.sectionSubtitle}>Utile pour verifier ce que le parseur a compris</Text>
                </View>
                <View style={styles.rawTextCard}>
                  <Text style={styles.rawText}>{result.extractedText || 'Aucun texte exploitable detecte.'}</Text>
                </View>
              </>
            )}
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

function DayCard({
  day,
  onDeleteMission,
}: {
  day: AgendaDay;
  onDeleteMission: (missionId: string) => void;
}) {
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
            <View
              style={[
                styles.timelineBar,
                entry.missionColor ? { backgroundColor: entry.missionColor } : null,
              ]}
            />
            <Text style={styles.entryHours}>{entry.endTime}</Text>
          </View>

          <View style={[styles.entryCard, entry.missionColor ? { borderLeftColor: entry.missionColor, borderLeftWidth: 5 } : null]}>
            <View style={styles.entryHeader}>
              <View style={styles.entryTitleBlock}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <View style={styles.entryMetaRow}>
                  <View
                    style={[
                      styles.sourceBadge,
                      entry.sourceType === 'manual' ? styles.manualBadge : styles.importBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        entry.sourceType === 'manual' ? styles.manualBadgeText : styles.importBadgeText,
                      ]}
                    >
                      {entry.sourceType === 'manual' ? 'Manuel' : 'Import PDF'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.entryActions}>
                <Text style={styles.entryDuration}>{formatMinutes(entry.durationMinutes)}</Text>
                {entry.sourceType === 'manual' && (
                  <TouchableOpacity onPress={() => onDeleteMission(entry.id)} style={styles.deleteButton}>
                    <IconSymbol name="xmark.circle.fill" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                )}
              </View>
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

function getTodayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

function getMonthKeyFromIsoDate(date: string): string {
  return date.slice(0, 7);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarCells(monthKey: string, agendaDays: AgendaDay[]): CalendarCell[] {
  const [yearValue, monthValue] = monthKey.split('-').map(Number);
  const monthStart = new Date(yearValue, monthValue - 1, 1);
  const monthStartWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(yearValue, monthValue - 1, 1 - monthStartWeekday);
  const missionCountByDate = new Map(agendaDays.map((day) => [day.date, day.entries.length]));
  const today = getTodayIsoDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const currentDate = new Date(gridStart);
    currentDate.setDate(gridStart.getDate() + index);
    const isoDate = toLocalIsoDate(currentDate);
    cells.push({
      date: isoDate,
      dayNumber: currentDate.getDate(),
      isCurrentMonth: getMonthKeyFromIsoDate(isoDate) === monthKey,
      isToday: isoDate === today,
      missionCount: missionCountByDate.get(isoDate) ?? 0,
    });
  }

  return cells;
}

function formatMonthLabel(monthKey: string): string {
  const [yearValue, monthValue] = monthKey.split('-').map(Number);
  return new Date(yearValue, monthValue - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearValue, monthValue] = monthKey.split('-').map(Number);
  const shifted = new Date(yearValue, monthValue - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function getDateStatus(date: string): 'past' | 'present' | 'future' {
  const today = getTodayIsoDate();

  if (date < today) {
    return 'past';
  }

  if (date > today) {
    return 'future';
  }

  return 'present';
}

function formatDateStatusLabel(status: 'past' | 'present' | 'future'): string {
  if (status === 'past') {
    return 'Passe';
  }

  if (status === 'future') {
    return 'A venir';
  }

  return 'Aujourd\'hui';
}

function normalizeTimeInput(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[:h.](\d{2})$/);
  if (!match) {
    return value.trim();
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function isValidTimeInput(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (end < start) {
    end += 24 * 60;
  }

  return end - start;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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
  sectionHeaderCompact: {
    marginBottom: 14,
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
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  formFieldHalf: {
    width: '48%',
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FBF7',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#DDEBDD',
  },
  addMissionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  todayShortcutButton: {
    backgroundColor: '#E7F3E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayShortcutText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  monthNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F7F0',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelBlock: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  monthSummaryText: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -2,
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  calendarCellMuted: {
    opacity: 0.45,
  },
  calendarCellToday: {
    backgroundColor: '#EAF5EB',
  },
  calendarCellSelected: {
    backgroundColor: COLORS.primary,
  },
  calendarDayNumber: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  calendarDayNumberMuted: {
    color: COLORS.muted,
  },
  calendarDayNumberActive: {
    color: '#FFF',
  },
  calendarMissionDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  calendarMissionDotSelected: {
    backgroundColor: '#FFF',
  },
  calendarMissionCount: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  calendarMissionPlaceholder: {
    height: 18,
    marginTop: 4,
  },
  selectedDateCard: {
    marginTop: 12,
    backgroundColor: '#F8FBF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedDateLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedDateTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'capitalize',
  },
  dateStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateStatusPast: {
    backgroundColor: '#ECEFF1',
  },
  dateStatusPresent: {
    backgroundColor: '#DFF3E3',
  },
  dateStatusFuture: {
    backgroundColor: '#E7F0FF',
  },
  dateStatusText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedDateMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  selectedDateMetricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedDateMetricValue: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
  selectedDateMetricLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  selectedDateEmptyText: {
    marginTop: 14,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
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
  emptyAgendaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  emptyAgendaTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyAgendaText: {
    color: COLORS.muted,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
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
  entryTitleBlock: {
    flex: 1,
  },
  entryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  entryMetaRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  importBadge: {
    backgroundColor: '#E8F1FF',
  },
  manualBadge: {
    backgroundColor: '#E7F6EA',
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  importBadgeText: {
    color: '#2055A8',
  },
  manualBadgeText: {
    color: COLORS.primaryDark,
  },
  entryActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  entryDuration: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 2,
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
