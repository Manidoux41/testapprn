import type { SubscriptionPlan } from '@/types/auth';
import type { PlanDefinition } from '@/types/subscription';

export type { PlanDefinition } from '@/types/subscription';

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: 'free',
    title: 'Forfait Free',
    shortLabel: 'Free',
    priceLabel: '0,00 EUR / mois',
    description: 'Pour debuter avec les fonctionnalites essentielles.',
    features: ['Connexion et dashboard', 'Navigation de base', 'Outils coeur de metier a definir'],
    accent: '#4A7C59',
  },
  {
    id: 'private',
    title: 'Forfait Private',
    shortLabel: 'Private',
    priceLabel: '2,99 EUR / mois',
    description: 'Ajoute l import PDF et les fonctions avancees de planning.',
    features: ['Tout le forfait Free', 'Import des feuilles de route PDF', 'Analyse de planning enrichie'],
    accent: '#2D8C74',
  },
  {
    id: 'expert',
    title: 'Forfait Intermediaire',
    shortLabel: 'Intermediaire',
    priceLabel: '8,99 EUR / mois',
    description: 'Active les fonctions avancees sur le vehicule et la navigation metier.',
    features: ['Toutes les fonctions Private', 'Configuration du vehicule professionnel', 'Navigation GPS avancee et gabarit vehicule'],
    accent: '#1F6B38',
  },
];

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return SUBSCRIPTION_PLANS.find((item) => item.id === plan) ?? SUBSCRIPTION_PLANS[0];
}

export function getPlanLabel(plan?: SubscriptionPlan): string {
  if (!plan) {
    return 'Free';
  }

  return getPlanDefinition(plan).shortLabel;
}
