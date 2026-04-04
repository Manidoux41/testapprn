# Boite a outils des professionnels de la route

Application mobile Expo / React Native destinee aux professionnels de la route: chauffeur d'autocar, ambulancier, taxi, chauffeur-livreur et autres usages metier mobiles.

Le projet est aujourd'hui un prototype fonctionnel centre sur quatre blocs: authentification mock avec forfaits, dashboard metier, navigation GPS enrichie et import PDF de feuilles de route avec extraction de planning.

## Vision produit

L'application a pour objectif de centraliser dans une seule interface:

- la connexion et la gestion du compte utilisateur;
- l'acces a des modules metier depuis un dashboard mobile;
- la navigation GPS avec contraintes vehicule;
- l'import de documents PDF pour reconstruire un planning journalier;
- l'evolution progressive vers des forfaits payants et des fonctions premium.

## Fonctionnalites actuellement disponibles

### Authentification et compte

- Ecran de connexion plein ecran, sans onglets visibles en bas.
- Login mock: toute combinaison identifiant / mot de passe ouvre l'application.
- En mode developpement uniquement, le login peut simuler un forfait de test.
- Ecran d'inscription avec creation de compte mock.
- Ecran mot de passe oublie.
- Deconnexion avec retour vers l'ecran de connexion.

### Forfaits et paiement mock

- Forfait `Free`: `0,00 EUR / mois`.
- Forfait `Private`: `2,99 EUR / mois`.
- Forfait `Intermediaire`: `8,99 EUR / mois`.
- Choix du forfait pendant l'inscription.
- Upgrade depuis le dashboard pour un compte `free` ou un forfait inferieur.
- Passage obligatoire par un ecran de paiement mock avant activation d'un forfait superieur.

### Dashboard metier

- Tableau de bord personnalise apres connexion.
- Affichage du profil utilisateur, de l'entreprise et du forfait actif.
- Tuiles d'acces rapide vers les modules de l'application.
- Zone d'upgrade pour debloquer les forfaits superieurs.
- Rappels et notifications metier de demonstration.

### Navigation GPS

- Carte avec position courante.
- Enregistrement de trajet en temps reel.
- Ajout de points de cheminement nommes.
- Import de fichiers `KML` et `GPX`.
- Export de trajets en `KML` ou `GPX`.
- Recherche d'itineraire entre un depart et une arrivee.
- Support d'un calcul de trajet poids lourd via OpenRouteService quand la cle API est configuree.
- Mode de demonstration si la cle d'itineraire n'est pas configuree.

### Configuration vehicule

- Configuration mock d'un vehicule professionnel directement dans le module GPS.
- Champs disponibles: type de vehicule, immatriculation, marque, longueur, hauteur, poids.
- Presets d'exemple pour plusieurs profils de vehicules.
- Cette zone n'est visible que pour le forfait `Intermediaire`.
- Les donnees ne sont pas encore persistantes: elles restent dans la session en cours.

### Emploi du temps et PDF

- Import d'une feuille de route au format PDF.
- Extraction des horaires detectables.
- Reconstruction d'un agenda jour par jour.
- Calcul du temps de service et de l'amplitude.
- Affichage du texte source extrait pour verification manuelle.
- Pipeline hybride d'analyse PDF: parsing local + OCR / IA distant configurable.
- Support des PDF texte et amelioration des PDF scannes si un service OCR est branche.

## Architecture fonctionnelle

### Parcours utilisateur actuellement en place

1. L'utilisateur arrive sur un ecran de connexion plein ecran.
2. Il peut se connecter en mode mock ou s'inscrire.
3. Une fois connecte, il accede au dashboard.
4. Depuis le dashboard, il ouvre les modules GPS ou Emploi du temps.
5. S'il veut changer de forfait vers un niveau superieur, il doit passer par l'ecran de paiement mock.

### Regles actuelles importantes

- Le choix de forfait au login n'est disponible qu'en developpement.
- En production, le forfait devra etre choisi uniquement via l'inscription ou un upgrade payant.
- Le changement de forfait superieur depuis le dashboard ne se fait jamais directement: un paiement mock est exige.
- La configuration vehicule n'est exposee que pour le forfait `Intermediaire`.

## Pile technique

- Expo 54
- React Native 0.81
- Expo Router
- TypeScript
- React Native Maps
- Expo Location
- Expo Document Picker
- Expo File System
- Expo Sharing
- React Navigation

## Installation

```bash
npm install
```

## Configuration environnement

Creer un fichier `.env` a partir de `.env.example`.

```bash
cp .env.example .env
```

Variables actuellement utilisees:

- `EXPO_PUBLIC_OPENROUTESERVICE_API_KEY`: cle API pour le calcul d'itineraire poids lourd.
- `EXPO_PUBLIC_SCHEDULE_OCR_API_URL`: URL d'un backend OCR / IA pour l'analyse des PDF scannes.
- `EXPO_PUBLIC_OCR_SPACE_API_KEY`: alternative rapide pour prototyper l'OCR distant.

Sans ces variables:

- la navigation GPS reste testable avec un mode de demonstration pour le calcul d'itineraire avance;
- l'import PDF continue de fonctionner pour les PDF texte, mais sera limite sur les PDF scannes.

## Lancer l'application

```bash
npm start
```

Commandes utiles:

```bash
npm run ios
npm run android
npm run web
npx tsc --noEmit
npm run lint
```

## Structure utile du projet

```text
app/
   _layout.tsx              Navigation stack racine
   (tabs)/index.tsx         Ecran de connexion plein ecran
   dashboard.tsx            Tableau de bord principal
   register.tsx             Inscription et choix du forfait
   upgrade-plan.tsx         Paiement mock obligatoire pour upgrade
   forgot-password.tsx      Recuperation de mot de passe
   navigation-gps.tsx       Carte, GPS, import/export GPX/KML, vehicule
   emploi-du-temps.tsx      Import PDF, agenda extrait, calcul des temps
contexts/
   AuthContext.tsx          Etat utilisateur mock, login, register, upgrade
constants/
   subscription-plans.ts    Definitions des forfaits et avantages
   env.ts                   Point d'acces centralise aux variables .env
utils/
   gpx-kml.ts               Import / export GPX et KML
   route-planner.ts         Calcul d'itineraire avec contraintes vehicule
   schedule-pdf.ts          Extraction et structuration du planning PDF
   schedule-ocr.ts          Branchement OCR / IA distant
```

## Forfaits actuellement documentes

### Free

- Connexion et dashboard
- Navigation de base
- Outils coeur de metier a enrichir ensuite

### Private

- Tout le forfait Free
- Import des feuilles de route PDF
- Analyse de planning enrichie

### Intermediaire

- Toutes les fonctions Private
- Configuration du vehicule professionnel
- Navigation GPS avancee avec gabarit vehicule

## Limites actuelles du prototype

- Pas de backend d'authentification reel.
- Pas de base de donnees connectee.
- Pas de persistance utilisateur ni vehicule.
- Paiement uniquement simule.
- Certaines tuiles du dashboard sont encore des placeholders.
- Les regles metier completes sur les temps de travail restent a affiner.

## Evolutions prevues

- Connexion API et base de donnees.
- Stockage des profils vehicule et des trajets.
- Paiement reel via PSP.
- OCR / IA de production pour tous les PDF scannes.
- Gestion plus fine des droits par forfait.
- Calcul reglementaire detaille des temps de travail et de conduite.

## Qualite et verification

Le projet peut etre verifie avec:

```bash
npx tsc --noEmit
npm run lint
```

## Licence

Usage interne / prototype en cours de construction.
