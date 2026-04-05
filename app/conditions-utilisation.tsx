import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = {
  id: string;
  title: string;
  content: string;
};

const SECTIONS: Section[] = [
  {
    id: '1',
    title: '1. Présentation de l\'application',
    content:
      'MMC Go Driver est une application mobile à destination des professionnels de la route : chauffeurs d\'autocar, ambulanciers, taxis, chauffeurs-livreurs et tout conducteur professionnel.\n\nElle est éditée et exploitée par MMC (ci-après "l\'Éditeur"). L\'application propose des outils métier tels que la navigation GPS adaptée aux poids lourds, la gestion d\'emploi du temps, le contrôle pré-trajet, le journal de bord et la gestion de flotte.',
  },
  {
    id: '2',
    title: '2. Acceptation des conditions',
    content:
      'L\'utilisation de MMC Go Driver implique l\'acceptation pleine et entière des présentes Conditions Générales d\'Utilisation (CGU). Si vous n\'acceptez pas ces conditions, vous devez cesser d\'utiliser l\'application immédiatement.\n\nL\'Éditeur se réserve le droit de modifier les CGU à tout moment. Les modifications entrent en vigueur dès leur publication dans l\'application. Il vous appartient de consulter régulièrement les CGU.',
  },
  {
    id: '3',
    title: '3. Inscription et compte utilisateur',
    content:
      'Pour accéder aux fonctionnalités de l\'application, vous devez créer un compte en fournissant des informations exactes et complètes.\n\nVous êtes responsable de la confidentialité de vos identifiants et de toutes les actions effectuées depuis votre compte. En cas de perte ou d\'utilisation non autorisée de vos identifiants, vous devez en informer l\'Éditeur dans les plus brefs délais.\n\nUn seul compte par personne physique est autorisé.',
  },
  {
    id: '4',
    title: '4. Forfaits et paiements',
    content:
      'MMC Go Driver propose trois niveaux d\'abonnement :\n\n• Forfait Gratuit (0 €/mois) : accès aux fonctionnalités de base, contrôle pré-trajet et navigation GPS simplifiée.\n\n• Forfait Intermédiaire (2,99 €/mois) : accès à l\'import PDF et OCR de feuilles de route, journal de bord, configuration avancée du véhicule.\n\n• Forfait Expert (8,99 €/mois) : accès à toutes les fonctionnalités, calcul d\'itinéraire poids lourd avancé, export KML/GPX, agenda complet.\n\nLes paiements sont traités de manière sécurisée. L\'abonnement est sans engagement et peut être résilié à tout moment. Aucun remboursement n\'est accordé pour les périodes en cours.',
  },
  {
    id: '5',
    title: '5. Utilisation des données GPS et localisation',
    content:
      'L\'application utilise les données de localisation GPS de votre appareil pour fournir les services de navigation et d\'enregistrement de trajet. Ces données sont traitées localement sur votre appareil et ne sont transmises à aucun serveur sans votre consentement explicite.\n\nSi vous exportez un fichier KML ou GPX représentant votre trajet, vous êtes responsable de son utilisation et de sa diffusion. L\'Éditeur ne pourra être tenu responsable des usages que vous faites de ces fichiers.',
  },
  {
    id: '6',
    title: '6. Données personnelles (RGPD)',
    content:
      'Conformément au Règlement Général sur la Protection des Données (RGPD), l\'Éditeur s\'engage à :\n\n• Collecter uniquement les données nécessaires au fonctionnement de l\'application.\n• Ne jamais vendre vos données à des tiers.\n• Vous permettre d\'accéder, de corriger et de supprimer vos données sur simple demande.\n• Conserver vos données de manière sécurisée.\n\nVous disposez d\'un droit d\'accès, de rectification, d\'effacement, de portabilité et d\'opposition conformément au RGPD. Pour exercer ces droits, contactez-nous à l\'adresse : contact@mmcgodriver.fr\n\nEn cas de violation de données, l\'Éditeur s\'engage à vous notifier dans les 72 heures conformément à la réglementation.',
  },
  {
    id: '7',
    title: '7. Propriété intellectuelle',
    content:
      'L\'intégralité du contenu de MMC Go Driver (code source, interface, icônes, textes, algorithmes) est la propriété exclusive de l\'Éditeur et est protégée par les lois françaises et internationales relatives à la propriété intellectuelle.\n\nIl est strictement interdit de copier, reproduire, modifier, distribuer ou exploiter tout ou partie de l\'application à des fins commerciales sans autorisation écrite préalable de l\'Éditeur.',
  },
  {
    id: '8',
    title: '8. Responsabilité',
    content:
      'L\'application MMC Go Driver est un outil d\'aide à la conduite professionnelle. Elle ne remplace en aucun cas le jugement du conducteur ni le respect du Code de la Route et des réglementations professionnelles en vigueur.\n\nL\'Éditeur décline toute responsabilité en cas de :\n• Accident ou incident survenu lors de l\'utilisation de l\'application.\n• Erreur dans le calcul d\'itinéraire ou les données GPS.\n• Perte de données liée à un dysfonctionnement de l\'application.\n• Interruption temporaire du service pour maintenance.\n\nIl appartient au conducteur professionnel de vérifier les informations fournies par l\'application avant d\'agir.',
  },
  {
    id: '9',
    title: '9. Disponibilité du service',
    content:
      'L\'Éditeur s\'efforce d\'assurer la disponibilité de l\'application 24h/24 et 7j/7, mais ne peut garantir une disponibilité ininterrompue. Des interruptions pour maintenance, mise à jour ou force majeure peuvent survenir.\n\nL\'accès à certaines fonctionnalités dépend de services tiers (OpenRouteService pour la navigation, services OCR pour l\'import PDF). L\'Éditeur ne peut être tenu responsable des indisponibilités de ces services.',
  },
  {
    id: '10',
    title: '10. Résiliation',
    content:
      'Vous pouvez supprimer votre compte et résilier votre abonnement à tout moment depuis les paramètres de l\'application ou en contactant l\'Éditeur.\n\nL\'Éditeur se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, sans préavis ni remboursement.',
  },
  {
    id: '11',
    title: '11. Droit applicable',
    content:
      'Les présentes CGU sont régies par le droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents de Paris seront seuls compétents.\n\nVersion en vigueur : avril 2026\nÉditeur : MMC – contact@mmcgodriver.fr',
  },
];

