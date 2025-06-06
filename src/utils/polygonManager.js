
/**
 * PolygonManager - Handles loading and displaying polygons for search results
 * Modified to use local polygon repository with OSM ID mapping
 * Excludes Point geometries since they cannot be visualized as polygons
 */

const base = import.meta.env.BASE_URL;

export class PolygonManager {
  constructor(map, config = {}) {
    this.map = map;
    this.config = {
      polygonStyle: {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3388ff',
        fillOpacity: 0.1,
        ...config.polygonStyle
      },
      highlightStyle: {
        color: '#ff6b35',
        weight: 3,
        opacity: 1,
        fillColor: '#ff6b35',
        fillOpacity: 0.2,
        ...config.highlightStyle
      },
      // Local polygon repository
      polygonRepositoryUrl: '/data/polygons.json',
      // Cache settings
      enableCache: true,
      cacheExpiry: 3600000, // 1 hour in milliseconds
      ...config
    };
    
    // Store polygon layers and cache
    this.polygonLayers = new Map();
    this.polygonCache = new Map();
    this.polygonRepository = null; // Will hold the loaded polygon data
    this.currentHighlighted = null;
    
    // Create a layer group for polygons
    this.polygonLayerGroup = L.layerGroup().addTo(this.map);
    
    // Load the polygon repository on initialization
    this.loadPolygonRepository();
  }

  /**
   * Check if GeoJSON geometry is a valid polygon type (not a Point)
   * @param {Object} geojson - GeoJSON object to check
   * @returns {boolean} True if it's a valid polygon geometry
   */
  isValidPolygonGeometry(geojson) {
    if (!geojson || !geojson.type) {
      return false;
    }

    // Handle different GeoJSON structures
    if (geojson.type === 'FeatureCollection') {
      // Check if any feature has a valid polygon geometry
      return geojson.features && geojson.features.some(feature => 
        this.isValidPolygonGeometry(feature)
      );
    }
    
    if (geojson.type === 'Feature') {
      return this.isValidPolygonGeometry(geojson.geometry);
    }
    
    // Check geometry type directly
    const validTypes = ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'];
    return validTypes.includes(geojson.type);
  }

  /**
   * Filter out Point geometries from GeoJSON data
   * @param {Object} geojson - GeoJSON object to filter
   * @returns {Object|null} Filtered GeoJSON or null if no valid geometries
   */
  filterValidGeometries(geojson) {
    if (!geojson || !geojson.type) {
      return null;
    }

    if (geojson.type === 'FeatureCollection') {
      const validFeatures = geojson.features.filter(feature => 
        this.isValidPolygonGeometry(feature)
      );
      
      if (validFeatures.length === 0) {
        return null;
      }
      
      return {
        ...geojson,
        features: validFeatures
      };
    }
    
    if (geojson.type === 'Feature') {
      return this.isValidPolygonGeometry(geojson.geometry) ? geojson : null;
    }
    
    // Direct geometry object
    return this.isValidPolygonGeometry(geojson) ? geojson : null;
  }

