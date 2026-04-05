import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import {
    generateGPX,
    generateKML,
    parseGPX,
    parseKML,
    RouteData,
    Waypoint,
} from '@/utils/gpx-kml';
import {
    getDefaultVehicleConstraints,
    HeavyRoutePlan,
    planHeavyVehicleRoute,
} from '@/utils/route-planner';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const COLORS = {
  primary: '#388E3C',
  primaryDark: '#2D5016',
  primaryLight: '#4A7C59',
  accent: '#81C784',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  error: '#FF6B35',
  text: '#1A1A1A',
  textSecondary: '#666',
  border: '#E0E0E0',
  recording: '#D32F2F',
};

const VEHICLE_CONFIG_PLAN = 'expert';

type VehicleProfile = {
  vehicleType: string;
  registration: string;
  brand: string;
  lengthMeters: number;
  heightMeters: number;
  weightTons: number;
};

const VEHICLE_PRESETS: VehicleProfile[] = [
  {
    vehicleType: 'Autocar',
    registration: 'AB-456-CD',
    brand: 'Mercedes Tourismo',
    lengthMeters: 12.8,
    heightMeters: 3.4,
    weightTons: 19,
  },
  {
    vehicleType: 'Ambulance',
    registration: 'EF-237-GH',
    brand: 'Renault Master',
    lengthMeters: 6.2,
    heightMeters: 2.8,
    weightTons: 3.5,
  },
  {
    vehicleType: 'Taxi van',
    registration: 'IJ-908-KL',
    brand: 'Ford Tourneo',
    lengthMeters: 5.4,
    heightMeters: 2.1,
    weightTons: 2.6,
  },
  {
    vehicleType: 'Porteur livraison',
    registration: 'MN-654-OP',
    brand: 'Iveco Eurocargo',
    lengthMeters: 8.7,
    heightMeters: 3.15,
    weightTons: 11.9,
  },
];

function buildInitialVehicleProfile(): VehicleProfile {
  const defaults = getDefaultVehicleConstraints();

  return {
    vehicleType: 'Autocar',
    registration: 'AB-456-CD',
    brand: 'Mercedes Tourismo',
    lengthMeters: defaults.lengthMeters,
    heightMeters: defaults.heightMeters,
    weightTons: defaults.weightTons,
  };
}

function formatVehicleValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { height: 100%; width: 100%; }
    .leaflet-container { background: #e8f5e9; }
    .lbl { padding: 4px 8px; border-radius: 4px; font-size: 12px;
           font-family: sans-serif; white-space: nowrap;
           box-shadow: 0 2px 4px rgba(0,0,0,.3); color: #fff; }
    .lbl-start { background: #388E3C; }
    .lbl-end   { background: #D32F2F; }
    .lbl-wp    { background: #FF8F00; font-size: 11px; padding: 3px 7px; }
    .lbl-imp   { background: #1976D2; font-size: 11px; padding: 3px 7px; }
    .user-dot  { width: 16px; height: 16px; background: #388E3C;
                 border: 3px solid #fff; border-radius: 50%;
                 box-shadow: 0 0 8px rgba(0,0,0,.4); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { center: [46.603354, 1.888334], zoom: 6, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    var lyr = { user: null, track: null, imported: null, planned: null,
                start: null, end: null, wps: [], impWps: [] };

    function mkIcon(html, ax, ay) {
      return L.divIcon({ html: html, className: '', iconSize: null, iconAnchor: [ax||0, ay||0] });
    }
    var userIcon = mkIcon('<div class="user-dot"></div>', 8, 8);

    function sendMsg(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    // Long press via touch timer
    var pressTimer = null, pressLL = null;
    map.getContainer().addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      pressLL = map.containerPointToLatLng(L.point(t.clientX, t.clientY));
      pressTimer = setTimeout(function() {
        if (pressLL) sendMsg({ type: 'longPress', latitude: pressLL.lat, longitude: pressLL.lng });
      }, 600);
    }, { passive: true });
    map.getContainer().addEventListener('touchend',   function() { clearTimeout(pressTimer); pressLL = null; }, { passive: true });
    map.getContainer().addEventListener('touchmove',  function() { clearTimeout(pressTimer); pressLL = null; }, { passive: true });
    map.on('contextmenu', function(e) { sendMsg({ type: 'longPress', latitude: e.latlng.lat, longitude: e.latlng.lng }); });

    // Commands from React Native
    function handle(ev) {
      try {
        var m = JSON.parse(ev.data);
        switch (m.action) {
          case 'setUserLocation':   setUser(m.lat, m.lng); break;
          case 'setTrackPoints':    setTrack(m.points); break;
          case 'setWaypoints':      setWps(m.waypoints); break;
          case 'setImportedData':   setImported(m.trackPoints, m.waypoints); break;
          case 'setPlannedRoute':   setPlanned(m.coords, m.start, m.end); break;
          case 'clearPlannedRoute': clearPlanned(); break;
          case 'fitBounds':         fitB(m.coords); break;
          case 'centerOn':          map.setView([m.lat, m.lng], m.zoom || 14, { animate: true }); break;
        }
      } catch(e) {}
    }
    document.addEventListener('message', handle);
    window.addEventListener('message', handle);

    function setUser(lat, lng) {
      if (lyr.user) { lyr.user.setLatLng([lat, lng]); }
      else { lyr.user = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map); map.setView([lat, lng], 14, { animate: true }); }
    }
    function setTrack(pts) {
      if (lyr.track) { map.removeLayer(lyr.track); lyr.track = null; }
      if (pts && pts.length > 1)
        lyr.track = L.polyline(pts.map(function(p){ return [p.latitude, p.longitude]; }), { color: '#D32F2F', weight: 5 }).addTo(map);
    }
    function setWps(wps) {
      lyr.wps.forEach(function(m){ map.removeLayer(m); }); lyr.wps = [];
      (wps||[]).forEach(function(wp) {
        lyr.wps.push(L.marker([wp.latitude, wp.longitude], { icon: mkIcon('<div class="lbl lbl-wp">'+(wp.name||'Etape')+'</div>', 0, 10) }).addTo(map));
      });
    }
    function setImported(tps, wps) {
      if (lyr.imported) { map.removeLayer(lyr.imported); lyr.imported = null; }
      lyr.impWps.forEach(function(m){ map.removeLayer(m); }); lyr.impWps = [];
      if (tps && tps.length > 1)
        lyr.imported = L.polyline(tps.map(function(p){ return [p.latitude, p.longitude]; }), { color: '#1976D2', weight: 4, dashArray: '10,6' }).addTo(map);
      (wps||[]).forEach(function(wp) {
        lyr.impWps.push(L.marker([wp.latitude, wp.longitude], { icon: mkIcon('<div class="lbl lbl-imp">'+(wp.name||'Point')+'</div>', 0, 10) }).addTo(map));
      });
    }
    function setPlanned(coords, start, end) {
      clearPlanned();
      if (coords && coords.length > 1)
        lyr.planned = L.polyline(coords.map(function(c){ return [c.latitude, c.longitude]; }), { color: '#FF8F00', weight: 6 }).addTo(map);
      if (start) lyr.start = L.marker([start.latitude, start.longitude], { icon: mkIcon('<div class="lbl lbl-start">DEPART</div>', 35, 14) }).addTo(map);
      if (end)   lyr.end   = L.marker([end.latitude,   end.longitude],   { icon: mkIcon('<div class="lbl lbl-end">ARRIVEE</div>', 38, 14) }).addTo(map);
    }
    function clearPlanned() {
      ['planned','start','end'].forEach(function(k){ if(lyr[k]){ map.removeLayer(lyr[k]); lyr[k]=null; } });
    }
    function fitB(coords) {
      if (!coords || coords.length === 0) return;
      map.fitBounds(L.latLngBounds(coords.map(function(c){ return [c.latitude, c.longitude]; })), { padding: [60,60], maxZoom: 15, animate: true });
    }
  </script>
</body>
</html>`;

export default function NavigationGPSScreen() {
  const mapRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const { user } = useAuth();

  // Position & permissions
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Enregistrement du trajet
  const [isRecording, setIsRecording] = useState(false);
  const [trackPoints, setTrackPoints] = useState<RouteData['trackPoints']>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeTitle, setRouteTitle] = useState('');
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Import
  const [importedTrackPoints, setImportedTrackPoints] = useState<RouteData['trackPoints']>([]);
  const [importedWaypoints, setImportedWaypoints] = useState<Waypoint[]>([]);
  const [importedTitle, setImportedTitle] = useState('');

  // Recherche d'itineraire poids lourd
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [plannedRoute, setPlannedRoute] = useState<HeavyRoutePlan | null>(null);
  const [vehicleProfile, setVehicleProfile] = useState<VehicleProfile>(buildInitialVehicleProfile);
  const [showVehicleConfigModal, setShowVehicleConfigModal] = useState(false);
  const [vehicleTypeInput, setVehicleTypeInput] = useState(vehicleProfile.vehicleType);
  const [registrationInput, setRegistrationInput] = useState(vehicleProfile.registration);
  const [brandInput, setBrandInput] = useState(vehicleProfile.brand);
  const [lengthInput, setLengthInput] = useState(vehicleProfile.lengthMeters.toString());
  const [heightInput, setHeightInput] = useState(formatVehicleValue(vehicleProfile.heightMeters));
  const [weightInput, setWeightInput] = useState(formatVehicleValue(vehicleProfile.weightTons));
  const canConfigureVehicle = user?.plan === VEHICLE_CONFIG_PLAN;
  const vehicleConstraints = useMemo(
    () => ({
      lengthMeters: vehicleProfile.lengthMeters,
      weightTons: vehicleProfile.weightTons,
      heightMeters: vehicleProfile.heightMeters,
    }),
    [vehicleProfile.heightMeters, vehicleProfile.lengthMeters, vehicleProfile.weightTons]
  );

  // Modals
  const [showWaypointModal, setShowWaypointModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showWaypointListModal, setShowWaypointListModal] = useState(false);
  const [pendingWaypointCoord, setPendingWaypointCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [waypointName, setWaypointName] = useState('');
  const [exportTitle, setExportTitle] = useState('');

  const openVehicleConfig = useCallback(() => {
    setVehicleTypeInput(vehicleProfile.vehicleType);
    setRegistrationInput(vehicleProfile.registration);
    setBrandInput(vehicleProfile.brand);
    setLengthInput(formatVehicleValue(vehicleProfile.lengthMeters));
    setHeightInput(formatVehicleValue(vehicleProfile.heightMeters));
    setWeightInput(formatVehicleValue(vehicleProfile.weightTons));
    setShowVehicleConfigModal(true);
  }, [vehicleProfile]);

  const applyVehiclePreset = useCallback((preset: VehicleProfile) => {
    setVehicleTypeInput(preset.vehicleType);
    setRegistrationInput(preset.registration);
    setBrandInput(preset.brand);
    setLengthInput(formatVehicleValue(preset.lengthMeters));
    setHeightInput(formatVehicleValue(preset.heightMeters));
    setWeightInput(formatVehicleValue(preset.weightTons));
  }, []);

  const saveVehicleConfiguration = useCallback(() => {
    const parsedLength = Number.parseFloat(lengthInput.replace(',', '.'));
    const parsedHeight = Number.parseFloat(heightInput.replace(',', '.'));
    const parsedWeight = Number.parseFloat(weightInput.replace(',', '.'));

    if (!vehicleTypeInput.trim() || !registrationInput.trim() || !brandInput.trim()) {
      Alert.alert('Configuration incomplete', 'Renseignez le type, la marque et l immatriculation du vehicule.');
      return;
    }

    if ([parsedLength, parsedHeight, parsedWeight].some((value) => Number.isNaN(value) || value <= 0)) {
      Alert.alert('Dimensions invalides', 'Saisissez une longueur, une hauteur et un poids valides.');
      return;
    }

    setVehicleProfile({
      vehicleType: vehicleTypeInput.trim(),
      registration: registrationInput.trim().toUpperCase(),
      brand: brandInput.trim(),
      lengthMeters: parsedLength,
      heightMeters: parsedHeight,
      weightTons: parsedWeight,
    });
    setShowVehicleConfigModal(false);
  }, [brandInput, heightInput, lengthInput, registrationInput, vehicleTypeInput, weightInput]);

  // ─── Permissions & localisation ───────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour la navigation GPS.'
        );
        return;
      }
      setHasPermission(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  // ─── Enregistrement du trajet ─────────────────────────
  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert('Permission requise', 'Autorisez la localisation pour enregistrer un trajet.');
      return;
    }

    setTrackPoints([]);
    setWaypoints([]);
    setIsRecording(true);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Mise à jour tous les 10 mètres
        timeInterval: 3000,   // ou toutes les 3 secondes
      },
      (newLocation) => {
        const point = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          timestamp: new Date(newLocation.timestamp).toISOString(),
        };
        setTrackPoints((prev) => [...prev, point]);
        setLocation(newLocation);
      }
    );
  }, [hasPermission]);

  const stopRecording = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsRecording(false);

    if (trackPoints.length > 0) {
      setExportTitle(routeTitle || 'Mon trajet');
      setShowExportModal(true);
    }
  }, [trackPoints.length, routeTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // ─── sendToMap helper ─────────────────────────────────
  const sendToMap = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    if (mapRef.current) {
      mapRef.current.postMessage(JSON.stringify({ action, ...payload }));
    }
  }, []);

  // ─── Sync état → carte après chargement ───────────────
  useEffect(() => {
    if (!mapReady || !location) return;
    sendToMap('setUserLocation', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
  }, [location, mapReady, sendToMap]);

  useEffect(() => {
    if (!mapReady) return;
    sendToMap('setTrackPoints', { points: trackPoints });
  }, [trackPoints, mapReady, sendToMap]);

  useEffect(() => {
    if (!mapReady) return;
    sendToMap('setWaypoints', { waypoints });
  }, [waypoints, mapReady, sendToMap]);

  useEffect(() => {
    if (!mapReady) return;
    sendToMap('setImportedData', {
      trackPoints: importedTrackPoints,
      waypoints: importedWaypoints,
    });
  }, [importedTrackPoints, importedWaypoints, mapReady, sendToMap]);

  useEffect(() => {
    if (!mapReady) return;
    if (plannedRoute) {
      sendToMap('setPlannedRoute', {
        coords: plannedRoute.coordinates,
        start: plannedRoute.start,
        end: plannedRoute.end,
      });
    } else {
      sendToMap('clearPlannedRoute');
    }
  }, [plannedRoute, mapReady, sendToMap]);

  // ─── Ajout de waypoint ────────────────────────────────
  const onMapMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        latitude?: number;
        longitude?: number;
      };
      if (
        msg.type === 'longPress' &&
        isRecording &&
        msg.latitude !== undefined &&
        msg.longitude !== undefined
      ) {
        setPendingWaypointCoord({ latitude: msg.latitude, longitude: msg.longitude });
        setWaypointName('');
        setShowWaypointModal(true);
      }
    } catch {
      // ignorer les erreurs de parsing
    }
  }, [isRecording]);

  const confirmWaypoint = () => {
    if (!pendingWaypointCoord) return;
    const newWaypoint: Waypoint = {
      ...pendingWaypointCoord,
      name: waypointName.trim() || `Point ${waypoints.length + 1}`,
      timestamp: new Date().toISOString(),
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
    setShowWaypointModal(false);
    setPendingWaypointCoord(null);
  };

  const addWaypointAtCurrentPos = () => {
    if (!location) return;
    setPendingWaypointCoord({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    setWaypointName('');
    setShowWaypointModal(true);
  };

  // ─── Import de fichier KML/GPX ────────────────────────
  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/xml', 'text/xml', 'application/vnd.google-earth.kml+xml', 'application/gpx+xml', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.uri) return;

      const importedFile = new File(file.uri);
      const content = await importedFile.text();
      const fileName = file.name?.toLowerCase() || '';

      let routeData: RouteData;
      if (fileName.endsWith('.kml')) {
        routeData = parseKML(content);
      } else if (fileName.endsWith('.gpx')) {
        routeData = parseGPX(content);
      } else {
        // Tenter de détecter le format
        if (content.includes('<kml') || content.includes('<Placemark')) {
          routeData = parseKML(content);
        } else if (content.includes('<gpx') || content.includes('<trkpt')) {
          routeData = parseGPX(content);
        } else {
          Alert.alert('Format non supporté', 'Veuillez sélectionner un fichier KML ou GPX.');
          return;
        }
      }

      setImportedTrackPoints(routeData.trackPoints);
      setImportedWaypoints(routeData.waypoints);
      setImportedTitle(routeData.title);

      // Centrer la carte sur les données importées
      const allPoints = [...routeData.trackPoints, ...routeData.waypoints];
      if (allPoints.length > 0) {
        sendToMap('fitBounds', {
          coords: allPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        });
      }

      Alert.alert(
        'Import réussi',
        `"${routeData.title}"\n${routeData.trackPoints.length} points de trajet\n${routeData.waypoints.length} points de cheminement`
      );
    } catch {
      Alert.alert('Erreur d\'import', 'Impossible de lire le fichier sélectionné.');
    }
  };

  const handlePlanRoute = useCallback(async () => {
    if (!departure.trim() || !arrival.trim()) {
      Alert.alert('Itineraire incomplet', 'Saisissez un depart et une arrivee pour calculer le trajet.');
      return;
    }

    setIsPlanningRoute(true);

    try {
      const route = await planHeavyVehicleRoute({
        departure,
        arrival,
        vehicle: vehicleConstraints,
      });

      setPlannedRoute(route);
      setRouteTitle(route.title);

      sendToMap('fitBounds', { coords: route.coordinates });

      if (route.warnings.length > 0) {
        Alert.alert('Itineraire prepare', route.warnings.join('\n\n'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de calculer l\'itineraire.';
      Alert.alert('Erreur de calcul', message);
    } finally {
      setIsPlanningRoute(false);
    }
  }, [arrival, departure, vehicleConstraints]);

  const useCurrentLocationAsDeparture = useCallback(() => {
    if (!location) {
      Alert.alert('Localisation indisponible', 'La position courante n\'est pas encore disponible.');
      return;
    }

    setDeparture(`${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
  }, [location]);

  const clearPlannedRoute = useCallback(() => {
    setPlannedRoute(null);
  }, []);

  // ─── Export ───────────────────────────────────────────
  const handleExport = async (format: 'gpx' | 'kml') => {
    const title = exportTitle.trim() || plannedRoute?.title || 'Mon trajet';
    const plannedTrackPoints = plannedRoute?.coordinates.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })) ?? [];
    const plannedWaypoints = plannedRoute
      ? [
          {
            latitude: plannedRoute.start.latitude,
            longitude: plannedRoute.start.longitude,
            name: `Depart - ${plannedRoute.departureLabel}`,
          },
          {
            latitude: plannedRoute.end.latitude,
            longitude: plannedRoute.end.longitude,
            name: `Arrivee - ${plannedRoute.arrivalLabel}`,
          },
        ]
      : [];

    const allWaypoints = [...waypoints, ...importedWaypoints, ...plannedWaypoints];
    const allTrackPoints = [...plannedTrackPoints, ...trackPoints, ...importedTrackPoints];

    const routeData: RouteData = {
      title,
      waypoints: allWaypoints,
      trackPoints: allTrackPoints,
    };

    const content = format === 'gpx' ? generateGPX(routeData) : generateKML(routeData);
    const extension = format === 'gpx' ? 'gpx' : 'kml';
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const exportFile = new File(Paths.cache, `${sanitizedTitle}.${extension}`);

    try {
      exportFile.write(content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportFile.uri, {
          mimeType: format === 'gpx' ? 'application/gpx+xml' : 'application/vnd.google-earth.kml+xml',
          dialogTitle: `Partager "${title}"`,
        });
      } else {
        Alert.alert('Export', `Fichier enregistré : ${exportFile.uri}`);
      }

      setShowExportModal(false);
    } catch {
      Alert.alert('Erreur d\'export', 'Impossible d\'exporter le fichier.');
    }
  };

  const clearImported = () => {
    Alert.alert('Effacer l\'import', 'Supprimer les données importées ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: () => {
          setImportedTrackPoints([]);
          setImportedWaypoints([]);
          setImportedTitle('');
        },
      },
    ]);
  };

  // ─── Centrage carte ───────────────────────────────────
  const centerOnUser = useCallback(() => {
    if (location) {
      sendToMap('centerOn', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        zoom: 15,
      });
    }
  }, [location, sendToMap]);

  // ─── Rendu ────────────────────────────────────────────
  const hasData = trackPoints.length > 0 || waypoints.length > 0 ||
                  importedTrackPoints.length > 0 || importedWaypoints.length > 0 ||
                  (plannedRoute?.coordinates.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Navigation GPS</Text>
          {isRecording && (
            <View style={styles.recordingBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>ENR</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.listButton} onPress={() => setShowWaypointListModal(true)}>
          <IconSymbol name="list.bullet" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.routePlannerCard}>
        <View style={styles.routePlannerHeader}>
          <Text style={styles.routePlannerTitle}>Recherche d&apos;itineraire poids lourd</Text>
          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleBadgeText}>
              {vehicleConstraints.lengthMeters} m • {vehicleConstraints.weightTons} t • {vehicleConstraints.heightMeters.toFixed(2)} m
            </Text>
          </View>
        </View>

        {canConfigureVehicle && (
          <View style={styles.vehicleConfigCard}>
            <View style={styles.vehicleConfigHeader}>
              <View style={styles.vehicleConfigTitleBlock}>
                <Text style={styles.vehicleConfigTitle}>Vehicule actif</Text>
                <Text style={styles.vehicleConfigSubtitle}>
                  {vehicleProfile.vehicleType} • {vehicleProfile.brand}
                </Text>
              </View>
              <TouchableOpacity style={styles.vehicleConfigButton} onPress={openVehicleConfig}>
                <IconSymbol name="slider.horizontal.3" size={16} color="#FFFFFF" />
                <Text style={styles.vehicleConfigButtonText}>Configurer</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.vehicleIdentityRow}>
              <View style={styles.vehicleIdentityPill}>
                <Text style={styles.vehicleIdentityLabel}>Immatriculation</Text>
                <Text style={styles.vehicleIdentityValue}>{vehicleProfile.registration}</Text>
              </View>
              <View style={styles.vehicleIdentityPill}>
                <Text style={styles.vehicleIdentityLabel}>Marque</Text>
                <Text style={styles.vehicleIdentityValue}>{vehicleProfile.brand}</Text>
              </View>
            </View>

            <Text style={styles.vehicleConfigHint}>
              Configuration mock locale. Les donnees ne sont pas encore stockees en base.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.routeInput}
          placeholder="Depart"
          placeholderTextColor="#7A7A7A"
          value={departure}
          onChangeText={setDeparture}
        />
        <TextInput
          style={styles.routeInput}
          placeholder="Arrivee"
          placeholderTextColor="#7A7A7A"
          value={arrival}
          onChangeText={setArrival}
        />

        <View style={styles.routePlannerActions}>
          <TouchableOpacity style={styles.secondaryPlannerButton} onPress={useCurrentLocationAsDeparture}>
            <IconSymbol name="location" size={16} color={COLORS.primaryDark} />
            <Text style={styles.secondaryPlannerButtonText}>Ma position</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryPlannerButton, isPlanningRoute && styles.primaryPlannerButtonDisabled]}
            onPress={handlePlanRoute}
            disabled={isPlanningRoute}
          >
            <Text style={styles.primaryPlannerButtonText}>
              {isPlanningRoute ? 'Recherche...' : 'Calculer'}
            </Text>
          </TouchableOpacity>
        </View>

        {plannedRoute && (
          <View style={styles.routeResultCard}>
            <View style={styles.routeResultTopRow}>
              <View style={styles.routeResultMain}>
                <Text style={styles.routeResultTitle}>{plannedRoute.title}</Text>
                <Text style={styles.routeResultMeta}>
                  {plannedRoute.distanceKm} km • {plannedRoute.durationMinutes} min • {plannedRoute.provider === 'openrouteservice' ? 'Poids lourd exact' : 'Mode demo'}
                </Text>
              </View>
              <TouchableOpacity style={styles.routeClearButton} onPress={clearPlannedRoute}>
                <IconSymbol name="xmark.circle.fill" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.routeSummary}>{plannedRoute.aiSummary}</Text>

            {plannedRoute.warnings.map((warning, index) => (
              <View key={`${warning}-${index}`} style={styles.routeWarningRow}>
                <IconSymbol name="exclamationmark.triangle.fill" size={14} color={COLORS.error} />
                <Text style={styles.routeWarningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Carte OpenStreetMap via Leaflet */}
      <View style={styles.mapContainer}>
        <WebView
          ref={mapRef}
          style={styles.map}
          source={{ html: LEAFLET_HTML, baseUrl: 'https://carto.com' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          allowsInlineMediaPlayback
          onLoadEnd={() => setMapReady(true)}
          onMessage={onMapMessage}
        />

        {/* Bouton recentrer */}
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <IconSymbol name="location" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Indicateur import */}
        {importedTitle !== '' && (
          <TouchableOpacity style={styles.importedBadge} onPress={clearImported}>
            <Text style={styles.importedBadgeText} numberOfLines={1}>
              📍 {importedTitle}
            </Text>
            <IconSymbol name="xmark.circle.fill" size={16} color="#FFF" />
          </TouchableOpacity>
        )}

        {plannedRoute && (
          <View style={styles.plannedBadge}>
            <Text style={styles.plannedBadgeText} numberOfLines={1}>
              🚌 {plannedRoute.departureLabel} → {plannedRoute.arrivalLabel}
            </Text>
          </View>
        )}

        {/* Compteur pendant l'enregistrement */}
        {isRecording && (
          <View style={styles.statsOverlay}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{trackPoints.length}</Text>
              <Text style={styles.statLabel}>points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{waypoints.length}</Text>
              <Text style={styles.statLabel}>étapes</Text>
            </View>
          </View>
        )}
      </View>

      {/* Barre d'actions */}
      <View style={styles.actionBar}>
        {/* Rangée du haut : Import / Record / Export */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleImportFile}
            disabled={isRecording}
          >
            <IconSymbol name="square.and.arrow.down" size={22} color={isRecording ? '#999' : COLORS.primaryDark} />
            <Text style={[styles.actionLabel, isRecording && styles.disabledLabel]}>Importer</Text>
          </TouchableOpacity>

          {!isRecording ? (
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <View style={styles.recordInner}>
                <IconSymbol name="record.circle" size={32} color="#FFF" />
              </View>
              <Text style={styles.recordLabel}>Enregistrer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopInner}>
                <IconSymbol name="stop.circle" size={32} color="#FFF" />
              </View>
              <Text style={styles.stopLabel}>Arrêter</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (!hasData) {
                Alert.alert('Aucune donnée', 'Enregistrez un trajet ou importez un fichier avant d\'exporter.');
                return;
              }
              setExportTitle(routeTitle || importedTitle || 'Mon trajet');
              setShowExportModal(true);
            }}
            disabled={!hasData}
          >
            <IconSymbol name="square.and.arrow.up" size={22} color={hasData ? COLORS.primaryDark : '#999'} />
            <Text style={[styles.actionLabel, !hasData && styles.disabledLabel]}>Exporter</Text>
          </TouchableOpacity>
        </View>

        {/* Rangée du bas : actions pendant enregistrement */}
        {isRecording && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.waypointButton} onPress={addWaypointAtCurrentPos}>
              <IconSymbol name="mappin.and.ellipse" size={20} color="#FFF" />
              <Text style={styles.waypointButtonText}>Ajouter une étape ici</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Titre du trajet en cours */}
        {isRecording && (
          <View style={styles.titleInputRow}>
            <TextInput
              style={styles.titleInput}
              placeholder="Nom du trajet (optionnel)"
              placeholderTextColor="#999"
              value={routeTitle}
              onChangeText={setRouteTitle}
            />
          </View>
        )}
      </View>

      {/* ─── Modal : Nom du waypoint ───────────────────── */}
      <Modal visible={showWaypointModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau point de cheminement</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de l'étape (ex: Arrêt Place de la Gare)"
              placeholderTextColor="#999"
              value={waypointName}
              onChangeText={setWaypointName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWaypointModal(false);
                  setPendingWaypointCoord(null);
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmWaypoint}>
                <Text style={styles.modalConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Modal : Export ────────────────────────────── */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exporter l&apos;itinéraire</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Titre du trajet"
              placeholderTextColor="#999"
              value={exportTitle}
              onChangeText={setExportTitle}
            />
            <Text style={styles.exportInfo}>
              {trackPoints.length + importedTrackPoints.length} points de trajet{'\n'}
              {waypoints.length + importedWaypoints.length} points de cheminement
            </Text>
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={styles.exportFormatBtn}
                onPress={() => handleExport('gpx')}
              >
                <Text style={styles.exportFormatText}>📄 GPX</Text>
                <Text style={styles.exportFormatDesc}>Compatible GPS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportFormatBtn}
                onPress={() => handleExport('kml')}
              >
                <Text style={styles.exportFormatText}>🌍 KML</Text>
                <Text style={styles.exportFormatDesc}>Google Earth</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal : Liste des waypoints ──────────────── */}
      <Modal visible={showWaypointListModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Points de cheminement</Text>
            {waypoints.length === 0 && importedWaypoints.length === 0 && !plannedRoute ? (
              <Text style={styles.emptyText}>
                Aucun point de cheminement.{'\n'}
                Appui long sur la carte pendant l&apos;enregistrement pour en ajouter.
              </Text>
            ) : (
              <FlatList
                data={[
                  ...waypoints.map((wp, i) => ({ ...wp, source: 'recorded' as const, index: i })),
                  ...importedWaypoints.map((wp, i) => ({ ...wp, source: 'imported' as const, index: i })),
                  ...(plannedRoute
                    ? [
                        {
                          latitude: plannedRoute.start.latitude,
                          longitude: plannedRoute.start.longitude,
                          name: `Depart - ${plannedRoute.departureLabel}`,
                          source: 'planned' as const,
                          index: 0,
                        },
                        {
                          latitude: plannedRoute.end.latitude,
                          longitude: plannedRoute.end.longitude,
                          name: `Arrivee - ${plannedRoute.arrivalLabel}`,
                          source: 'planned' as const,
                          index: 1,
                        },
                      ]
                    : []),
                ]}
                keyExtractor={(item, index) => `${item.source}-${index}`}
                renderItem={({ item }) => (
                  <View style={styles.waypointListItem}>
                    <View
                      style={[
                        styles.waypointDot,
                        {
                          backgroundColor:
                            item.source === 'recorded'
                              ? COLORS.primary
                              : item.source === 'planned'
                                ? '#FF8F00'
                                : '#1976D2',
                        },
                      ]}
                    />
                    <View style={styles.waypointInfo}>
                      <Text style={styles.waypointItemName}>{item.name}</Text>
                      <Text style={styles.waypointItemCoords}>
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </Text>
                    </View>
                    <Text style={styles.waypointSource}>
                      {item.source === 'recorded' ? '🔴' : item.source === 'planned' ? '🚌' : '📥'}
                    </Text>
                  </View>
                )}
              />
            )}
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { marginTop: 16 }]}
              onPress={() => setShowWaypointListModal(false)}
            >
              <Text style={styles.modalConfirmText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showVehicleConfigModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.vehicleModalContent]}>
            <Text style={styles.modalTitle}>Configurer le vehicule</Text>
            <Text style={styles.vehicleModalIntro}>
              Choisissez un exemple ou saisissez librement les caracteristiques du vehicule utilise.
            </Text>

            <View style={styles.presetRow}>
              {VEHICLE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={`${preset.vehicleType}-${preset.registration}`}
                  style={styles.presetChip}
                  onPress={() => applyVehiclePreset(preset)}
                >
                  <Text style={styles.presetChipText}>{preset.vehicleType}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Type de vehicule"
              placeholderTextColor="#999"
              value={vehicleTypeInput}
              onChangeText={setVehicleTypeInput}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Immatriculation"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              value={registrationInput}
              onChangeText={setRegistrationInput}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Marque / modele"
              placeholderTextColor="#999"
              value={brandInput}
              onChangeText={setBrandInput}
            />

            <View style={styles.metricRow}>
              <TextInput
                style={[styles.modalInput, styles.metricInput]}
                placeholder="Longueur (m)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={lengthInput}
                onChangeText={setLengthInput}
              />
              <TextInput
                style={[styles.modalInput, styles.metricInput]}
                placeholder="Hauteur (m)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={heightInput}
                onChangeText={setHeightInput}
              />
              <TextInput
                style={[styles.modalInput, styles.metricInput]}
                placeholder="Poids (t)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowVehicleConfigModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={saveVehicleConfiguration}>
                <Text style={styles.modalConfirmText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.recording,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  listButton: {
    padding: 4,
  },
  routePlannerCard: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  routePlannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  routePlannerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleBadge: {
    backgroundColor: '#EDF7EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vehicleBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  vehicleConfigCard: {
    backgroundColor: '#F7FBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8E9DA',
    gap: 10,
  },
  vehicleConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleConfigTitleBlock: {
    flex: 1,
  },
  vehicleConfigTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleConfigSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  vehicleConfigButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleConfigButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  vehicleIdentityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleIdentityPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0ECE1',
  },
  vehicleIdentityLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  vehicleIdentityValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleConfigHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  routeInput: {
    backgroundColor: '#F3F5F4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  routePlannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryPlannerButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFF',
  },
  secondaryPlannerButtonText: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  primaryPlannerButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPlannerButtonDisabled: {
    opacity: 0.7,
  },
  primaryPlannerButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  routeResultCard: {
    backgroundColor: '#F7FBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8E9DA',
    gap: 8,
  },
  routeResultTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeResultMain: {
    flex: 1,
  },
  routeResultTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  routeResultMeta: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 12,
  },
  routeClearButton: {
    paddingTop: 2,
  },
  routeSummary: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
  },
  routeWarningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeWarningText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 12,
    lineHeight: 18,
  },
  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  importedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 70,
    backgroundColor: '#1976D2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  importedBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  plannedBadge: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 70,
    backgroundColor: '#FF8F00',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  plannedBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#CCC',
    fontSize: 11,
  },
  // Action bar
  actionBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  actionLabel: {
    color: COLORS.primaryDark,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  disabledLabel: {
    color: '#999',
  },
  recordButton: {
    alignItems: 'center',
    flex: 1,
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  recordLabel: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  stopButton: {
    alignItems: 'center',
    flex: 1,
  },
  stopInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.recording,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.recording,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  stopLabel: {
    color: COLORS.recording,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  waypointButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  waypointButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  titleInputRow: {
    marginTop: 4,
  },
  titleInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  vehicleModalContent: {
    maxWidth: 460,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  vehicleModalIntro: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#ECF6ED',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CFE2D1',
  },
  presetChipText: {
    color: COLORS.primaryDark,
    fontWeight: '600',
    fontSize: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricInput: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  exportInfo: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  exportFormatBtn: {
    flex: 1,
    backgroundColor: '#F5FFF5',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  exportFormatText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  exportFormatDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 20,
  },
  waypointListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  waypointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  waypointItemCoords: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  waypointSource: {
    fontSize: 16,
    marginLeft: 8,
  },
});
