export type SubscriptionPlan = 'free' | 'private' | 'expert';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  companyName: string;
  plan: SubscriptionPlan;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  licenseNumber: string;
  plan: SubscriptionPlan;
}

export interface LoginOptions {
  testPlan?: SubscriptionPlan;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, options?: LoginOptions) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  changePlan: (plan: SubscriptionPlan) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
}
