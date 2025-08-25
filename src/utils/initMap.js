// Enhanced initMap.js with working polygon loading on marker click

import 'leaflet/dist/leaflet.css'; 
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet-providers';

import '../styles/tailwind.css'
import { PolygonManager } from './polygonManager.js'

function initMap(config) {
    const { initialView, initialZoom, tileLayer = config.map.tileLayers[Object.keys(config.map.tileLayers)[0]].tileLayer, attribution = config.map.tileLayers[Object.keys(config.map.tileLayers)[0]].attribution } = config.map;

    const map = L.map('map').setView(initialView, initialZoom);
    L.tileLayer(tileLayer, { attribution }).addTo(map);

    window.map = map; 

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
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="${isSpecial ? 'fill-red-500' : 'fill-secondary-700'} stroke-white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
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
            <circle cx="20" cy="20" r="18" class="fill-secondary-700 stroke-white" stroke-width="2"/>
            <text x="20" y="20" text-anchor="middle" dy=".3em" class="fill-secondary-200 text-sm font-sans" font-size="14">${count}</text>
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
    document.head.appendChild(style);

    // Store reference to special circle for cleanup
    let specialCircle = null;
    
    // Storage for different marker types
    let pinMarkers = [];
    let circleMarkers = [];
    let circleLabels = [];

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
                data-item-id="${item.pivot_ID}"
                onclick="window.focusOnResult('${item.pivot_ID}')"
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
          <svg class="w-6 h-6 text-white-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-width="2" d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6Z"/>
            <path stroke="currentColor" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
          </svg>
        </button>
      `;
    };

    // Make polygon loading function globally accessible
    window.showPolygon = loadPolygonForLocation;

    // Add these variables at the top of your initMap function, after the existing variables
    let currentMarkerType = 'clusters'; // default
    let currentFilteredItems = []; // store current filtered items

    // Helper function to create popup content - FIXED VERSION with config fields
    const createPopupContent = (group, isSpecial, config) => {
      const { name, items, coords } = group;
      const cardConfig = config.result_cards;
      
      if (isSpecial) {
          // Special popup format showing opera name and location
          // Group items by title and year, collecting unique locations
          const operaGroups = {};
          items.forEach(item => {
              const key = `${item[cardConfig.card_title] || 'Unnamed'} (${item[cardConfig.card_subtitle] || 'Unknown Year'})`;
              if (!operaGroups[key]) {
                  operaGroups[key] = {
                      title: item[cardConfig.card_title] || 'Unnamed',
                      year: item[cardConfig.card_subtitle] || 'Unknown Year',
                      locations: new Set(),
                      type: item[cardConfig.card_subtitle_2],
                      item: item // Store reference to item for focus button
                  };
              }
              if (item["Location"]) {
                  operaGroups[key].locations.add(item["Location"]);
              }
          });
          
          return `
          <div class="max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-red-100/50 backdrop-blur-sm">
              <!-- Header con gradiente animato -->
              <div class="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 text-white p-3 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>
                  <h2 class="font-bold text-base flex items-center justify-between relative z-10">
                      <div class="flex items-center gap-2">
                          <div class="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                  <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                              </svg>
                          </div>
                          <span class="text-white/90 font-medium">Location Speciale</span>
                      </div>
                      <button class="custom-close-btn p-1 hover:bg-white/20 rounded-lg transition-colors duration-200" onclick="this.closest('.leaflet-popup').style.display='none'">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                              <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
                          </svg>
                      </button>
                  </h2>
              </div>

              <div class="p-4 bg-gradient-to-br from-red-50/50 to-pink-50/30">

                  <!-- Header risultati -->
                  <div class="flex items-center gap-2 mb-3">
                      <div class="p-1.5 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-white">
                              <path d="M3 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3ZM3 7.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3ZM2 12.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1ZM7 4a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4ZM7.5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6ZM7 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Z"/>
                          </svg>
                      </div>
                      <h3 class="font-semibold text-gray-800 text-sm">
                          <span class="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent font-bold">
                              ${Object.keys(operaGroups).length}
                          </span> 
                          Risultati trovati
                      </h3>
                  </div>

                  <!-- Lista risultati con scrollbar personalizzata -->
                  <div class="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-red-300 scrollbar-track-red-50 hover:scrollbar-thumb-red-400">
                  ${Object.values(operaGroups).map((group, index) => `
                    <div class="group bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-red-100/50 hover:shadow-lg hover:border-red-200 transition-all duration-300 hover:-translate-y-0.5">
                      <div class="flex items-start gap-2">
                        <div class="p-1 bg-gradient-to-br from-red-100 to-pink-100 rounded-lg group-hover:from-red-200 group-hover:to-pink-200 transition-colors duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-red-600">
                            <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
                            <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
                          </svg>
                        </div>
                        
                        <div class="min-w-0 flex-1">
                          <!-- Title -->
                          <div class="mb-2">
                            <h3 class="text-lg font-bold text-gray-800 leading-tight group-hover:text-gray-900 transition-colors">${group.title}</h3>
                            <div class="flex items-center gap-3 mt-1">
                              ${group.year ? `<span class="text-sm text-gray-700 font-medium">${group.year}</span>` : ''}
                              ${group.year && group.type ? `<span class="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>` : ''}
                              ${group.type ? `<span class="text-sm text-gray-600 font-mono">${group.type}</span>` : ''}
                            </div>
                          </div>
                          
                          <!-- Locations -->
                          ${Array.from(group.locations).length > 0 ? `
                            <div class="flex items-center gap-1 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-red-400 flex-shrink-0">
                                <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                              </svg>
                              <span class="text-xs text-gray-500 truncate">${Array.from(group.locations).join(', ')}</span>
                            </div>
                          ` : ''}
                          
                          <!-- Focus Button -->
                          <div class="mt-2">
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
          // Regular popup format
          return `
          <div class="max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-primary-100/50 backdrop-blur-sm">
              <!-- Header con gradiente animato -->
              <div class="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-600 text-white p-3 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>
                  <h2 class="font-bold text-base flex items-center justify-between relative z-10">
                      <div class="flex items-center gap-2">
                          <div class="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                  <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                              </svg>
                          </div>
                          <span class="text-white/90 font-medium truncate">${name}</span>
                          ${createPolygonButton(coords, name)}
                      </div>
                      <button class="custom-close-btn p-1 hover:bg-white/20 rounded-lg transition-colors duration-200" onclick="this.closest('.leaflet-popup').style.display='none'">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                              <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"/>
                          </svg>
                      </button>
                  </h2>
              </div>

              <div class="p-4 bg-gradient-to-br from-primary-50/50 to-secondary-50/30">
                  <!-- Header risultati -->
                  <div class="flex items-center gap-2 mb-3">
                      <div class="p-1.5 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-white">
                              <path d="M3 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3ZM3 7.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3ZM2 12.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1ZM7 4a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4ZM7.5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6ZM7 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Z"/>
                          </svg>
                      </div>
                      <h3 class="font-semibold text-gray-800 text-sm">
                          <span class="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                              ${items.length}
                          </span> 
                          Risultati trovati
                      </h3>
                  </div>

                  <!-- Lista risultati con scrollbar personalizzata -->
                  <div class="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-300 scrollbar-track-primary-50 hover:scrollbar-thumb-primary-400">
${items.map((item, index) => `
  <div class="group bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-primary-100/50 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-0.5">
    <div class="flex items-start gap-2">
      <div class="p-1 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg group-hover:from-primary-200 group-hover:to-secondary-200 transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-primary-600">
          <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
          <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
        </svg>
      </div>
      
      <div class="min-w-0 flex-1">
        <!-- Title -->
        <div class="mb-2">
          <h3 class="text-lg font-bold text-gray-800 leading-tight group-hover:text-gray-900 transition-colors">${item[config.result_cards.card_title] || 'Unnamed'}</h3>
          <div class="flex items-center gap-3 mt-1">
            ${item[config.result_cards.card_subtitle] ? `<span class="text-sm text-gray-700 font-medium">${item[config.result_cards.card_subtitle]}</span>` : ''}
            ${item[config.result_cards.card_subtitle] && item[config.result_cards.card_subtitle_2] ? `<span class="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>` : ''}
            ${item[config.result_cards.card_subtitle_2] ? `<span class="text-sm text-gray-600 font-mono">${item[config.result_cards.card_subtitle_2]}</span>` : ''}
          </div>
        </div>
        
        <!-- Description -->
        ${item[config.result_cards.description] ? `
          <div class="flex items-center gap-1 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-primary-400 flex-shrink-0">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"/>
            </svg>
            <span class="text-xs text-gray-500 truncate">${item[config.result_cards.description]}</span>
          </div>
        ` : ''}
        
        <!-- Focus Button -->
        <div class="mt-2">
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
    };

    // Function to clear all markers from map
    const clearAllMarkers = () => {
        console.log('Clearing all markers...');
        
        // Clear cluster markers (remove from map and clear the group)
        if (markers) {
            map.removeLayer(markers);
            markers.clearLayers();
            // Re-add the empty cluster group to the map
            markers.addTo(map);
        }
        
        // Clear pin markers
        pinMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        pinMarkers.length = 0; // Clear array completely
        
        // Clear circle markers and labels
        circleMarkers.forEach(circle => {
            if (map.hasLayer(circle)) {
                map.removeLayer(circle);
            }
        });
        circleLabels.forEach(label => {
            if (map.hasLayer(label)) {
                map.removeLayer(label);
            }
        });
        circleMarkers.length = 0; // Clear array completely
        circleLabels.length = 0; // Clear array completely
        
        // Clear special circle
        if (specialCircle && map.hasLayer(specialCircle)) {
            map.removeLayer(specialCircle);
            specialCircle = null;
        }
        
        console.log('All markers cleared. Arrays reset.');
    };

    // Function to show clusters (your existing logic)
    const showClusters = () => {
        // Group filtered items by coordinates
        const locationGroups = {};
        
        currentFilteredItems.forEach(item => {    
            if (!item.lat_long) return;
            
            const coords = item.lat_long.split(',').map(coord => parseFloat(coord.trim()));
            if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                console.error('Invalid coordinates:', item.lat_long);
                return;
            }
            
            const [latitude, longitude] = coords;
            const key = `${latitude},${longitude}`;
            const locationName = item["Location"] || "Unknown Location";
            
            if (!locationGroups[key]) {
                locationGroups[key] = {
                    name: locationName, 
                    items: [],
                    coords: [latitude, longitude]
                };
            }
            
            locationGroups[key].items.push(item);
        });

        // Create clustered markers
        Object.values(locationGroups).forEach(group => {
            const { name, items, coords } = group;
            const coordsKey = `${coords[0]},${coords[1]}`;
            const isSpecial = coordsKey === SPECIAL_COORDS_KEY;

            let popupContent = createPopupContent(group, isSpecial, config);

            const marker = L.marker(coords, {
                icon: createCustomIcon(items.length, isSpecial)
            }).bindPopup(popupContent);

            if (isSpecial) {
                specialCircle = L.circle(coords, {
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    radius: 8000,
                    weight: 4
                }).addTo(map);
            }

            markers.addLayer(marker);
        });
    };

    // Function to show pins with numbers
    const showPinsWithNumbers = () => {
        const locationGroups = {};
        
        currentFilteredItems.forEach(item => {    
            if (!item.lat_long) return;
            
            const coords = item.lat_long.split(',').map(coord => parseFloat(coord.trim()));
            if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                return;
            }
            
            const [latitude, longitude] = coords;
            const key = `${latitude},${longitude}`;
            const locationName = item["Location"] || "Unknown Location";
            
            if (!locationGroups[key]) {
                locationGroups[key] = {
                    name: locationName, 
                    items: [],
                    coords: [latitude, longitude]
                };
            }
            
            locationGroups[key].items.push(item);
        });

        // Create individual pin markers with numbers
        Object.values(locationGroups).forEach(group => {
            const { name, items, coords } = group;
            const coordsKey = `${coords[0]},${coords[1]}`;
            const isSpecial = coordsKey === SPECIAL_COORDS_KEY;

            // Create a numbered pin icon
            const numberedIcon = L.divIcon({
                html: `<div class="numbered-pin ${isSpecial ? 'special' : ''}">
                         <div class="pin-number">${items.length}</div>
                         <div class="pin-point"></div>
                       </div>`,
                className: 'numbered-pin-container',
                iconSize: [30, 40],
                iconAnchor: [15, 40],
                popupAnchor: [0, -40]
            });

            let popupContent = createPopupContent(group, isSpecial, config);

            const marker = L.marker(coords, {
                icon: numberedIcon
            }).bindPopup(popupContent);

            if (isSpecial) {
                specialCircle = L.circle(coords, {
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    radius: 8000,
                    weight: 4
                }).addTo(map);
            }

            // Add to pin markers array and map
            pinMarkers.push(marker);
            marker.addTo(map);
        });
    };

    // Function to show proportional circles without displaying counts
    // Function to show proportional circles without displaying counts
    const showProportionalCircles = () => {
        const locationGroups = {};
        
        currentFilteredItems.forEach(item => {    
            if (!item.lat_long) return;
            
            const coords = item.lat_long.split(',').map(coord => parseFloat(coord.trim()));
            if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                return;
            }
            
            const [latitude, longitude] = coords;
            const key = `${latitude},${longitude}`;
            const locationName = item["Location"] || "Unknown Location";
            
            if (!locationGroups[key]) {
                locationGroups[key] = {
                    name: locationName, 
                    items: [],
                    coords: [latitude, longitude]
                };
            }
            
            locationGroups[key].items.push(item);
        });

        // Find max count for proportional sizing
        const maxCount = Math.max(...Object.values(locationGroups).map(g => g.items.length));
        
        Object.values(locationGroups).forEach(group => {
            const { name, items, coords } = group;
            const coordsKey = `${coords[0]},${coords[1]}`;
            const isSpecial = coordsKey === SPECIAL_COORDS_KEY;
            
            // Calculate proportional radius based on square root for better visual scaling
            const minRadius = 800;
            const maxRadius = 5000;
            const normalizedCount = Math.sqrt(items.length / maxCount); // Square root for better visual proportion
            const radius = minRadius + (maxRadius - minRadius) * normalizedCount;
            
            // Get colors from Tailwind classes
            const getTailwindColor = (className) => {
                const element = document.createElement('div');
                element.className = className;
                element.style.display = 'none';
                document.body.appendChild(element);
                const color = getComputedStyle(element).backgroundColor;
                document.body.removeChild(element);
                return color;
            };
            
            const specialColor = getTailwindColor('bg-red-500');
            const normalColor = getTailwindColor('bg-secondary-500');
            
            const circleColors = {
                color: isSpecial ? specialColor : normalColor,
                fillColor: isSpecial ? specialColor : normalColor
            };
            
            // Create proportional circle without count display
            const circle = L.circle(coords, {
                color: circleColors.color,
                fillColor: circleColors.fillColor,
                fillOpacity: 0.3,
                radius: radius,
                weight: items.length === 1 ? 2 : Math.min(2 + Math.floor(items.length / 5), 6) // Vary border thickness too
            });

            // Create popup content
            let popupContent = createPopupContent(group, isSpecial, config);
            
            circle.bindPopup(popupContent);

            // Add special circle if needed
            if (isSpecial) {
                specialCircle = L.circle(coords, {
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    radius: 8000,
                    weight: 4
                }).addTo(map);
            }

            // Add to array and map
            circleMarkers.push(circle);
            circle.addTo(map);
        });
    };

    // Modify the renderMarkers function to store filtered items and delegate to marker type functions
    var renderMarkers = (filteredItems) => {
        // Store current filtered items for marker type switching
        currentFilteredItems = filteredItems;
        
        // Clear previous markers and special circle
        clearAllMarkers();
        
        // Delegate to appropriate marker rendering function
        switch(currentMarkerType) {
            case 'clusters':
                showClusters();
                break;
            case 'pins':
                showPinsWithNumbers();
                break;
            case 'circles':
                showProportionalCircles();
                break;
            default:
                showClusters();
        }

        // If no markers were added, log a message
        if (currentFilteredItems.length === 0) {
            console.log('No markers to display for current filter selection');
        } else {
            console.log(`Processed ${currentFilteredItems.length} items for map display`);
        }
    };

    // Function to switch marker type
    const switchMarkerType = (markerType) => {
        currentMarkerType = markerType;
        console.log(`Switching to marker type: ${markerType}`);
        // Re-render with current filtered items
        renderMarkers(currentFilteredItems);
    };

    // Function to set the focus callback
    const setFocusResultCallback = (callback) => {
        focusResultCallback = callback;
        // Make it globally accessible for the onclick handlers
        window.focusOnResult = callback;
    };

    // Make marker type switching globally accessible
    window.switchMarkerType = switchMarkerType;

    // Store references globally for external access
    window.pinMarkers = pinMarkers;
    window.circleMarkers = circleMarkers;
    window.circleLabels = circleLabels;
    window.markerClusterGroup = markers;

    // Return the API
    return {
        map,
        markers,
        renderMarkers,
        setFocusResultCallback,
        switchMarkerType,
        clearAllMarkers
    };
}

export { initMap };