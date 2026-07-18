/**
 * LocationPicker — Auto-detect location or pick on map
 * Uses Geolocation API + OpenStreetMap (free, no API key needed)
 */

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (address: string, city: string, state: string, lat: number, lng: number) => void;
  disabled?: boolean;
}

export function LocationPicker({ onLocationSelect, disabled = false }: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Auto-detect current location
  const handleAutoDetect = async () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation not supported in your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        reverseGeocode(latitude, longitude);
        setMapVisible(true);
      },
      (err) => {
        setError(`Location access denied. Try clicking the map to pick a location.`);
        setMapVisible(true);
        setLoading(false);
      }
    );
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      const addr = data.address;
      setAddress(data.name || addr.road || addr.house_number || `${latitude}, ${longitude}`);
      setCity(addr.city || addr.town || addr.village || '');
      setState(addr.state || '');
      setZip(addr.postcode || '');
      setLoading(false);
    } catch (err) {
      setError('Could not determine address from coordinates');
      setLoading(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapVisible || !mapContainer.current || mapRef.current) return;

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      const L = (window as any).L;
      if (!L) {
        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = () => {
          initializeMap();
        };
        document.body.appendChild(script);
      } else {
        initializeMap();
      }
    };

    const initializeMap = () => {
      const L = (window as any).L;
      const initialLat = lat || 38.5;
      const initialLng = lng || -96.5;

      const map = L.map(mapContainer.current).setView([initialLat, initialLng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Add marker for current location
      if (lat && lng) {
        L.marker([lat, lng], {
          title: 'Selected Location',
        }).addTo(map);
      }

      // Click to select location
      map.on('click', async (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);

        // Clear existing marker
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        // Add new marker
        L.marker([clickLat, clickLng], {
          title: 'Selected Location',
        }).addTo(map);

        // Reverse geocode
        await reverseGeocode(clickLat, clickLng);
      });
    };

    loadLeaflet();
  }, [mapVisible, lat, lng]);

  const handleConfirmLocation = () => {
    if (!address || !city || !state || !zip || lat === null || lng === null) {
      setError('Please select a valid location with ZIP code');
      return;
    }
    // Pass full address with ZIP code to parent
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;
    onLocationSelect(fullAddress, city, state, lat, lng);
    setLocationConfirmed(true);
  };

  return (
    <div className="space-y-4">
      {/* Manual Entry Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUseManualEntry(false)}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition ${
            !useManualEntry
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          <MapPin className="w-4 h-4 inline mr-2" />
          Map/Auto-Detect
        </button>
        <button
          type="button"
          onClick={() => setUseManualEntry(true)}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition ${
            useManualEntry
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {/* Manual Entry */}
      {useManualEntry && (
        <div className="space-y-4">
          <div>
            <label className="block text-white font-bold mb-2">Street Address *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              disabled={disabled}
              className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                disabled={disabled}
                className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-white font-bold mb-2">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="TX"
                disabled={disabled}
                className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-white font-bold mb-2">ZIP *</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="78701"
                disabled={disabled}
                className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (address && city && state && zip) {
                const fullAddress = `${address}, ${city}, ${state} ${zip}`;
                onLocationSelect(fullAddress, city, state, 0, 0);
                setLocationConfirmed(true);
              }
            }}
            disabled={disabled || !address || !city || !state || !zip}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Address
          </button>
        </div>
      )}

      {/* Map / Auto-Detect */}
      {!useManualEntry && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={disabled || loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {loading ? 'Detecting...' : 'Auto-Detect My Location'}
          </button>

          {error && (
            <div className="flex gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {mapVisible && (
            <div className="space-y-4">
              <div
                ref={mapContainer}
                className="w-full h-80 rounded-lg border border-purple-500/30 bg-slate-700"
              />
              <p className="text-gray-400 text-sm text-center">Click on the map to select your location</p>

              {address && city && state && zip && (
                <>
                  <div className="bg-slate-700/50 p-4 rounded-lg border border-purple-500/30 space-y-2">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Address:</span> {address}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">City:</span> {city}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">State:</span> {state}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">ZIP:</span> {zip}
                    </p>
                    {lat && lng && (
                      <p className="text-gray-400 text-xs">
                        Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </p>
                    )}
                  </div>

                  {!locationConfirmed && (
                    <button
                      type="button"
                      onClick={handleConfirmLocation}
                      disabled={disabled}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm This Location
                    </button>
                  )}

                  {locationConfirmed && (
                    <div className="text-center text-green-400 font-bold">
                      ✓ Location confirmed
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
