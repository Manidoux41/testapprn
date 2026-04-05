import { appEnv, envMessages } from '@/constants/env';
import type { HeavyRoutePlan, RouteCoordinate, VehicleConstraints } from '@/types/route';

export type { HeavyRoutePlan, RouteCoordinate, VehicleConstraints } from '@/types/route';

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_FRANCE_CENTER: RouteCoordinate = {
  latitude: 46.603354,
  longitude: 1.888334,
};

export async function planHeavyVehicleRoute(params: {
  departure: string;
  arrival: string;
  vehicle: VehicleConstraints;
}): Promise<HeavyRoutePlan> {
  const departure = params.departure.trim();
  const arrival = params.arrival.trim();

  if (!departure || !arrival) {
    throw new Error('Le depart et l\'arrivee sont requis.');
  }

  const [from, to] = await Promise.all([
    geocodeAddress(departure),
    geocodeAddress(arrival),
  ]);

  const apiKey = appEnv.openRouteServiceApiKey;
  if (!apiKey) {
    return buildFallbackRoute(from, to, params.vehicle, [
      'Aucune cle OpenRouteService configuree. Itineraire de demonstration affiche sur la carte.',
      envMessages.routePlannerMissing,
    ]);
  }

  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
        instructions: false,
        preference: 'recommended',
        options: {
          vehicle_type: 'hgv',
          profile_params: {
            restrictions: {
              length: params.vehicle.lengthMeters,
              weight: params.vehicle.weightTons,
              height: params.vehicle.heightMeters,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Reponse de routage invalide.');
    }

    const data = await response.json();
    const feature = data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;

    if (!Array.isArray(coordinates) || coordinates.length < 2 || !summary) {
      throw new Error('Aucun itineraire exploitable n\'a ete retourne.');
    }

    const routeCoordinates: RouteCoordinate[] = coordinates.map((item: number[]) => ({
      latitude: item[1],
      longitude: item[0],
    }));

    return {
      title: `Itineraire ${from.label} -> ${to.label}`,
      departureLabel: from.label,
      arrivalLabel: to.label,
      coordinates: routeCoordinates,
      distanceKm: round(summary.distance / 1000, 1),
      durationMinutes: Math.max(1, Math.round(summary.duration / 60)),
      warnings: [],
      provider: 'openrouteservice',
      aiSummary: buildAiSummary({
        provider: 'openrouteservice',
        distanceKm: round(summary.distance / 1000, 1),
        durationMinutes: Math.max(1, Math.round(summary.duration / 60)),
        vehicle: params.vehicle,
        warnings: [],
      }),
      start: { latitude: from.latitude, longitude: from.longitude },
      end: { latitude: to.latitude, longitude: to.longitude },
    };
  } catch {
    return buildFallbackRoute(from, to, params.vehicle, [
      'Le moteur de routage poids lourd n\'a pas pu etre joint.',
      'Un trace de secours a ete genere pour continuer les tests de l\'ecran GPS.',
    ]);
  }
}

async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinateMatch) {
    return {
      label: `Coordonnees ${coordinateMatch[1]}, ${coordinateMatch[2]}`,
      latitude: Number.parseFloat(coordinateMatch[1]),
      longitude: Number.parseFloat(coordinateMatch[2]),
    };
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr',
        'User-Agent': 'boite-a-outils-chauffeur/1.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Impossible de geocoder l\'adresse.');
  }

  const results = await response.json();
  const first = results?.[0];
  if (!first) {
    throw new Error(`Adresse introuvable: ${query}`);
  }

  return {
    label: simplifyLabel(first.display_name || query),
    latitude: Number.parseFloat(first.lat),
    longitude: Number.parseFloat(first.lon),
  };
}

function buildFallbackRoute(
  from: GeocodeResult,
  to: GeocodeResult,
  vehicle: VehicleConstraints,
  warnings: string[]
): HeavyRoutePlan {
  const coordinates = interpolateLine(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude },
    24
  );
  const distanceKm = estimateDistanceKm(coordinates);
  const durationMinutes = Math.max(1, Math.round((distanceKm / 65) * 60));

  return {
    title: `Simulation ${from.label} -> ${to.label}`,
    departureLabel: from.label,
    arrivalLabel: to.label,
    coordinates,
    distanceKm,
    durationMinutes,
    warnings,
    provider: 'fallback',
    aiSummary: buildAiSummary({
      provider: 'fallback',
      distanceKm,
      durationMinutes,
      vehicle,
      warnings,
    }),
    start: { latitude: from.latitude, longitude: from.longitude },
    end: { latitude: to.latitude, longitude: to.longitude },
  };
}

function interpolateLine(start: RouteCoordinate, end: RouteCoordinate, steps: number): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const curveOffset = Math.sin(ratio * Math.PI) * 0.12;
    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio + curveOffset,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
    });
  }
  return coordinates;
}

function estimateDistanceKm(coordinates: RouteCoordinate[]): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineKm(coordinates[index - 1], coordinates[index]);
  }
  return round(total, 1);
}

function haversineKm(first: RouteCoordinate, second: RouteCoordinate): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDistance = toRad(second.latitude - first.latitude);
  const longitudeDistance = toRad(second.longitude - first.longitude);
  const latitude1 = toRad(first.latitude);
  const latitude2 = toRad(second.latitude);

  const a =
    Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
    Math.cos(latitude1) * Math.cos(latitude2) *
    Math.sin(longitudeDistance / 2) * Math.sin(longitudeDistance / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function buildAiSummary(params: {
  provider: HeavyRoutePlan['provider'];
  distanceKm: number;
  durationMinutes: number;
  vehicle: VehicleConstraints;
  warnings: string[];
}): string {
  const hours = Math.floor(params.durationMinutes / 60);
  const minutes = params.durationMinutes % 60;
  const formattedDuration = hours > 0 ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;

  const base = `Analyse IA: proposition d'itineraire pour un vehicule de ${params.vehicle.lengthMeters} m, ${params.vehicle.weightTons} t et ${params.vehicle.heightMeters} m. Distance estimee ${params.distanceKm} km pour ${formattedDuration}.`;

  if (params.provider === 'openrouteservice') {
    return `${base} Le moteur de routage poids lourd a ete interroge avec les contraintes de gabarit et de tonnage.`;
  }

  return `${base} Le calcul exact poids lourd n'etait pas disponible, un trace de demonstration a ete genere pour la preparation du trajet.`;
}

function simplifyLabel(label: string): string {
  return label.split(',').slice(0, 3).join(',').trim() || label;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getDefaultVehicleConstraints(): VehicleConstraints {
  return {
    lengthMeters: 12,
    weightTons: 19,
    heightMeters: 3.4,
  };
}

export function getDefaultMapCenter(): RouteCoordinate {
  return DEFAULT_FRANCE_CENTER;
}