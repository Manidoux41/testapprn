import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPlanDefinition, SUBSCRIPTION_PLANS } from '@/constants/subscription-plans';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionPlan } from '@/types/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
  ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTestPlan, setSelectedTestPlan] = useState<SubscriptionPlan>('free');
  const { login, isLoading } = useAuth();
  const canChooseTestPlan = __DEV__;
  const selectedPlanDefinition = getPlanDefinition(selectedTestPlan);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    try {
      const success = await login(identifier, password, {
        testPlan: selectedTestPlan,
      });
      
      if (success) {
        router.replace('/dashboard');
      } else {
        Alert.alert('Erreur de connexion', 'Identifiants incorrects. Veuillez réessayer.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion.');
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.content}>
          {/* Header avec logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <IconSymbol name={"paperplane.fill" as any} size={60} color="#2D5016" />
            </View>
            <Text style={styles.title}>Boîte à Outils</Text>
            <Text style={styles.subtitle}>Chauffeur d&apos;Autocar</Text>
          </View>

          {/* Formulaire de connexion */}
          <View style={styles.form}>
            <Text style={styles.welcomeText}>Connectez-vous à votre espace</Text>
            
            <View style={styles.inputContainer}>
              <IconSymbol name="person.circle" size={20} color="#4A7C59" />
              <TextInput
                style={styles.input}
                placeholder="Numéro de chauffeur ou email"
                placeholderTextColor="#8FA891"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol name="lock" size={20} color="#4A7C59" />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#8FA891"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <IconSymbol 
                  name={showPassword ? "eye.slash" : "eye"} 
                  size={20} 
                  color="#4A7C59" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>S&apos;inscrire</Text>
            </TouchableOpacity>

            {canChooseTestPlan ? (
              <View style={styles.devPlanCard}>
                <Text style={styles.devPlanTitle}>Mode test</Text>
                <Text style={styles.devPlanText}>
                  En developpement, vous pouvez choisir un forfait mock au login. En production, le choix du forfait passera uniquement par l&apos;inscription.
                </Text>

                <View style={styles.devPlanOptions}>
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = plan.id === selectedTestPlan;

                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.devPlanOption,
                          isSelected && {
                            borderColor: plan.accent,
                            backgroundColor: '#F3FBF4',
                          },
                        ]}
                        onPress={() => setSelectedTestPlan(plan.id)}
                      >
                        <Text style={styles.devPlanOptionTitle}>{plan.shortLabel}</Text>
                        <Text style={[styles.devPlanOptionPrice, { color: plan.accent }]}>{plan.priceLabel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.devPlanSelectedText}>
                  Le login de test ouvrira un compte {selectedPlanDefinition.shortLabel.toLowerCase()}.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerAppName}>MMC Go Driver</Text>
            <Text style={styles.footerText}>Votre compagnon de route digital</Text>
            <TouchableOpacity onPress={() => router.push('/conditions-utilisation')}>
              <Text style={styles.footerCgu}>Conditions d&apos;utilisation</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8', // Vert très clair pour le fond
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#C8E6C9', // Vert clair pour le cercle du logo
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5016', // Vert foncé
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A7C59',
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 18,
    color: '#2D5016',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2D5016',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#388E3C', // Vert principal
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#8FA891',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#4A7C59',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  registerButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#388E3C',
    paddingVertical: 16,
    backgroundColor: '#F5FBF5',
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#2D5016',
    fontSize: 17,
    fontWeight: '700',
  },
  devPlanCard: {
    marginTop: -6,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  devPlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 6,
  },
  devPlanText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#56705A',
  },
  devPlanOptions: {
    marginTop: 14,
    gap: 10,
  },
  devPlanOption: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D6E6D8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFCFA',
  },
  devPlanOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3423',
  },
  devPlanOptionPrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  devPlanSelectedText: {
    marginTop: 12,
    fontSize: 13,
    color: '#4A7C59',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  footerAppName: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerText: {
    color: '#6FA474',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    marginBottom: 8,
  },
  footerCgu: {
    color: '#388E3C',
    fontSize: 12,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
