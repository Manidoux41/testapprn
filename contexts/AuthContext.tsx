import React, { createContext, ReactNode, useContext, useState } from 'react';

export type SubscriptionPlan = 'free' | 'private' | 'expert';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  companyName: string;
  plan: SubscriptionPlan;
}

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  licenseNumber: string;
  plan: SubscriptionPlan;
}

interface LoginOptions {
  testPlan?: SubscriptionPlan;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, options?: LoginOptions) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  changePlan: (plan: SubscriptionPlan) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Données utilisateur mock
const MOCK_USERS = [
  {
    id: '1',
    username: 'chauffeur1',
    email: 'jean.dupont@autocars.fr',
    password: 'password123',
    firstName: 'Jean',
    lastName: 'Dupont',
    licenseNumber: 'D123456',
    companyName: 'Autocars de France'
  },
  {
    id: '2',
    username: 'driver2',
    email: 'marie.martin@transports.fr',
    password: 'motdepasse',
    firstName: 'Marie',
    lastName: 'Martin',
    licenseNumber: 'D789012',
    companyName: 'Transports Martin'
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (
    identifier: string,
    password: string,
    options?: LoginOptions
  ): Promise<boolean> => {
    setIsLoading(true);

    // Simulation d'appel API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mode développement : accepte n'importe quel identifiant/mot de passe
    // TODO: Remplacer par un vrai appel API quand la base de données sera connectée
    const emailPart = identifier.includes('@') ? identifier : `${identifier}@autocars.fr`;
    const namePart = identifier.includes('@') ? identifier.split('@')[0] : identifier;

    setUser({
      id: 'dev-user',
      username: namePart,
      email: emailPart,
      firstName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      lastName: 'Utilisateur',
      licenseNumber: 'D000000',
      companyName: 'Mon Entreprise',
      plan: __DEV__ ? options?.testPlan ?? 'free' : 'free',
    });
    setIsLoading(false);
    return true;
  };

  const register = async (payload: RegisterPayload): Promise<boolean> => {
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1200));

    const username = payload.email.split('@')[0];

    setUser({
      id: `user-${Date.now()}`,
      username,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      licenseNumber: payload.licenseNumber || 'D000000',
      companyName: payload.companyName || 'Indépendant',
      plan: payload.plan,
    });

    setIsLoading(false);
    return true;
  };

  const changePlan = async (plan: SubscriptionPlan): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setUser({
      ...user,
      plan,
    });

    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulation d'appel API
    await new Promise(resolve => setTimeout(resolve, 1500));

    const userExists = MOCK_USERS.some(u => u.email === email);
    
    setIsLoading(false);
    return userExists;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    changePlan,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}