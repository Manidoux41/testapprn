import { IconSymbol } from '@/components/ui/icon-symbol';
import { SUBSCRIPTION_PLANS } from '@/constants/subscription-plans';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionPlan } from '@/types/auth';
import { router } from 'expo-router';
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

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const selectedPlanDefinition = useMemo(
    () => SUBSCRIPTION_PLANS.find(plan => plan.id === selectedPlan) ?? SUBSCRIPTION_PLANS[0],
    [selectedPlan]
  );

  const requiresPayment = selectedPlan !== 'free';

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Informations manquantes', 'Veuillez renseigner vos informations principales.');
      return;
    }

    if (requiresPayment && (!cardholder || !cardNumber || !expiry || !cvv)) {
      Alert.alert('Paiement incomplet', 'Veuillez renseigner les informations de paiement de test.');
      return;
    }

    try {
      const success = await register({
        firstName,
        lastName,
        email,
        password,
        companyName,
        licenseNumber,
        plan: selectedPlan,
      });

      if (!success) {
        Alert.alert('Inscription impossible', 'Veuillez reessayer dans quelques instants.');
        return;
      }

      Alert.alert(
        'Compte cree',
        requiresPayment
          ? 'Le paiement est simule pour l instant. Votre abonnement de test est actif.'
          : 'Votre compte de test est pret.',
        [
          {
            text: 'Continuer',
            onPress: () => router.replace('/dashboard'),
          },
        ]
      );
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue pendant l inscription.');
    }
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
            <Text style={styles.topBarTitle}>Inscription</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Choisissez votre acces</Text>
            <Text style={styles.heroSubtitle}>
              Creez votre compte chauffeur et selectionnez le forfait adapte a votre usage.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations du compte</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Prenom"
                placeholderTextColor="#7A947E"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Nom"
                placeholderTextColor="#7A947E"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#7A947E"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#7A947E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Entreprise ou raison sociale"
              placeholderTextColor="#7A947E"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              style={styles.input}
              placeholder="Numero de permis ou matricule"
              placeholderTextColor="#7A947E"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choix du forfait</Text>
            {SUBSCRIPTION_PLANS.map(plan => {
              const isSelected = selectedPlan === plan.id;

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isSelected && { borderColor: plan.accent, backgroundColor: '#F3FBF4' },
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      <Text style={[styles.planPrice, { color: plan.accent }]}>{plan.priceLabel}</Text>
                    </View>
                    <View style={[styles.radioOuter, isSelected && { borderColor: plan.accent }]}>
                      {isSelected ? <View style={[styles.radioInner, { backgroundColor: plan.accent }]} /> : null}
                    </View>
                  </View>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                  {plan.features.map(feature => (
                    <View key={feature} style={styles.featureRow}>
                      <IconSymbol name="checkmark.circle.fill" size={16} color={plan.accent} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiement</Text>
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>{selectedPlanDefinition.title}</Text>
              <Text style={styles.paymentPrice}>{selectedPlanDefinition.priceLabel}</Text>
              <Text style={styles.paymentNote}>
                Systeme de paiement en mode maquette pour l instant. Le branchement a Stripe ou a un autre PSP pourra etre ajoute ensuite.
              </Text>

              {requiresPayment ? (
                <>
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
                </>
              ) : (
                <View style={styles.freeNotice}>
                  <IconSymbol name="gift.fill" size={18} color="#2F7D32" />
                  <Text style={styles.freeNoticeText}>Aucun paiement requis pour le forfait Free.</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Creation du compte...' : 'Creer mon compte'}
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
    backgroundColor: '#1F6B38',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#D7F0D9',
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
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#DDE9DD',
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3423',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#56705A',
    lineHeight: 20,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 8,
    color: '#28422D',
    fontSize: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#A4B9A7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDE9DD',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3924',
  },
  paymentPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F6B38',
    marginTop: 6,
  },
  paymentNote: {
    fontSize: 14,
    color: '#5F7963',
    lineHeight: 20,
    marginVertical: 12,
  },
  freeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8EE',
    padding: 12,
    borderRadius: 12,
  },
  freeNoticeText: {
    marginLeft: 10,
    color: '#2B5B33',
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
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
    fontSize: 17,
    fontWeight: '800',
  },
});