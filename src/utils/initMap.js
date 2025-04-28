import 'leaflet/dist/leaflet.css'; 
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

function initMap(config) {
    const { initialView, initialZoom, tileLayer, attribution } = config.map;

    const map = L.map('map').setView(initialView, initialZoom);
    L.tileLayer(tileLayer, { attribution }).addTo(map);

    // Create a custom icon using Lucide MapPin
    const createCustomIcon = (count) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1e40af" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
          ${count > 1 ? `<text x="12" y="10" text-anchor="middle" dy=".3em" fill="white" font-size="8" font-family="Arial">${count}</text>` : ''}
        </svg>
      `;

      return L.divIcon({
        html: svg,
        className: 'custom-marker',
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
    `;
    document.head.appendChild(style);

    // Function to render markers
    const renderMarkers = (items) => {
      // Clear previous markers
      markers.clearLayers();

      // Group items by coordinates
      const locationGroups = {};
      
      items.forEach(item => {
        // Handle case where both lat_long and Spazi geografici might be arrays
        const latLongs = Array.isArray(item.lat_long) ? item.lat_long : [item.lat_long];
        const locationNames = Array.isArray(item["Spazi geografici"]) 
          ? item["Spazi geografici"] 
          : [item["Spazi geografici"] || "Unknown Location"];
        
        // Process each coordinate
        latLongs.forEach((latLongEntry, index) => {
          if (!latLongEntry) return; // Skip empty entries
          
          let coords;
          
          // If it's a string like "45.9027,7.6587"
          if (typeof latLongEntry === 'string') {
            coords = latLongEntry.split(',').map(coord => parseFloat(coord.trim()));
          } else {
            // Skip if coordinates are invalid
            return;
          }
          
          // Skip if we couldn't parse coordinates properly
          if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            console.error('Invalid coordinates:', latLongEntry);
            return;
          }
          
          const [latitude, longitude] = coords;
          const key = `${latitude},${longitude}`;
          
          // Get corresponding location name (or use index if possible)
          const locName = locationNames[index] || locationNames[0] || "Unknown Location";
          
          if (!locationGroups[key]) {
            locationGroups[key] = {
              name: locName, 
              items: [],
              coords: [latitude, longitude]
            };
          }
          
          locationGroups[key].items.push(item);
        });
      });

      // Create markers for each location group
      Object.values(locationGroups).forEach(group => {
        const { name, items, coords } = group;
        const count = items.length;

        // Create popup content
        const popupContent = `
        <div class="max-h-60 overflow-y-auto p-2">
          <h1>${name}</h1>
          <h3 class="font-bold mb-2">${items.length} opere letterarie</h3> 
          <ul class="space-y-2">
            ${items.map(item => `
              <li class="border-b pb-2">
                ${item["Titolo"] || 'Unnamed'} (${item.Anno || 'Unknown Year'}) <br>
                ${item.Alpinist ? `Alpinisti: ${item.Alpinist} <br>` : ''}
                ${item.Guide ? `Guide: ${item.Guide}` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        `;

        // Create marker with custom icon
        const marker = L.marker(coords, {
          icon: createCustomIcon(count)
        }).bindPopup(popupContent);

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