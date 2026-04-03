/**
 * Utilitaires pour parser et générer des fichiers GPX et KML
 */

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

// ─── GPX ────────────────────────────────────────────────

export function parseGPX(xml: string): RouteData {
  const title = extractTag(xml, 'name') || 'Trajet importé';
  const waypoints: Waypoint[] = [];
  const trackPoints: RouteData['trackPoints'] = [];

  // Parse waypoints <wpt>
  const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/gi;
  let match: RegExpExecArray | null;
  while ((match = wptRegex.exec(xml)) !== null) {
    waypoints.push({
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      name: extractTag(match[3], 'name') || `Point ${waypoints.length + 1}`,
      timestamp: extractTag(match[3], 'time') || undefined,
    });
  }

  // Parse track points <trkpt>
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  while ((match = trkptRegex.exec(xml)) !== null) {
    trackPoints.push({
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      timestamp: extractTag(match[3], 'time') || undefined,
    });
  }

  // Si pas de trkpts, essayer <rtept>
  if (trackPoints.length === 0) {
    const rteptRegex = /<rtept\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/rtept>/gi;
    while ((match = rteptRegex.exec(xml)) !== null) {
      trackPoints.push({
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
        timestamp: extractTag(match[3], 'time') || undefined,
      });
    }
  }

  return { title, waypoints, trackPoints };
}

export function generateGPX(route: RouteData): string {
  const now = new Date().toISOString();
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BoiteAOutils-Chauffeur"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.title)}</name>
    <time>${now}</time>
  </metadata>
`;

  // Waypoints
  for (const wp of route.waypoints) {
    gpx += `  <wpt lat="${wp.latitude}" lon="${wp.longitude}">
    <name>${escapeXml(wp.name)}</name>${wp.timestamp ? `\n    <time>${wp.timestamp}</time>` : ''}
  </wpt>\n`;
  }

  // Track
  if (route.trackPoints.length > 0) {
    gpx += `  <trk>
    <name>${escapeXml(route.title)}</name>
    <trkseg>\n`;
    for (const pt of route.trackPoints) {
      gpx += `      <trkpt lat="${pt.latitude}" lon="${pt.longitude}">${pt.timestamp ? `\n        <time>${pt.timestamp}</time>\n      ` : ''}</trkpt>\n`;
    }
    gpx += `    </trkseg>
  </trk>\n`;
  }

  gpx += `</gpx>`;
  return gpx;
}

// ─── KML ────────────────────────────────────────────────

export function parseKML(xml: string): RouteData {
  const title = extractTag(xml, 'name') || 'Trajet importé';
  const waypoints: Waypoint[] = [];
  const trackPoints: RouteData['trackPoints'] = [];

  // Parse Placemarks
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let match: RegExpExecArray | null;

  while ((match = placemarkRegex.exec(xml)) !== null) {
    const content = match[1];
    const name = extractTag(content, 'name') || `Point ${waypoints.length + 1}`;

    // Check for Point (waypoint)
    const pointMatch = /<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/i.exec(content);
    if (pointMatch) {
      const coords = pointMatch[1].trim().split(',');
      if (coords.length >= 2) {
        waypoints.push({
          latitude: parseFloat(coords[1]),
          longitude: parseFloat(coords[0]),
          name,
        });
      }
    }

    // Check for LineString (track)
    const lineMatch = /<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/i.exec(content);
    if (lineMatch) {
      const coordPairs = lineMatch[1].trim().split(/\s+/);
      for (const pair of coordPairs) {
        const coords = pair.split(',');
        if (coords.length >= 2) {
          trackPoints.push({
            latitude: parseFloat(coords[1]),
            longitude: parseFloat(coords[0]),
          });
        }
      }
    }
  }

  return { title, waypoints, trackPoints };
}

export function generateKML(route: RouteData): string {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(route.title)}</name>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff00aa00</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="waypointStyle">
      <IconStyle>
        <color>ff00aa00</color>
        <scale>1.2</scale>
      </IconStyle>
    </Style>
`;

  // Waypoints
  for (const wp of route.waypoints) {
    kml += `    <Placemark>
      <name>${escapeXml(wp.name)}</name>
      <styleUrl>#waypointStyle</styleUrl>
      <Point>
        <coordinates>${wp.longitude},${wp.latitude},0</coordinates>
      </Point>
    </Placemark>\n`;
  }

  // Track as LineString
  if (route.trackPoints.length > 0) {
    kml += `    <Placemark>
      <name>${escapeXml(route.title)}</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>\n`;
    for (const pt of route.trackPoints) {
      kml += `          ${pt.longitude},${pt.latitude},0\n`;
    }
    kml += `        </coordinates>
      </LineString>
    </Placemark>\n`;
  }

  kml += `  </Document>
</kml>`;
  return kml;
}

// ─── Helpers ────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