  /**
   * Load the local polygon repository
   */
async loadPolygonRepository() {
  try {
    if (this.polygonRepository) {
      console.log('Polygon repository already loaded');
      return this.polygonRepository;
    }

    const response = await fetch(`${base}/data/polygons.json`);
    if (!response.ok) {
      throw new Error(`Failed to load polygon repository: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    // Clean up the data - filter out null/invalid entries and Point geometries
    this.polygonRepository = {};
    let validCount = 0;
    let invalidCount = 0;
    let pointsSkipped = 0;
    
    for (const [key, polygonInfo] of Object.entries(rawData)) {
      if (polygonInfo && typeof polygonInfo === 'object' && polygonInfo.osm_id) {
        // Check if the geometry is valid (not a Point)
        if (polygonInfo.geojson && this.isValidPolygonGeometry(polygonInfo.geojson)) {
          // Filter the geojson to remove any Point geometries
          const filteredGeojson = this.filterValidGeometries(polygonInfo.geojson);
          if (filteredGeojson) {
            this.polygonRepository[key] = {
              ...polygonInfo,
              geojson: filteredGeojson
            };
            validCount++;
          } else {
            pointsSkipped++;
          }
        } else {
          console.log(`Skipping entry with Point geometry or invalid geojson: ${key}`);
          pointsSkipped++;
        }
      } else {
        console.warn(`Skipping invalid polygon entry: ${key}`, polygonInfo);
        invalidCount++;
      }
    }
    
    console.log(`Polygon repository loaded successfully. Valid polygons: ${validCount}, Invalid/skipped: ${invalidCount}, Points skipped: ${pointsSkipped}`);
    
    return this.polygonRepository;
  } catch (error) {
    console.error('Error loading polygon repository:', error);
    this.polygonRepository = {};
    return this.polygonRepository;
  }
}

  /**
   * Load and display polygon for a specific location/result
   * @param {Object} locationData - Location data containing polygon information
   * @param {boolean} highlight - Whether to highlight this polygon
   * @param {boolean} fitBounds - Whether to fit map bounds to polygon
   */
  async loadPolygon(locationData, highlight = false, fitBounds = false) {
    try {
      const locationId = this.getLocationId(locationData);
      
      // Remove existing polygon for this location if it exists
      this.removePolygon(locationId);

      // Get polygon data - either from locationData or fetch it
      let polygonData = null;
      
      if (locationData.geojson) {
        // Check if the existing geojson is valid (not a Point)
        if (this.isValidPolygonGeometry(locationData.geojson)) {
          polygonData = this.filterValidGeometries(locationData.geojson);
        } else {
          console.log('Skipping location with Point geometry:', locationData.display_name);
          return null;
        }
      } else {
        // Fetch polygon data from local repository using OSM ID
        polygonData = await this.fetchPolygonDataByOsmId(locationData);
      }

      if (!polygonData) {
        console.warn('No valid polygon data available for location:', locationData);
        return null;
      }

      // Create polygon layer from GeoJSON
      const polygonLayer = this.createPolygonLayer(polygonData, locationData);
      
      // Store the polygon layer
      this.polygonLayers.set(locationId, {
        layer: polygonLayer,
        data: locationData,
        geojson: polygonData,
        isHighlighted: highlight
      });

      // Add to map
      this.polygonLayerGroup.addLayer(polygonLayer);

      // Apply highlighting if requested
      if (highlight) {
        this.highlightPolygon(locationId);
      }

      // Fit bounds if requested
      if (fitBounds) {
        this.fitBoundsToPolygon(polygonLayer);
      }

      return polygonLayer;
    } catch (error) {
      console.error('Error loading polygon:', error);
      return null;
    }
  }

  /**
   * Fetch polygon data from local repository using OSM ID
   * @param {Object} locationData - Location data with osm_id
   * @returns {Object|null} GeoJSON polygon data
   */
  async fetchPolygonDataByOsmId(locationData) {
    try {
      // Ensure repository is loaded
      await this.loadPolygonRepository();
      
      if (!locationData || !locationData.osm_id) {
        console.log('No OSM ID provided for location - skipping polygon load');
        return null;
      }

      const osmId = locationData.osm_id.toString();
      const locationId = this.getLocationId(locationData);
      
      // Check cache first
      if (this.config.enableCache && this.polygonCache.has(locationId)) {
        const cached = this.polygonCache.get(locationId);
        if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
          return cached.data;
        } else {
          // Remove expired cache entry
          this.polygonCache.delete(locationId);
        }
      }

      let polygonData = null;

      // Find polygon by OSM ID in the repository
      polygonData = this.findPolygonByOsmId(osmId, locationData.osm_type);

      // Cache the result if enabled and found
      if (this.config.enableCache && polygonData) {
        this.polygonCache.set(locationId, {
          data: polygonData,
          timestamp: Date.now()
        });
      }

      return polygonData;
    } catch (error) {
      console.error('Error fetching polygon data by OSM ID:', error);
      return null;
    }
  }

  /**
   * Find polygon data in the local repository by OSM ID
   * @param {string} osmId - OSM ID to search for
   * @param {string} osmType - OSM type (way, relation, node)
   * @returns {Object|null} GeoJSON polygon data
   */
  findPolygonByOsmId(osmId, osmType = null) {
    if (!this.polygonRepository) {
      console.warn('Polygon repository not loaded');
      return null;
    }

    const targetOsmId = osmId.toString();

    // Search through the repository for matching OSM ID
    for (const [key, polygonInfo] of Object.entries(this.polygonRepository)) {
      
      if (polygonInfo.osm_id && polygonInfo.osm_id.toString() === targetOsmId) {
        // If OSM type is provided, match it too for better accuracy
        if (osmType && polygonInfo.osm_type && polygonInfo.osm_type !== osmType) {
          console.log(`OSM ID matches but type doesn't: expected ${osmType}, got ${polygonInfo.osm_type}`);
          continue;
        }
        
        // Double-check that the geometry is valid (not a Point)
        if (this.isValidPolygonGeometry(polygonInfo.geojson)) {
          return polygonInfo.geojson;
        } else {
          console.log(`Found OSM ID ${targetOsmId} but geometry is Point type - skipping`);
          return null;
        }
      }
    }

    console.log(`No polygon found for OSM ID: ${targetOsmId}`);
    return null;
  }

