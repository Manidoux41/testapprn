# 🚌 Boîte à Outils - Chauffeur d'Autocar

Une application mobile dédiée aux chauffeurs d'autocar pour gérer leurs activités quotidiennes.

## 🔐 Authentification (Mode Test)

L'application utilise actuellement un système d'authentification mock avec des utilisateurs de test :

### Utilisateurs de test disponibles :

**Utilisateur 1 :**
- **Identifiant :** `chauffeur1` ou `jean.dupont@autocars.fr`
- **Mot de passe :** `password123`
- **Nom :** Jean Dupont
- **Numéro permis :** D123456
- **Entreprise :** Autocars de France

**Utilisateur 2 :**
- **Identifiant :** `driver2` ou `marie.martin@transports.fr`
- **Mot de passe :** `motdepasse`
- **Nom :** Marie Martin
- **Numéro permis :** D789012
- **Entreprise :** Transports Martin

## 📱 Fonctionnalités

### ✅ Implémentées
- **Page de connexion** avec thème vert professionnel
- **Authentification mock** avec validation
- **Dashboard personnalisé** avec :
  - Informations utilisateur
  - Statistiques rapides (km, trajets, ponctualité)
  - Boîte à outils (contrôles, journal, temps, incidents, etc.)
  - Notifications et rappels
- **Récupération mot de passe** (simulation)
- **Déconnexion sécurisée**

### 🔄 En développement
- Contrôles pré-trajet
- Journal de bord
- Suivi temps de conduite
- Gestion incidents
- Interface passagers
- Système de navigation

## 🚀 Installation et utilisation

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm start
# ou
expo start
```

## 🎨 Design

- **Palette de couleurs vert** adaptée au transport
- **Interface moderne** avec ombres et corners arrondis
- **Responsive design** pour différentes tailles d'écran
- **Icons système** cohérents

## 🔧 Structure technique

```
app/
├── (tabs)/
│   └── index.tsx          # Page de connexion
├── dashboard.tsx          # Dashboard principal
├── forgot-password.tsx    # Récupération mot de passe
└── _layout.tsx           # Configuration navigation

contexts/
└── AuthContext.tsx       # Gestion authentification

components/ui/
└── icon-symbol.tsx       # Composants icônes
```

## 📝 Notes de développement

- Utilise `react-native-safe-area-context` (solution recommandée)
- Navigation avec `expo-router`
- Contexte React pour l'état d'authentification
- TypeScript pour la sécurité de type

## 🔮 Prochaines étapes

1. Intégration API backend réelle
2. Persistance de session utilisateur
3. Développement des modules métier
4. Tests unitaires et d'intégration
5. Déploiement stores mobiles