# Boite a outils pour chauffeur d'autocar

Application mobile Expo / React Native destinee aux chauffeurs d'autocar.

Le projet fournit actuellement un parcours complet de demonstration avec connexion mock, inscription avec choix de forfait, dashboard metier, navigation GPS enrichie, import de feuilles de route PDF et reconstruction d'un emploi du temps exploitable pour le calcul des temps de travail.

## Fonctionnalites

- Connexion de demonstration sans backend: n'importe quelle adresse email et n'importe quel mot de passe donnent acces au dashboard.
- Inscription avec selection d'un forfait `free`, `private` ou `expert`.
- Paiement en mode maquette pour les forfaits payants.
- Dashboard chauffeur avec acces aux modules principaux.
- Navigation GPS avec carte, enregistrement de trajet, points de cheminement, import/export `KML` et `GPX`.
- Recherche d'itineraire poids lourd entre un point de depart et un point d'arrivee.
- Import PDF de feuille de route et extraction d'un planning journalier.
- Pipeline hybride pour l'analyse des PDF: parsing local + OCR distant configurable pour les PDF scannes.

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

## Installation

```bash
npm install
```

## Configuration

Creer un fichier `.env` a la racine du projet a partir de `.env.example`.

```bash
cp .env.example .env
```

Variables disponibles:

- `EXPO_PUBLIC_OPENROUTESERVICE_API_KEY`: cle API pour le calcul d'itineraire poids lourd.
- `EXPO_PUBLIC_SCHEDULE_OCR_API_URL`: URL d'un service OCR/IA distant pour les PDF scannes.
- `EXPO_PUBLIC_OCR_SPACE_API_KEY`: alternative rapide pour prototyper un OCR distant.

Sans ces variables:

- la navigation GPS reste testable, mais le calcul poids lourd bascule sur un mode de demonstration;
- l'import PDF fonctionne sur les PDF texte, mais sera limite sur les PDF scannes.

## Lancer l'application

```bash
npm start
```

Commandes utiles:

```bash
npm run ios
npm run android
npm run web
npm run lint
```

## Parcours actuellement en place

### Authentification

- L'ecran de connexion est volontairement en mode mock.
- Toute combinaison email / mot de passe permet d'entrer dans l'application.
- L'inscription cree un utilisateur de demonstration avec le forfait selectionne.

### Forfaits

- `Free`: `0,00 EUR / mois`
- `Private`: `2,99 EUR / mois`
- `Expert`: `8,99 EUR / mois`

Le paiement est actuellement simule dans l'interface. Le branchement a un prestataire de paiement sera ajoute ensuite.

### Navigation GPS

Le module GPS permet de:

- visualiser une carte;
- enregistrer un trajet en temps reel;
- ajouter des points de cheminement nommes;
- importer ou exporter un trajet en `KML` ou `GPX`;
- calculer un itineraire avec contraintes de vehicule lourd.

Contraintes actuellement configurees:

- longueur: plus de `12 m`
- poids: plus de `19 t`
- hauteur maximale: `3,40 m`

## Module Emploi du temps

Le module Emploi du temps permet de:

- importer une feuille de route PDF;
- extraire les horaires detectables;
- reconstituer un agenda jour par jour;
- calculer les temps de service et l'amplitude;
- afficher le texte source detecte pour controle manuel.

Pour les PDF scannes, un service OCR/IA distant est recommande pour obtenir un resultat fiable.

## Structure utile du projet

```text
app/
   (tabs)/index.tsx        Ecran de connexion
   register.tsx            Inscription et choix du forfait
   dashboard.tsx           Tableau de bord chauffeur
   navigation-gps.tsx      Carte, itineraire, import/export GPX/KML
   emploi-du-temps.tsx     Import PDF et planning journalier
contexts/
   AuthContext.tsx         Etat utilisateur mock et forfaits
utils/
   route-planner.ts        Calcul d'itineraire poids lourd
   gpx-kml.ts              Parsing et export GPX/KML
   schedule-pdf.ts         Extraction et structuration du planning PDF
   schedule-ocr.ts         Branchement OCR/IA distant
constants/
   env.ts                  Centralisation des variables d'environnement
```

## Etat actuel du projet

Ce projet est un prototype fonctionnel oriente validation produit.

Les points suivants restent a brancher pour passer en version plus complete:

- backend d'authentification reel;
- persistance des utilisateurs et des forfaits;
- paiement reel;
- service OCR/IA de production;
- regles metier precises sur les temps de travail conducteur.

## Qualite

Le projet inclut une verification ESLint via:

```bash
npm run lint
```

## Licence

Usage interne / prototype en cours de construction.
