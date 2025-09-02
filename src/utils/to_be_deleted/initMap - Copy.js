const base = import.meta.env.BASE_URL;
import 'leaflet/dist/leaflet.css'; 
import L from 'leaflet';

function initMap(config) {
    const { initialView, initialZoom, tileLayer, attribution, typologyColors, defaultColor } = config.map;

    const map = L.map('map').setView(initialView, initialZoom);
    L.tileLayer(tileLayer, { attribution }).addTo(map);

    // Store geodata for cross-referencing
    let geodataMap = new Map();
    
    // Cache for parsed coordinates and processed data
    const coordinateCache = new Map();
    const processedLocationsCache = new Map();
    
    // Load and parse geodata.tsv
    const loadGeodata = async () => {
        try {
            const response = await fetch(`${base}/data/geodata.tsv`);
            const tsvText = await response.text();
            
            // Parse TSV data more efficiently
            const lines = tsvText.split('\n');
            const headers = lines[0].split('\t').map(h => h.trim());
            
            // Create a map of ID_opera to array of geodata entries
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.split('\t');
                const row = Object.fromEntries(
                    headers.map((header, index) => [header, values[index]?.trim() || ''])
                );
                
                if (row.ID_opera) {
                    if (!geodataMap.has(row.ID_opera)) {
                        geodataMap.set(row.ID_opera, []);
                    }
                    geodataMap.get(row.ID_opera).push(row);
                }
            }
            
            const totalEntries = Array.from(geodataMap.values()).reduce((sum, arr) => sum + arr.length, 0);
            console.log(`Loaded ${totalEntries} geodata entries for ${geodataMap.size} unique IDs`);
        } catch (error) {
            console.error('Error loading geodata:', error);
        }
    };

    // Memoized coordinate parsing
    const parseCoordinates = (coordString) => {
        if (coordinateCache.has(coordString)) {
            return coordinateCache.get(coordString);
        }
        
        if (!coordString || typeof coordString !== 'string') {
            coordinateCache.set(coordString, null);
            return null;
        }
        
        const coords = coordString.split(',').map(coord => parseFloat(coord.trim()));
        const result = (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) ? coords : null;
        
        coordinateCache.set(coordString, result);
        return result;
    };

    // Helper function to parse multiple values separated by common delimiters
    const parseMultipleValues = (value) => {
        if (!value || typeof value !== 'string') return [];
        
        // Split by common separators: semicolon, comma, pipe, or double space
        const separators = /[;,|]/;
        return value.split(separators)
            .map(v => v.trim())
            .filter(v => v.length > 0);
    };

    // Associate colors with place typologies using config
    const getTypologyColor = (tipologia) => {
        if (!tipologia || typeof tipologia !== 'string') {
            return defaultColor;
        }
        
        const normalized = tipologia.toLowerCase().trim();
        return typologyColors[normalized] || defaultColor;
    };

    // Create a custom circular icon with concentric circles based on typologies
    const createCustomIcon = (count, typologies, customSize) => {
        // Use custom size from geodata if available, otherwise calculate based on count
        const baseSize = 30;
        const maxSize = 80;
        const size = customSize || Math.min(maxSize, baseSize + (count * 6));
        
        const validTypologies = Array.isArray(typologies) 
            ? typologies.filter(tip => tip && typeof tip === 'string' && tip.trim().length > 0)
            : [];

        const numCircles = Math.min(5, Math.max(1, validTypologies.length));
        const radiusStep = (size/2 - 4) / numCircles;
        
        let circles = '';
        for (let i = 0; i < numCircles; i++) {
            const radius = (size/2 - 2) - (i * radiusStep);
            const tipologia = validTypologies[i] || (validTypologies.length > 0 ? validTypologies[0] : null);
            const color = getTypologyColor(tipologia);
            const opacity = 0.7 + (i * 0.1);
            
            circles += `
                <circle cx="${size/2}" cy="${size/2}" r="${radius}" 
                        fill="${color}" 
                        stroke="#ffffff" 
                        stroke-width="1" 
                        opacity="${opacity}"/>
            `;
        }
        
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                ${circles}
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".3em" 
                      fill="white" font-size="${Math.max(10, size/5)}" 
                      font-family="Arial, sans-serif" font-weight="bold" 
                      stroke="#000000" stroke-width="0.5">${count}</text>
            </svg>
        `;

        return L.divIcon({
            html: svg,
            className: 'custom-marker',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2],
            popupAnchor: [0, -size/2]
        });
    };

    // Create legend
    const createLegend = () => {
        // Remove existing legend if any
        const existingLegend = document.querySelector('.map-legend');
        if (existingLegend) {
            existingLegend.remove();
        }

        const legend = document.createElement('div');
        legend.className = 'map-legend';
        
        // Create mini marker examples
        const createMiniMarker = (size, count) => {
            return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="legend-marker-example">
                <circle cx="${size/2}" cy="${size/2}" r="${(size/2) - 1}" 
                        fill="${defaultColor}" 
                        stroke="#ffffff" 
                        stroke-width="0.5"/>
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".25em" 
                      fill="white" font-size="${Math.max(6, size/4)}" 
                      font-family="Arial, sans-serif" font-weight="bold">${count}</text>
            </svg>`;
        };

        // Get all available typologies from config
        const typologyEntries = Object.entries(typologyColors);
        
        legend.innerHTML = `
            <button class="legend-toggle" onclick="this.parentElement.classList.toggle('collapsed'); this.parentElement.querySelector('.legend-content').classList.toggle('collapsed');">−</button>
            <div class="legend-content">
                <div class="legend-title">Mappa delle Opere Letterarie</div>
                
                <div class="legend-section">
                    <div class="legend-section-title">Dimensione Marker</div>
                    <div class="legend-item">
                        ${createMiniMarker(16, '1')}
                        <span>1 opera</span>
                    </div>
                    <div class="legend-item">
                        ${createMiniMarker(22, '3')}
                        <span>3 opere</span>
                    </div>
                    <div class="legend-item">
                        ${createMiniMarker(28, '5+')}
                        <span>5+ opere</span>
                    </div>
                </div>

                ${typologyEntries.length > 0 ? `
                <div class="legend-section">
                    <div class="legend-section-title">Tipologie di Luoghi</div>
                    ${typologyEntries.map(([typology, color]) => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${color};"></div>
                            <span>${typology.charAt(0).toUpperCase() + typology.slice(1)}</span>
                        </div>
                    `).join('')}
                    ${defaultColor !== '#666666' ? `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${defaultColor};"></div>
                            <span>Altri/Non specificato</span>
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                <div class="legend-section">
                    <div class="legend-section-title">Note</div>
                    <div style="font-size: 10px; color: #666; line-height: 1.3;">
                        • I marker con cerchi concentrici mostrano luoghi con tipologie multiple<br>
                        • Clicca sui marker per vedere i dettagli delle opere
                    </div>
                </div>
            </div>
        `;

        // Add legend to map container
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.appendChild(legend);
        }
    };
    
    // Initialize marker group
    const markers = L.layerGroup().addTo(map);

    // Add custom CSS
    if (!document.querySelector('#map-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'map-custom-styles';
        style.textContent = `
            .custom-marker {
                background: none;
                border: none;
                transition: transform 0.2s ease;
            }
            .custom-marker:hover {
                transform: scale(1.1);
                z-index: 1000;
            }
            .typology-tag {
                display: inline-block;
                padding: 2px 6px;
                margin: 1px;
                border-radius: 3px;
                font-size: 11px;
                color: white;
                font-weight: bold;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
            }
            .map-legend {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                max-width: 280px;
                font-family: Arial, sans-serif;
                border: 1px solid rgba(0, 0, 0, 0.1);
            }
            .legend-title {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 10px;
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            .legend-section {
                margin-bottom: 12px;
            }
            .legend-section:last-child {
                margin-bottom: 0;
            }
            .legend-section-title {
                font-weight: bold;
                font-size: 12px;
                color: #666;
                margin-bottom: 6px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
                font-size: 11px;
            }
            .legend-item:last-child {
                margin-bottom: 0;
            }
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
                border: 1px solid rgba(0, 0, 0, 0.2);
                flex-shrink: 0;
            }
            .legend-marker-example {
                margin-right: 8px;
                flex-shrink: 0;
            }
            .legend-toggle {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .legend-toggle:hover {
                color: #333;
            }
            .legend-content {
                transition: all 0.3s ease;
            }
            .legend-content.collapsed {
                display: none;
            }
            .map-legend.collapsed {
                padding: 10px;
            }
        `;
        document.head.appendChild(style);
    }


    // Enhanced item structure that references geodata instead of duplicating
    const enhanceItemWithGeodata = (item) => {
        const geodataEntries = geodataMap.get(item.ID_opera) || [];
        
        return {
            ...item,
            geodataEntries, // Reference to geodata instead of duplication
            hasGeodata: geodataEntries.length > 0
        };
    };

    // Process location data for an enhanced item
    const processItemLocations = (enhancedItem) => {
        const locations = [];
        
        if (enhancedItem.hasGeodata) {
            // Process each geodata entry
            enhancedItem.geodataEntries.forEach(geodata => {
                const coords = parseCoordinates(geodata.lat_long || enhancedItem.lat_long);
                if (!coords) return;
                
                locations.push({
                    coords,
                    name: geodata["Spazi geografici"] || geodata.place_name || enhancedItem["Spazi geografici"] || "Unknown Location",
                    typologies: parseMultipleValues(geodata["Tipologia del luogo"] || geodata.tipologia || enhancedItem["Tipologia del luogo"]),
                    notes: geodata["Note sullo spazio"] || geodata.tipologia || enhancedItem["Note sullo spazio"],
                    customSize: geodata.size ? parseInt(geodata.size) : null,
                    customColor: geodata.color || null,
                    item: enhancedItem
                });
            });
        } else {
            // Process original item coordinates
            const originalCoords = Array.isArray(enhancedItem.lat_long) 
                ? enhancedItem.lat_long 
                : [enhancedItem.lat_long];
            
            const locationNames = Array.isArray(enhancedItem["Spazi geografici"]) 
                ? enhancedItem["Spazi geografici"] 
                : [enhancedItem["Spazi geografici"] || "Unknown Location"];
                
            originalCoords.forEach((coordString, index) => {
                const coords = parseCoordinates(coordString);
                if (!coords) return;
                
                locations.push({
                    coords,
                    name: locationNames[index] || locationNames[0] || "Unknown Location",
                    typologies: parseMultipleValues(enhancedItem["Tipologia del luogo"]),
                    notes: enhancedItem["Note sullo spazio"],
                    customSize: null,
                    customColor: null,
                    item: enhancedItem
                });
            });
        }
        
        return locations;
    };

    // Function to render markers
    const renderMarkers = (items) => {
        // Clear previous markers and cache
        markers.clearLayers();
        processedLocationsCache.clear();

        // Enhance items with geodata references
        const enhancedItems = items.map(enhanceItemWithGeodata);

        // Group locations by coordinates
        const locationGroups = new Map();
        
        enhancedItems.forEach(enhancedItem => {
            const locations = processItemLocations(enhancedItem);
            
            locations.forEach(location => {
                const [latitude, longitude] = location.coords;
                const key = `${latitude},${longitude}`;
                
                if (!locationGroups.has(key)) {
                    locationGroups.set(key, {
                        name: location.name,
                        coords: [latitude, longitude],
                        items: [],
                        allTypologies: new Set(),
                        customSizes: [],
                        customColors: []
                    });
                }
                
                const group = locationGroups.get(key);
                
                // Store item with its location-specific data
                group.items.push({
                    item: location.item,
                    locationTypologies: location.typologies,
                    notes: location.notes,
                    customColor: location.customColor
                });
                
                // Collect unique typologies
                location.typologies.forEach(typ => {
                    if (typ && typeof typ === 'string' && typ.trim()) {
                        group.allTypologies.add(typ.trim());
                    }
                });
                
                // Collect custom attributes
                if (location.customSize) group.customSizes.push(location.customSize);
                if (location.customColor) group.customColors.push(location.customColor);
            });
        });

        // Create markers for each location group
        locationGroups.forEach(group => {
            const { name, coords, items, allTypologies, customSizes } = group;
            const count = items.length;
            const uniqueTypologies = Array.from(allTypologies);
            
            // Use average custom size if available
            const avgCustomSize = customSizes.length > 0 
                ? Math.round(customSizes.reduce((a, b) => a + b, 0) / customSizes.length)
                : null;

            // Create optimized popup content
            const popupContent = `
            <div class="max-h-60 overflow-y-auto p-2">
                <h1>${name}</h1>
                <h3 class="font-bold mb-2">${items.length} opere letterarie sono ambientate in questo spazio</h3>
                <ul class="space-y-2">
                    ${items.map(({ item, locationTypologies, notes, customColor }) => `
                        <li class="border-b pb-2">
                            <div class="font-medium">${item["Titolo"] || 'Unnamed'} (${item.Anno || 'Unknown Year'})</div>
                            ${locationTypologies.length > 0 && notes ? `
                              <div class="mt-1">
                                  ${locationTypologies.map(typ => 
                                      `<span class="text-xs" style="color: ${customColor || getTypologyColor(typ)}">⬤ ${typ}</span>`
                                  ).join(' ')}
                              </div>
                              <div class="mt-2 border-l-2 border-gray-300 pl-3 text-gray-600 italic">
                                  ${notes}
                              </div>
                            ` : `
                              <div class="flex mt-1 gap-4">
                                  ${locationTypologies.length > 0 ? `
                                    <div class="flex-shrink-0">
                                        ${locationTypologies.map(typ => 
                                            `<span class="text-xs" style="color: ${customColor || getTypologyColor(typ)}">⬤ ${typ}</span>`
                                        ).join(' ')}
                                    </div>
                                  ` : ''}
                                  ${notes ? `
                                    <div class="flex-1 border-l-2 border-gray-300 pl-3 text-gray-600 italic">
                                        ${notes}
                                    </div>
                                  ` : ""}
                              </div>
                            `}
                        </li>
                    `).join('')}
                </ul>
            </div>
            `;

            const marker = L.marker(coords, {
                icon: createCustomIcon(count, uniqueTypologies, avgCustomSize)
            }).bindPopup(popupContent);

            markers.addLayer(marker);
        });
        
        console.log(`Added ${locationGroups.size} markers to the map`);
    };

        // Load geodata on initialization
    loadGeodata().then(() => {
        // Create legend after geodata is loaded
        createLegend();
    });

    // Return the map and functions
    return {
        map,
        markers,
        renderMarkers,
        loadGeodata,
        geodataMap,
        createLegend,
        // Expose cache for debugging/monitoring
        coordinateCache,
        processedLocationsCache
    };
}

export { initMap };