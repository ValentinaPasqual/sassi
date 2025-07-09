// Enhanced initMap.js with working polygon loading on marker click

import 'leaflet/dist/leaflet.css'; 
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet-providers';

import { PolygonManager } from './polygonManager.js'

function initMap(config) {
    const { initialView, initialZoom, tileLayer, attribution } = config.map;

    const map = L.map('map').setView(initialView, initialZoom);
    L.tileLayer(tileLayer, { attribution }).addTo(map);

    // Special coordinates that get unique treatment
    const SPECIAL_COORDS = [38.7200, -24.2200];
    const SPECIAL_COORDS_KEY = `${SPECIAL_COORDS[0]},${SPECIAL_COORDS[1]}`;

    // Store reference to focus callback and polygon manager
    let focusResultCallback = null;
    let polygonManager = null;

    polygonManager = new PolygonManager(map);
    polygonManager.loadPolygonRepository();

    // Create a custom icon using Lucide MapPin
    const createCustomIcon = (count, isSpecial = false) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${isSpecial ? '#ef4444' : '#1e40af'}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
          ${count > 1 ? `<text x="12" y="10" text-anchor="middle" dy=".3em" fill="white" font-size="8" font-family="Arial">${count}</text>` : ''}
        </svg>
      `;

      return L.divIcon({
        html: svg,
        className: isSpecial ? 'custom-marker special-marker' : 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });
    };
    
    // Initialize marker cluster group
    const markers = L.markerClusterGroup({
      disableClusteringAtZoom: 15,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#1e40af" stroke="#ffffff" stroke-width="2"/>
            <text x="20" y="20" text-anchor="middle" dy=".3em" fill="white" font-size="14" font-family="Arial">${count}</text>
          </svg>
        `;

        return L.divIcon({
          html: svg,
          className: 'custom-cluster',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      }
    }).addTo(map);

    // Add custom CSS
    const style = document.createElement('style');
    style.textContent = `
      .custom-marker {
        background: none;
        border: none;
      }
      .custom-cluster {
        background: none;
        border: none;
      }
      .special-marker {
        filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));
      }
      .leaflet-popup-content-wrapper {
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }
      .leaflet-popup-content {
        margin: 0;
        padding: 0;
      }
      .leaflet-popup-close-button {
        display: none;
      }
      .custom-close-btn {
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 2px;
        border-radius: 4px;
      }
      .custom-close-btn:hover {
        background-color: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }
      .focus-result-btn {
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 4px;
      }
      .focus-result-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        transform: translateX(2px);
      }
      .polygon-btn {
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 2px;
        border-radius: 4px;
      }
      .polygon-btn:hover {
        background-color: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);

    // Store reference to special circle for cleanup
    let specialCircle = null;

    // FIXED: Function to load polygon for a specific location
    const loadPolygonForLocation = async (lat, lon, locationName) => {
      if (!polygonManager) {
        console.warn('PolygonManager not initialized');
        return;
      }

      // Clear existing polygons
      polygonManager.clearAllPolygons();

      // Create location data with coordinates only (no OSM data needed)
      const locationData = {
        display_name: locationName,
        lat: lat,
        lon: lon
      };

      try {
        console.log(`Loading polygon for ${locationName} at ${lat}, ${lon}`);
        
        // Try to find polygon by location name in the repository
        await polygonManager.loadPolygonRepository();
        const polygon = polygonManager.findPolygonByName(locationName);
        
        if (polygon) {
          const layer = polygonManager.createPolygonLayer(polygon, locationData);
          polygonManager.polygonLayers.set(polygonManager.getLocationId(locationData), {
            layer,
            data: locationData,
            highlighted: false
          });
          polygonManager.polygonLayerGroup.addLayer(layer);
          
          // Fit map to show the polygon
          setTimeout(() => {
            polygonManager.fitBoundsToAll();
          }, 100);
          console.log(`Successfully loaded polygon for ${locationName}`);
        } else {
          console.log(`No polygon found for ${locationName}`);
        }
      } catch (error) {
        console.error(`Error loading polygon for ${locationName}:`, error);
      }
    };

    // Function to create focus button for an item
    const createFocusButton = (item) => {
      return `
        <button class="focus-result-btn w-full text-left p-1 rounded text-xs" 
                data-item-id="${item.ID_opera}"
                onclick="window.focusOnResult('${item.ID_opera}')"
                title="Vai al risultato nella lista">
          <div class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 flex-shrink-0">
              <path fill-rule="evenodd" d="M6.5 1.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V3h-3V1.75ZM8 4a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 4Z" clip-rule="evenodd" />
            </svg>
            <span class="truncate">Mostra nei risultati</span>
          </div>
        </button>
      `;
    };

    // Function to create polygon button for location
    const createPolygonButton = (coords, locationName) => {
      return `
        <button class="polygon-btn ml-1" 
                onclick="window.showPolygon(${coords[0]}, ${coords[1]}, '${locationName.replace(/'/g, "\\'")}')"
                title="Mostra poligono area">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M8 1a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
          </svg>
        </button>
      `;
    };

    // Make polygon loading function globally accessible
    window.showPolygon = loadPolygonForLocation;

    // Function to render markers - FIXED to only show filtered items
    const renderMarkers = (filteredItems) => {
      // Clear previous markers and special circle
      markers.clearLayers();
      if (specialCircle) {
        map.removeLayer(specialCircle);
        specialCircle = null;
      }

      // Group ONLY the filtered items by coordinates
      const locationGroups = {};
      
      // Use the filteredItems parameter instead of assuming all items
      filteredItems.forEach(item => {    
        // Skip items without coordinates
        if (!item.lat_long) return;
        
        // Parse coordinates from string like "45.9027,7.6587"
        const coords = item.lat_long.split(',').map(coord => parseFloat(coord.trim()));
        
        // Skip if we couldn't parse coordinates properly
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
          console.error('Invalid coordinates:', item.lat_long);
          return;
        }
        
        const [latitude, longitude] = coords;
        const key = `${latitude},${longitude}`;
        const locationName = item["Spazi geografici"] || "Unknown Location";
        
        if (!locationGroups[key]) {
          locationGroups[key] = {
            name: locationName, 
            items: [],
            coords: [latitude, longitude]
          };
        }
        
        // Only add items that are in the filtered results
        locationGroups[key].items.push(item);
      });

      // Only show markers for locations that have filtered items
      Object.values(locationGroups).forEach(group => {
        const { name, items, coords } = group;
        const coordsKey = `${coords[0]},${coords[1]}`;
        const isSpecial = coordsKey === SPECIAL_COORDS_KEY;

        // Create popup content - special format for special marker
        let popupContent;
        if (isSpecial) {
          // Special popup format showing opera name and location
          // Group items by title and year, collecting unique locations
          const operaGroups = {};
          items.forEach(item => {
            const key = `${item["Titolo"] || 'Unnamed'} (${item.Anno || 'Unknown Year'})`;
            if (!operaGroups[key]) {
              operaGroups[key] = {
                title: item["Titolo"] || 'Unnamed',
                year: item.Anno || 'Unknown Year',
                locations: new Set(),
                author: item.Autore,
                item: item // Store reference to item for focus button
              };
            }
            if (item["Spazi geografici"]) {
              operaGroups[key].locations.add(item["Spazi geografici"]);
            }
          });
          
          popupContent = `
          <div class="max-w-sm bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow-lg overflow-hidden">
            <div class="bg-red-500 text-white p-2">
              <h2 class="font-bold text-base flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                  </svg>
                  Special Location
                </div>
                <div class="custom-close-btn" onclick="this.closest('.leaflet-popup').style.display='none'">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
                  </svg>
                </div>
              </h2>
            </div>
            <div class="p-3">
              <div class="bg-white rounded p-2 mb-2 shadow-sm border-l-2 border-red-400">
                <p class="text-xs text-gray-600 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-red-500">
                    <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                  </svg>
                  <span class="font-mono text-xs">${coords[0]}, ${coords[1]}</span>
                </p>
              </div>
              <h3 class="font-semibold text-sm text-gray-800 flex items-center gap-1 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-red-500">
                  <path d="M3 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3ZM3 7.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3ZM2 12.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1ZM7 4a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4ZM7.5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6ZM7 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Z"/>
                </svg>
                ${Object.keys(operaGroups).length} opere letterarie
              </h3>
              <div class="space-y-1 max-h-28 overflow-y-scroll">
                ${Object.values(operaGroups).map(group => `
                  <div class="bg-white rounded p-2 shadow-sm border border-gray-100 text-xs">
                    <div class="flex items-start gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0">
                        <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
                        <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
                      </svg>
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold text-gray-800 leading-tight">${group.title}, ${group.author || 'Unknown Author'} (${group.year})</div>
                        <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                            <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                          </svg>
                          ${Array.from(group.locations).join(', ')}
                        </div>
                        <div class="mt-1">
                          ${createFocusButton(group.item)}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          `;
        } else {
          // Regular popup format - also only shows filtered items
          popupContent = `
          <div class="max-w-sm bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg overflow-hidden">
            <div class="bg-blue-500 text-white p-2">
              <h2 class="font-bold text-base flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                  </svg>
                  ${name}
                  ${createPolygonButton(coords, name)}
                </div>
                <div class="custom-close-btn" onclick="this.closest('.leaflet-popup').style.display='none'">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
                  </svg>
                </div>
              </h2>
            </div>
            <div class="p-3">
              <h3 class="font-semibold text-sm text-gray-800 flex items-center gap-1 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-blue-500">
                  <path d="M3 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3ZM3 7.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3ZM2 12.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1ZM7 4a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4ZM7.5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6ZM7 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Z"/>
                </svg>
                ${items.length} opere letterarie
              </h3>
              <div class="space-y-1 max-h-28 overflow-y-scroll">
                ${items.map(item => `
                  <div class="bg-white rounded p-2 shadow-sm border border-gray-100 text-xs">
                    <div class="flex items-start gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0">
                        <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
                        <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
                      </svg>
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold text-gray-800 leading-tight">${item["Titolo"] || 'Unnamed'}, ${item.Autore || 'Unknown Author'} (${item.Anno || 'Unknown Year'})</div>
                        ${item.Guide ? `
                          <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"/>
                            </svg>
                            ${item.Guide}
                          </div>
                        ` : ''}
                        <div class="mt-1">
                          ${createFocusButton(item)}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          `;
        }

        // Create marker with custom icon
        const marker = L.marker(coords, {
          icon: createCustomIcon(items.length, isSpecial)
        }).bindPopup(popupContent);

        // Add blue circle around special marker
        if (isSpecial) {
          specialCircle = L.circle(coords, {
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            radius: 8000, // 8km radius - larger than before
            weight: 4
          }).addTo(map);
        }

        markers.addLayer(marker);
      });

      // If no markers were added, log a message
      if (Object.keys(locationGroups).length === 0) {
        console.log('No markers to display for current filter selection');
      } else {
        console.log(`Added ${Object.keys(locationGroups).length} markers to the map (showing only filtered items)`);
      }
    };

    // Function to set the focus callback
    const setFocusResultCallback = (callback) => {
      focusResultCallback = callback;
      // Make it globally accessible for the onclick handlers
      window.focusOnResult = callback;
    };

    // Return the map and functions
    return {
      map,
      markers,
      renderMarkers,
      setFocusResultCallback
    };
}

export { initMap };