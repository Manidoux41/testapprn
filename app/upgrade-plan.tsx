import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPlanDefinition } from '@/constants/subscription-plans';
import { SubscriptionPlan, useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizePlan(plan: string | string[] | undefined): SubscriptionPlan {
  const rawPlan = Array.isArray(plan) ? plan[0] : plan;

  if (rawPlan === 'private' || rawPlan === 'expert') {
    return rawPlan;
  }

  return 'private';
}

export default function UpgradePlanScreen() {
  const { plan } = useLocalSearchParams<{ plan?: string | string[] }>();
  const { user, changePlan, isLoading } = useAuth();
  const targetPlan = normalizePlan(plan);
  const targetPlanDefinition = useMemo(() => getPlanDefinition(targetPlan), [targetPlan]);
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Session indisponible', 'Reconnectez-vous avant de changer de forfait.', [
        { text: 'Retour', onPress: () => router.replace('/') },
      ]);
      return;
    }

    if (!cardholder || !cardNumber || !expiry || !cvv) {
      Alert.alert('Paiement incomplet', 'Renseignez les informations de paiement de test pour continuer.');
      return;
    }

    const success = await changePlan(targetPlan);

    if (!success) {
      Alert.alert('Paiement refuse', 'Le changement de forfait a echoue. Reessayez dans quelques instants.');
      return;
    }

    Alert.alert(
      'Paiement confirme',
      `Votre forfait ${targetPlanDefinition.shortLabel} est maintenant actif.`,
      [{ text: 'Continuer', onPress: () => router.replace('/dashboard') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={18} color="#1F4D28" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Paiement du forfait</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{targetPlanDefinition.title}</Text>
            <Text style={[styles.heroPrice, { color: targetPlanDefinition.accent }]}>
              {targetPlanDefinition.priceLabel}
            </Text>
            <Text style={styles.heroSubtitle}>
              Le passage au forfait superieur impose une etape de paiement. Ce formulaire reste en mode mock jusqu'au branchement du PSP final.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fonctionnalites debloquees</Text>
            {targetPlanDefinition.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={targetPlanDefinition.accent} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiement</Text>
            <View style={styles.paymentBox}>
              <TextInput
                style={styles.input}
                placeholder="Titulaire de la carte"
                placeholderTextColor="#7A947E"
                value={cardholder}
                onChangeText={setCardholder}
              />
              <TextInput
                style={styles.input}
                placeholder="Numero de carte de test"
                placeholderTextColor="#7A947E"
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={setCardNumber}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="MM/AA"
                  placeholderTextColor="#7A947E"
                  value={expiry}
                  onChangeText={setExpiry}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="CVV"
                  placeholderTextColor="#7A947E"
                  keyboardType="number-pad"
                  value={cvv}
                  onChangeText={setCvv}
                />
              </View>
              <Text style={styles.paymentNote}>
                Aucun changement de forfait n'est applique tant que ce formulaire n'est pas valide.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Paiement en cours...' : `Payer ${targetPlanDefinition.priceLabel}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF6EA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F4D28',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEEDC',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D6E6D6',
  },
  heroTitle: {
    color: '#1F3423',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: '#48614C',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#204B28',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureText: {
    flex: 1,
    color: '#2F4733',
    fontSize: 14,
  },
  paymentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDE9DD',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: '#1F3423',
    borderWidth: 1,
    borderColor: '#CBE0CB',
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  paymentNote: {
    color: '#58705C',
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#1F6B38',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});