import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const toolboxItems = [
    {
      id: '1',
      title: 'Contrôles pré-trajet',
      description: 'Vérifications obligatoires',
      icon: 'checklist',
      color: '#388E3C'
    },
    {
      id: '2',
      title: 'Journal de bord',
      description: 'Enregistrer votre trajet',
      icon: 'book',
      color: '#2D5016'
    },
    {
      id: '3',
      title: 'Temps de conduite',
      description: 'Suivi des heures',
      icon: 'clock',
      color: '#4A7C59'
    },
    {
      id: '4',
      title: 'Incidents',
      description: 'Signaler un problème',
      icon: 'exclamationmark.triangle',
      color: '#FF6B35'
    },
    {
      id: '5',
      title: 'Passagers',
      description: 'Gestion des voyageurs',
      icon: 'person.3',
      color: '#388E3C'
    },
    {
      id: '6',
      title: 'Navigation',
      description: 'Itinéraires et GPS',
      icon: 'location',
      color: '#2D5016'
    },
    {
      id: '7',
      title: 'Emploi du temps',
      description: 'Import PDF et planning',
      icon: 'calendar',
      color: '#4A7C59'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header avec informations utilisateur */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <IconSymbol name="person.circle" size={50} color="#FFF" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.welcomeText}>Bienvenue,</Text>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.userRole}>Chauffeur • {user?.licenseNumber}</Text>
              <Text style={styles.companyName}>{user?.companyName}</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Forfait {user?.plan ?? 'free'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Statistiques rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>847</Text>
            <Text style={styles.statLabel}>km ce mois</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>23</Text>
            <Text style={styles.statLabel}>trajets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>ponctualité</Text>
          </View>
        </View>

        {/* Boîte à outils */}
        <View style={styles.toolboxContainer}>
          <Text style={styles.sectionTitle}>Votre boîte à outils</Text>
          <View style={styles.toolGrid}>
            {toolboxItems.map((tool) => (
              <TouchableOpacity 
                key={tool.id} 
                style={[styles.toolCard, { borderLeftColor: tool.color }]}
                onPress={() => {
                  if (tool.id === '6') {
                    router.push('/navigation-gps');
                  } else if (tool.id === '7') {
                    router.push('/emploi-du-temps');
                  } else {
                    Alert.alert('Fonctionnalité', `${tool.title} sera bientôt disponible !`);
                  }
                }}
              >
                <View style={styles.toolIcon}>
                  <IconSymbol name={tool.icon as any} size={28} color={tool.color} />
                </View>
                <View style={styles.toolContent}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rappels et notifications */}
        <View style={styles.notificationsContainer}>
          <Text style={styles.sectionTitle}>Rappels du jour</Text>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <IconSymbol name="bell" size={20} color="#FF6B35" />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Contrôle technique</Text>
              <Text style={styles.notificationText}>Votre autocar doit passer le CT dans 15 jours</Text>
            </View>
          </View>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <IconSymbol name="calendar" size={20} color="#388E3C" />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Formation sécurité</Text>
              <Text style={styles.notificationText}>Session programmée le 15 avril</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#388E3C',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    color: '#E8F5E8',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  userRole: {
    color: '#E8F5E8',
    fontSize: 14,
    opacity: 0.9,
  },
  companyName: {
    color: '#E8F5E8',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  planBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  logoutButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#388E3C',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  toolboxContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 15,
  },
  toolGrid: {
    gap: 12,
  },
  toolCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolIcon: {
    marginRight: 15,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#666',
  },
  notificationsContainer: {
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 13,
    color: '#666',
  },
});