export default function ConditionsUtilisationScreen() {
  const [expanded, setExpanded] = useState<string | null>('1');

  const toggleSection = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Conditions d&apos;utilisation</Text>
          <Text style={styles.headerSubtitle}>MMC Go Driver</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badge version */}
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version en vigueur : Avril 2026</Text>
        </View>

        {/* Introduction */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Bienvenue sur <Text style={styles.introStrong}>MMC Go Driver</Text>, votre boîte à outils numérique pour les professionnels de la route. Veuillez lire attentivement les conditions suivantes avant d&apos;utiliser l&apos;application.
          </Text>
        </View>

        {/* Sections accordéon */}
        {SECTIONS.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity
                style={[styles.sectionHeader, isOpen && styles.sectionHeaderOpen]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTitle, isOpen && styles.sectionTitleOpen]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionArrow, isOpen && styles.sectionArrowOpen]}>
                  {isOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionText}>{section.content}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Nous contacter</Text>
          <Text style={styles.contactText}>
            Pour toute question relative à ces conditions d&apos;utilisation ou à l&apos;exercice de vos droits RGPD :
          </Text>
          <Text style={styles.contactEmail}>contact@mmcgodriver.fr</Text>
        </View>

        {/* Bouton retour bas */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>Fermer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#A8D5A2',
    fontSize: 13,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  versionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#388E3C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#388E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  introText: {
    color: '#2D5016',
    fontSize: 14,
    lineHeight: 22,
  },
  introStrong: {
    fontWeight: '700',
    color: '#388E3C',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderOpen: {
    backgroundColor: '#E8F5E8',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
    paddingRight: 8,
  },
  sectionTitleOpen: {
    color: '#388E3C',
  },
  sectionArrow: {
    fontSize: 11,
    color: '#8FA891',
  },
  sectionArrowOpen: {
    color: '#388E3C',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E8',
    backgroundColor: '#FAFFFE',
  },
  sectionText: {
    color: '#4A5568',
    fontSize: 13,
    lineHeight: 22,
    marginTop: 12,
  },
  contactCard: {
    backgroundColor: '#2D5016',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  contactTitle: {
    color: '#A8D5A2',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactEmail: {
    color: '#A8D5A2',
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#388E3C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
