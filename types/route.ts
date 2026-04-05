export interface Waypoint {
  latitude: number;
  longitude: number;
  name: string;
  timestamp?: string;
}

export interface RouteData {
  title: string;
  waypoints: Waypoint[];
  trackPoints: { latitude: number; longitude: number; timestamp?: string }[];
}

export interface VehicleConstraints {
  lengthMeters: number;
  weightTons: number;
  heightMeters: number;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface HeavyRoutePlan {
  title: string;
  departureLabel: string;
  arrivalLabel: string;
  coordinates: RouteCoordinate[];
  distanceKm: number;
  durationMinutes: number;
  warnings: string[];
  provider: 'openrouteservice' | 'fallback';
  aiSummary: string;
  start: RouteCoordinate;
  end: RouteCoordinate;
}
