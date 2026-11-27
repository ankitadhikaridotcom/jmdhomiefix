import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path issue in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_COORDS = [29.3803, 79.5126];

const customPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultPinIcon = new L.Icon.Default();

const toValidCoords = (coords, fallback = DEFAULT_COORDS) => {
  if (
    Array.isArray(coords)
    && coords.length >= 2
    && coords[0] !== undefined
    && coords[1] !== undefined
    && Number.isFinite(Number(coords[0]))
    && Number.isFinite(Number(coords[1]))
  ) {
    return [Number(coords[0]), Number(coords[1])];
  }
  return fallback;
};

export default function LeafletMap({
  center = DEFAULT_COORDS,
  zoom = 13,
  markerPosition,
  onPositionChange,
  radius,
  interactive = true,
  height = '350px',
  useCustomRedIcon = false,
  circleColor = '#047857',
  circleFillColor = '#10b981',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const interactiveRef = useRef(interactive);

  onPositionChangeRef.current = onPositionChange;
  interactiveRef.current = interactive;

  const validCenter = toValidCoords(center, DEFAULT_COORDS);
  const activeMarkerPos = toValidCoords(markerPosition, validCenter);
  const centerLat = validCenter[0];
  const centerLng = validCenter[1];
  const markerLat = activeMarkerPos[0];
  const markerLng = activeMarkerPos[1];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = L.map(container, {
      center: [centerLat, centerLng],
      zoom,
      scrollWheelZoom: interactive,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([markerLat, markerLng], {
      draggable: interactive,
      icon: useCustomRedIcon ? customPinIcon : defaultPinIcon,
    }).addTo(map);

    marker.on('dragend', (event) => {
      if (!interactiveRef.current || !onPositionChangeRef.current) return;
      const latLng = event.target.getLatLng();
      onPositionChangeRef.current(latLng.lat, latLng.lng);
    });

    map.on('click', (event) => {
      if (!interactiveRef.current || !onPositionChangeRef.current) return;
      onPositionChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    let circle = null;
    if (radius && Number(radius) > 0) {
      circle = L.circle([markerLat, markerLng], {
        radius: Number(radius) * 1000,
        color: circleColor,
        fillColor: circleFillColor,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    }

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  // Initialize Leaflet map once per mount; prop updates are synced in the effects below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([centerLat, centerLng], zoom || map.getZoom() || 13);
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (interactive) {
      map.scrollWheelZoom?.enable();
    } else {
      map.scrollWheelZoom?.disable();
    }
  }, [interactive]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setLatLng([markerLat, markerLng]);
    marker.setIcon(useCustomRedIcon ? customPinIcon : defaultPinIcon);
    if (interactive) {
      marker.dragging?.enable();
    } else {
      marker.dragging?.disable();
    }
  }, [markerLat, markerLng, useCustomRedIcon, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const radiusMeters = Number(radius) * 1000;
    if (radius && Number.isFinite(radiusMeters) && radiusMeters > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng([markerLat, markerLng]);
        circleRef.current.setRadius(radiusMeters);
        circleRef.current.setStyle({
          color: circleColor,
          fillColor: circleFillColor,
        });
      } else {
        circleRef.current = L.circle([markerLat, markerLng], {
          radius: radiusMeters,
          color: circleColor,
          fillColor: circleFillColor,
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
  }, [markerLat, markerLng, radius, circleColor, circleFillColor]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-inner border border-gray-200" style={{ height }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Attribution footer overlay notice */}
      <div className="absolute bottom-1 right-1 bg-white/80 backdrop-blur-sm text-[10px] text-gray-600 px-2 py-0.5 rounded shadow z-[1000] pointer-events-none">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