  /**
   * Load polygon by OSM ID directly
   * @param {string|number} osmId - OSM ID
   * @param {string} osmType - OSM type (optional)
   * @param {boolean} highlight - Whether to highlight this polygon
   * @param {boolean} fitBounds - Whether to fit map bounds to polygon
   */
  async loadPolygonByOsmId(osmId, osmType = null, highlight = false, fitBounds = false) {
    await this.loadPolygonRepository();
    
    const polygonData = this.findPolygonByOsmId(osmId, osmType);
    
    if (!polygonData) {
      console.warn('Polygon not found for OSM ID:', osmId);
      return null;
    }

    // Find the polygon info in repository to get additional data
    let polygonInfo = null;
    for (const [key, info] of Object.entries(this.polygonRepository)) {
      if (info.osm_id && info.osm_id.toString() === osmId.toString()) {
        if (!osmType || !info.osm_type || info.osm_type === osmType) {
          polygonInfo = info;
          break;
        }
      }
    }

    if (!polygonInfo) {
      console.warn('Polygon info not found for OSM ID:', osmId);
      return null;
    }
    
    // Create a location data object from the repository data
    const locationData = {
      display_name: polygonInfo.display_name || `OSM ${osmType || 'object'} ${osmId}`,
      lat: polygonInfo.lat,
      lon: polygonInfo.lon,
      osm_type: polygonInfo.osm_type || osmType,
      osm_id: polygonInfo.osm_id,
      place_rank: polygonInfo.place_rank,
      importance: polygonInfo.importance,
      type: polygonInfo.type,
      class: polygonInfo.class,
      geojson: polygonInfo.geojson
    };

    return this.loadPolygon(locationData, highlight, fitBounds);
  }

