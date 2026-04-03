const readEnv = (value?: string): string => value?.trim() ?? '';

export const ENV_FILE_PATH = '.env';

export const appEnv = {
  scheduleOcrApiUrl: readEnv(process.env.EXPO_PUBLIC_SCHEDULE_OCR_API_URL),
  ocrSpaceApiKey: readEnv(process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY),
  openRouteServiceApiKey: readEnv(process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY),
} as const;

export const envMessages = {
  remoteOcrMissing:
    'Ce PDF semble etre scanne. Configurez le service OCR dans le fichier .env pour activer l\'OCR distant.',
  routePlannerMissing:
    'Pour une vraie recherche poids lourd avec contraintes gabarit et tonnage, renseignez la cle OpenRouteService dans le fichier .env.',
} as const;