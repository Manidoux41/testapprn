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

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    try {
      const success = await login(identifier, password);
      
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
        <View style={styles.content}>
          {/* Header avec logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <IconSymbol name="autostart" size={60} color="#2D5016" />
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
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Votre compagnon de route digital</Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 32,
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
    marginBottom: 40,
  },
  registerButtonText: {
    color: '#2D5016',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    color: '#6FA474',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
