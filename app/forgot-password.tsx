import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    setIsLoading(true);

    try {
      const success = await resetPassword(email);
      
      if (success) {
        Alert.alert(
          'Email envoyé !',
          'Un lien de réinitialisation a été envoyé à votre adresse email. Vérifiez votre boîte de réception.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)')
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Cette adresse email n\'est pas associée à un compte.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header avec bouton retour */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={24} color="#2D5016" />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>

          {/* Contenu principal */}
          <View style={styles.mainContent}>
            <View style={styles.iconContainer}>
              <IconSymbol name="key" size={60} color="#388E3C" />
            </View>

            <Text style={styles.title}>Mot de passe oublié ?</Text>
            <Text style={styles.subtitle}>
              Pas de souci ! Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>

            {/* Formulaire */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <IconSymbol name="envelope" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity 
                style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.resetButtonText}>Envoi en cours...</Text>
                ) : (
                  <Text style={styles.resetButtonText}>Envoyer le lien de réinitialisation</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Informations d'aide */}
            <View style={styles.helpContainer}>
              <View style={styles.helpItem}>
                <IconSymbol name="info.circle" size={16} color="#4A7C59" />
                <Text style={styles.helpText}>
                  Vérifiez aussi vos courriers indésirables
                </Text>
              </View>
              
              <View style={styles.helpItem}>
                <IconSymbol name="clock" size={16} color="#4A7C59" />
                <Text style={styles.helpText}>
                  Le lien expire dans 24 heures
                </Text>
              </View>

              <View style={styles.helpItem}>
                <IconSymbol name="phone" size={16} color="#4A7C59" />
                <Text style={styles.helpText}>
                  Besoin d&apos;aide ? Contactez votre administrateur
                </Text>
              </View>
            </View>
          </View>

          {/* Footer avec lien de retour à la connexion */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Vous vous souvenez de votre mot de passe ?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)')}>
              <Text style={styles.footerLink}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#2D5016',
    marginLeft: 5,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5016',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  resetButton: {
    backgroundColor: '#388E3C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    fontSize: 14,
    color: '#388E3C',
    fontWeight: '600',
  },
});