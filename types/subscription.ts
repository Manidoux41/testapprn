import { SubscriptionPlan } from '@/types/auth';

export type PlanDefinition = {
  id: SubscriptionPlan;
  title: string;
  shortLabel: string;
  priceLabel: string;
  description: string;
  features: string[];
  accent: string;
};