  /**
   * Find polygon data in the local repository (fallback method)
   * @param {Object} locationData - Location data
   * @returns {Object|null} GeoJSON polygon data
   */
  findPolygonInRepository(locationData) {
    if (!this.polygonRepository) {
      console.warn('Polygon repository not loaded');
      return null;
    }

    // Primary method: OSM ID match
    if (locationData.osm_id) {
      const polygonData = this.findPolygonByOsmId(locationData.osm_id, locationData.osm_type);
      if (polygonData) {
        return polygonData;
      }
    }

    // Fallback methods only if OSM ID matching fails
    const displayName = locationData.display_name || locationData.name;
    if (displayName) {
      // Try exact name match
      for (const [key, polygonInfo] of Object.entries(this.polygonRepository)) {
        if (key.toLowerCase() === displayName.toLowerCase() && 
            this.isValidPolygonGeometry(polygonInfo.geojson)) {
          console.log('Found polygon by exact name match:', key);
          return polygonInfo.geojson;
        }
      }

      // Try partial name match
      for (const [key, polygonInfo] of Object.entries(this.polygonRepository)) {
        if ((displayName.toLowerCase().includes(key.toLowerCase()) || 
             key.toLowerCase().includes(displayName.toLowerCase())) &&
            this.isValidPolygonGeometry(polygonInfo.geojson)) {
          console.log('Found polygon by partial name match:', key);
          return polygonInfo.geojson;
        }
      }

      // Try matching against parts of the display name
      const nameParts = displayName.split(',').map(part => part.trim());
      for (const part of nameParts) {
        for (const [key, polygonInfo] of Object.entries(this.polygonRepository)) {
          if (key.toLowerCase() === part.toLowerCase() &&
              this.isValidPolygonGeometry(polygonInfo.geojson)) {
            console.log('Found polygon by name part match:', key);
            return polygonInfo.geojson;
          }
        }
      }
    }

    // Geographic proximity match (if coordinates are available)
    if (locationData.lat && locationData.lon) {
      const targetLat = parseFloat(locationData.lat);
      const targetLon = parseFloat(locationData.lon);
      
      for (const [key, polygonInfo] of Object.entries(this.polygonRepository)) {
        if (polygonInfo.lat && polygonInfo.lon && this.isValidPolygonGeometry(polygonInfo.geojson)) {
          const polyLat = parseFloat(polygonInfo.lat);
          const polyLon = parseFloat(polygonInfo.lon);
          
          // Check if point is within a reasonable distance (adjust threshold as needed)
          const distance = this.calculateDistance(targetLat, targetLon, polyLat, polyLon);
          if (distance < 50) { // 50km threshold
            console.log('Found polygon by proximity match:', key, 'Distance:', distance.toFixed(2), 'km');
            return polygonInfo.geojson;
          }
        }
      }
    }

    console.log('No polygon found in repository for:', displayName || locationData);
    return null;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Add a new polygon to the repository (for dynamic addition)
   * @param {string} name - Name/key for the polygon
   * @param {Object} polygonInfo - Polygon information object
   */
  addPolygonToRepository(name, polygonInfo) {
    if (!this.polygonRepository) {
      this.polygonRepository = {};
    }
    
    // Only add if it has valid polygon geometry
    if (polygonInfo.geojson && this.isValidPolygonGeometry(polygonInfo.geojson)) {
      const filteredGeojson = this.filterValidGeometries(polygonInfo.geojson);
      if (filteredGeojson) {
        this.polygonRepository[name] = {
          ...polygonInfo,
          geojson: filteredGeojson
        };
        console.log('Added polygon to repository:', name);
      } else {
        console.warn('Cannot add polygon - contains only Point geometries:', name);
      }
    } else {
      console.warn('Cannot add polygon - invalid or Point geometry:', name);
    }
  }

  /**
   * Get available polygon names from the repository
   * @returns {Array} Array of available polygon names
   */
  getAvailablePolygons() {
    if (!this.polygonRepository) {
      return [];
    }
    return Object.keys(this.polygonRepository);
  }

  /**
   * Load polygon by name directly from repository
   * @param {string} name - Name of the polygon in the repository
   * @param {boolean} highlight - Whether to highlight this polygon
   * @param {boolean} fitBounds - Whether to fit map bounds to polygon
   */
  async loadPolygonByName(name, highlight = false, fitBounds = false) {
    await this.loadPolygonRepository();
    
    if (!this.polygonRepository || !this.polygonRepository[name]) {
      console.warn('Polygon not found in repository:', name);
      return null;
    }

    const polygonInfo = this.polygonRepository[name];
    
    // Check if it has valid polygon geometry
    if (!this.isValidPolygonGeometry(polygonInfo.geojson)) {
      console.warn('Polygon has Point geometry - cannot visualize:', name);
      return null;
    }
    
    // Create a location data object from the repository data
    const locationData = {
      display_name: polygonInfo.display_name || name,
      lat: polygonInfo.lat,
      lon: polygonInfo.lon,
      osm_type: polygonInfo.osm_type,
      osm_id: polygonInfo.osm_id,
      place_rank: polygonInfo.place_rank,
      importance: polygonInfo.importance,
      type: polygonInfo.type,
      class: polygonInfo.class,
      geojson: polygonInfo.geojson
    };

    return this.loadPolygon(locationData, highlight, fitBounds);
  }

  /**
   * Create a Leaflet polygon layer from GeoJSON data
   * @param {Object} geojson - GeoJSON polygon data
   * @param {Object} locationData - Associated location data
   */
  createPolygonLayer(geojson, locationData) {
    const layer = L.geoJSON(geojson, {
      style: this.config.polygonStyle,
      onEachFeature: (feature, layer) => {
        // Add popup with location information
        if (locationData.display_name) {
          layer.bindPopup(`
            <div class="polygon-popup">
              <h4>${locationData.display_name}</h4>
              ${locationData.type ? `<p><strong>Type:</strong> ${locationData.type}</p>` : ''}
              ${locationData.class ? `<p><strong>Class:</strong> ${locationData.class}</p>` : ''}
              ${locationData.importance ? `<p><strong>Importance:</strong> ${locationData.importance.toFixed(3)}</p>` : ''}
              ${locationData.osm_id ? `<p><strong>OSM ID:</strong> ${locationData.osm_type}/${locationData.osm_id}</p>` : ''}
            </div>
          `);
        }

        // Add hover effects
        layer.on({
          mouseover: (e) => this.onPolygonHover(e, locationData),
          mouseout: (e) => this.onPolygonMouseOut(e, locationData),
          click: (e) => this.onPolygonClick(e, locationData)
        });
      }
    });

    return layer;
  }

  /**
   * Load polygons for multiple search results based on OSM IDs
   * Only loads polygons for items that actually have OSM IDs and valid polygon geometries
   * @param {Array} searchResults - Array of search result items
   * @param {string} highlightId - ID of result to highlight
   */
  async loadSearchResultPolygons(searchResults, highlightId = null) {
    // Clear existing polygons
    this.clearAllPolygons();

    // Filter results that have OSM IDs - be very strict about this
    const resultsWithOsmIds = searchResults.filter(result => 
      result && 
      result.osm_id && 
      (typeof result.osm_id === 'string' || typeof result.osm_id === 'number')
    );
    
    if (resultsWithOsmIds.length === 0) {
      console.log('No search results with valid OSM IDs found');
      return;
    }

    console.log(`Loading polygons for ${resultsWithOsmIds.length} results with OSM IDs`);

    // Load polygons with a small delay between requests to avoid overwhelming the system
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let loadedCount = 0;

    for (let i = 0; i < resultsWithOsmIds.length; i++) {
      const result = resultsWithOsmIds[i];
      const shouldHighlight = highlightId && this.getLocationId(result) === highlightId;
      
      try {
        const loadedLayer = await this.loadPolygon(result, shouldHighlight, false);
        if (loadedLayer) {
          loadedCount++;
        }
        
        // Add small delay between requests (50ms) for smooth loading
        if (i < resultsWithOsmIds.length - 1) {
          await delay(50);
        }
      } catch (error) {
        console.error('Error loading polygon for result:', result, error);
      }
    }

    console.log(`Successfully loaded ${loadedCount} polygons out of ${resultsWithOsmIds.length} results`);

    // Fit bounds to all polygons if any were loaded
    if (this.polygonLayers.size > 0) {
      // Small delay before fitting bounds to ensure all polygons are loaded
      setTimeout(() => {
        this.fitBoundsToAllPolygons();
      }, 100);
    }
  }

  /**
   * Highlight a specific polygon
   * @param {string} locationId - ID of the location to highlight
   */
  highlightPolygon(locationId) {
    // Remove previous highlight
    this.clearHighlight();

    const polygonData = this.polygonLayers.get(locationId);
    if (polygonData) {
      polygonData.layer.setStyle(this.config.highlightStyle);
      polygonData.isHighlighted = true;
      this.currentHighlighted = locationId;
      
      // Bring to front
      polygonData.layer.bringToFront();
    }
  }

  /**
   * Clear current polygon highlight
   */
  clearHighlight() {
    if (this.currentHighlighted) {
      const polygonData = this.polygonLayers.get(this.currentHighlighted);
      if (polygonData) {
        polygonData.layer.setStyle(this.config.polygonStyle);
        polygonData.isHighlighted = false;
      }
      this.currentHighlighted = null;
    }
  }

  /**
   * Remove a specific polygon from the map
   * @param {string} locationId - ID of the location polygon to remove
   */
  removePolygon(locationId) {
    const polygonData = this.polygonLayers.get(locationId);
    if (polygonData) {
      this.polygonLayerGroup.removeLayer(polygonData.layer);
      this.polygonLayers.delete(locationId);
      
      if (this.currentHighlighted === locationId) {
        this.currentHighlighted = null;
      }
    }
  }

  /**
   * Remove all polygons from the map
   */
  clearAllPolygons() {
    this.polygonLayerGroup.clearLayers();
    this.polygonLayers.clear();
    this.currentHighlighted = null;
  }

  /**
   * Fit map bounds to a specific polygon
   * @param {L.Layer} polygonLayer - Leaflet polygon layer
   */
  fitBoundsToPolygon(polygonLayer) {
    try {
      const bounds = polygonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 15
        });
      }
    } catch (error) {
      console.warn('Could not fit bounds to polygon:', error);
    }
  }

  /**
   * Fit map bounds to all loaded polygons
   */
  fitBoundsToAllPolygons() {
    try {
      const group = new L.featureGroup(Array.from(this.polygonLayers.values()).map(p => p.layer));
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 12
        });
      }
    } catch (error) {
      console.warn('Could not fit bounds to all polygons:', error);
    }
  }

  /**
   * Handle polygon hover events
   * @param {Event} e - Leaflet event
   * @param {Object} locationData - Location data
   */
  onPolygonHover(e, locationData) {
    const layer = e.target;
    
    // Temporarily highlight on hover (if not already highlighted)
    const locationId = this.getLocationId(locationData);
    const polygonData = this.polygonLayers.get(locationId);
    
    if (polygonData && !polygonData.isHighlighted) {
      layer.setStyle({
        weight: 3,
        opacity: 1,
        fillOpacity: 0.15
      });
    }

    // Emit custom event for other components to listen to
    this.map.fire('polygon:hover', {
      locationData: locationData,
      layer: layer
    });
  }

  /**
   * Handle polygon mouse out events
   * @param {Event} e - Leaflet event
   * @param {Object} locationData - Location data
   */
  onPolygonMouseOut(e, locationData) {
    const layer = e.target;
    const locationId = this.getLocationId(locationData);
    const polygonData = this.polygonLayers.get(locationId);
    
    // Reset style if not highlighted
    if (polygonData && !polygonData.isHighlighted) {
      layer.setStyle(this.config.polygonStyle);
    }

    // Emit custom event
    this.map.fire('polygon:mouseout', {
      locationData: locationData,
      layer: layer
    });
  }

  /**
   * Handle polygon click events
   * @param {Event} e - Leaflet event
   * @param {Object} locationData - Location data
   */
  onPolygonClick(e, locationData) {
    const locationId = this.getLocationId(locationData);
    this.highlightPolygon(locationId);

    // Emit custom event for other components
    this.map.fire('polygon:click', {
      locationData: locationData,
      layer: e.target,
      locationId: locationId
    });

    // Prevent map click
    L.DomEvent.stopPropagation(e);
  }

  /**
   * Generate a unique ID for a location based on OSM ID
   * @param {Object} locationData - Location data
   * @returns {string} Unique location ID
   */
  getLocationId(locationData) {
    // Prioritize OSM ID for consistent identification
    if (locationData.osm_id) {
      return `${locationData.osm_type || 'unknown'}_${locationData.osm_id}`;
    }
    
    if (locationData.lat && locationData.lon) {
      return `coord_${locationData.lat}_${locationData.lon}`;
    }
    
    // Fallback to display name hash
    return `name_${this.simpleHash(locationData.display_name || 'unknown')}`;
  }

  /**
   * Simple hash function for generating IDs
   * @param {string} str - String to hash
   * @returns {string} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Toggle polygon visibility
   * @param {boolean} visible - Whether polygons should be visible
   */
  setPolygonVisibility(visible) {
    if (visible) {
      if (!this.map.hasLayer(this.polygonLayerGroup)) {
        this.polygonLayerGroup.addTo(this.map);
      }
    } else {
      if (this.map.hasLayer(this.polygonLayerGroup)) {
        this.map.removeLayer(this.polygonLayerGroup);
      }
    }
  }

  /**
   * Get all currently loaded polygons
   * @returns {Array} Array of polygon data objects
   */
  getAllPolygons() {
    return Array.from(this.polygonLayers.values());
  }

  /**
   * Check if a polygon is currently loaded
   * @param {string} locationId - Location ID to check
   * @returns {boolean} Whether polygon is loaded
   */
  hasPolygon(locationId) {
    return this.polygonLayers.has(locationId);
  }

  /**
   * Update polygon style configuration
   * @param {Object} newStyles - New style configuration
   */
  updateStyles(newStyles) {
    this.config = {
      ...this.config,
      ...newStyles
    };

    // Apply new styles to existing polygons
    this.polygonLayers.forEach((polygonData, locationId) => {
      const style = polygonData.isHighlighted ? 
        this.config.highlightStyle : 
        this.config.polygonStyle;
      polygonData.layer.setStyle(style);
    });
  }

  /**
   * Clear polygon cache
   */
  clearCache() {
    this.polygonCache.clear();
  }

  /**
   * Destroy the polygon manager and clean up resources
   */
  destroy() {
    this.clearAllPolygons();
    this.clearCache();
    
    if (this.map.hasLayer(this.polygonLayerGroup)) {
      this.map.removeLayer(this.polygonLayerGroup);
    }
    
    this.polygonLayers.clear();
    this.polygonLayerGroup = null;
    this.polygonRepository = null;
    this.map = null;
  }
}

export default PolygonManager;