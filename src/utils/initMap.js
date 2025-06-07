import 'leaflet/dist/leaflet.css'; 
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

function initMap(config) {
    const { initialView, initialZoom, tileLayer, attribution } = config.map;

    const map = L.map('map').setView(initialView, initialZoom);
    L.tileLayer(tileLayer, { attribution }).addTo(map);

    // Special coordinates that get unique treatment
    const SPECIAL_COORDS = [38.7200, -24.2200];
    const SPECIAL_COORDS_KEY = `${SPECIAL_COORDS[0]},${SPECIAL_COORDS[1]}`;

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
      
      /* Custom popup styles with scrolling */
      .leaflet-popup-content-wrapper {
        border-radius: 8px;
        padding: 0;
      }
      
      .leaflet-popup-content {
        margin: 0;
        max-height: 400px;
        overflow-y: auto;
        overflow-x: hidden;
        width: 320px !important;
      }
      
      /* Custom scrollbar styling */
      .leaflet-popup-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .leaflet-popup-content::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      .leaflet-popup-content::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      .leaflet-popup-content::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
      
      /* Firefox scrollbar styling */
      .leaflet-popup-content {
        scrollbar-width: thin;
        scrollbar-color: #c1c1c1 #f1f1f1;
      }
      
      /* Ensure popup content containers don't exceed bounds */
      .popup-container {
        max-width: 100%;
        box-sizing: border-box;
      }
      
      /* Add some padding to the scrollable content */
      .popup-content-inner {
        padding: 4px;
      }
    `;
    document.head.appendChild(style);

    // Store reference to special circle for cleanup
    let specialCircle = null;

    // Function to render markers
    const renderMarkers = (items) => {
      // Clear previous markers and special circle
      markers.clearLayers();
      if (specialCircle) {
        map.removeLayer(specialCircle);
        specialCircle = null;
      }

      // Group items by coordinates
      const locationGroups = {};
      
      items.forEach(item => {    
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
        
        locationGroups[key].items.push(item);
      });

      // Create markers for each location group
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
                alpinist: item.Autore,
                guide: item.Guide
              };
            }
            if (item["Spazi geografici"]) {
              operaGroups[key].locations.add(item["Spazi geografici"]);
            }
          });
          
          popupContent = `
          <div class="popup-container">
            <div class="popup-content-inner">
              <div class="max-w-sm bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow-lg">
                <div class="bg-red-500 text-white p-2 rounded-t-lg">
                  <h2 class="font-bold text-base flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                      <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                    </svg>
                    Special Location
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
                  <div class="space-y-1">
                    ${Object.values(operaGroups).map(group => `
                      <div class="bg-white rounded p-2 shadow-sm border border-gray-100 text-xs">
                        <div class="flex items-start gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0">
                            <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
                            <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
                          </svg>
                          <div class="min-w-0 flex-1">
                            <div class="font-semibold text-gray-800 leading-tight">${group.title}, ${group.alpinist || 'Unknown Author'} (${group.year})</div>
                            <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                                <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                              </svg>
                              ${Array.from(group.locations).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          `;
        } else {
          // Regular popup format
          popupContent = `
          <div class="popup-container">
            <div class="popup-content-inner">
              <div class="max-w-sm bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg">
                <div class="bg-blue-500 text-white p-2 rounded-t-lg">
                  <h2 class="font-bold text-base flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                      <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
                    </svg>
                    ${name}
                  </h2>
                </div>
                <div class="p-3">
                  <h3 class="font-semibold text-sm text-gray-800 flex items-center gap-1 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-blue-500">
                      <path d="M3 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3ZM3 7.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3ZM2 12.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1ZM7 4a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4ZM7.5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6ZM7 12.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Z"/>
                    </svg>
                    ${items.length} opere letterarie
                  </h3>
                  <div class="space-y-1">
                    ${items.map(item => `
                      <div class="bg-white rounded p-2 shadow-sm border border-gray-100 text-xs">
                        <div class="flex items-start gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0">
                            <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-8.5A1.75 1.75 0 0 0 12.25 2h-8.5ZM3.5 3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5Z"/>
                            <path d="M5.5 5.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM5.5 8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75ZM6.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"/>
                          </svg>
                          <div class="min-w-0 flex-1">
                            <div class="font-semibold text-gray-800 leading-tight">${item["Titolo"] || 'Unnamed'}, ${item.Alpinist || 'Unknown Author'} (${item.Anno || 'Unknown Year'})</div>
                            ${item.Guide ? `
                              <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"/>
                                </svg>
                                ${item.Guide}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          `;
        }

        // Create marker with custom icon
        const marker = L.marker(coords, {
          icon: createCustomIcon(items.length, isSpecial)
        }).bindPopup(popupContent, {
          maxWidth: 320,
          maxHeight: 400,
          className: 'custom-scrollable-popup'
        });

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
      
      // If no markers were added, log an error
      if (Object.keys(locationGroups).length === 0) {
        console.error('No valid coordinates found in the data');
      } else {
        console.log(`Added ${Object.keys(locationGroups).length} markers to the map`);
      }
    };

    // Return the map and functions
    return {
      map,
      markers,
      renderMarkers
    };
}

export { initMap };