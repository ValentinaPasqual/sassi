/**
 * PolygonManager - Updated with async polygon loading support
 * Loads polygons from local repository using OSM ID mapping
 * Excludes Point geometries
 */

const base = import.meta.env.BASE_URL;

export class PolygonManager {
  constructor(map) {
    this.map = map;
    this.polygonLayers = new Map();
    this.polygonRepository = null;
    this.polygonLayerGroup = L.layerGroup().addTo(this.map);
    this.isLoading = false;
    this.currentResultHash = null;
    
    // Fixed styles
    this.defaultStyle = {
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillColor: '#3388ff',
      fillOpacity: 0.1
    };
  }

  /**
   * Check if geometry is valid for polygon display (not Point)
   */
  isValidGeometry(geojson) {
    if (!geojson?.type) return false;
    
    if (geojson.type === 'FeatureCollection') {
      return geojson.features?.some(f => this.isValidGeometry(f));
    }
    
    if (geojson.type === 'Feature') {
      return this.isValidGeometry(geojson.geometry);
    }
    
    return ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(geojson.type);
  }

  /**
   * Filter out Point geometries from GeoJSON
   */
  filterValidGeometries(geojson) {
    if (!geojson?.type) return null;

    if (geojson.type === 'FeatureCollection') {
      const validFeatures = geojson.features.filter(f => this.isValidGeometry(f));
      return validFeatures.length > 0 ? { ...geojson, features: validFeatures } : null;
    }
    
    return this.isValidGeometry(geojson) ? geojson : null;
  }

  /**
   * Load polygon repository from local file
   */
  async loadPolygonRepository() {
    if (this.polygonRepository) return this.polygonRepository;

    try {
      console.log('Loading polygon repository...');
      const response = await fetch(`${base}/data/polygons.json`);
      if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
      
      const rawData = await response.json();
      this.polygonRepository = {};
      
      // Clean data - only keep valid polygons
      for (const [key, info] of Object.entries(rawData)) {
        if (info?.osm_id && this.isValidGeometry(info.geojson)) {
          const filtered = this.filterValidGeometries(info.geojson);
          if (filtered) {
            this.polygonRepository[key] = { ...info, geojson: filtered };
          }
        }
      }
      
      console.log(`Loaded ${Object.keys(this.polygonRepository).length} valid polygons`);
      return this.polygonRepository;
    } catch (error) {
      console.error('Error loading polygon repository:', error);
      this.polygonRepository = {};
      return this.polygonRepository;
    }
  }

  /**
   * Load polygon for a location
   */
  async loadPolygon(locationData, highlight = false) {
    const locationId = this.getLocationId(locationData);
    this.removePolygon(locationId);

    let polygonData;
    if (locationData.geojson && this.isValidGeometry(locationData.geojson)) {
      polygonData = this.filterValidGeometries(locationData.geojson);
    } else {
      polygonData = await this.fetchPolygonByOsmId(locationData);
    }

    if (!polygonData) return null;

    const layer = this.createPolygonLayer(polygonData, locationData);
    
    this.polygonLayers.set(locationId, {
      layer,
      data: locationData,
      highlighted: highlight
    });

    this.polygonLayerGroup.addLayer(layer);

    return layer;
  }

  /**
   * Fetch polygon by OSM ID from repository
   */
  async fetchPolygonByOsmId(locationData) {
    await this.loadPolygonRepository();
    
    if (!locationData?.osm_id) return null;

    const osmId = locationData.osm_id.toString();
    
    for (const info of Object.values(this.polygonRepository)) {
      if (info.osm_id?.toString() === osmId) {
        // Match OSM type if provided for accuracy
        if (!locationData.osm_type || !info.osm_type || info.osm_type === locationData.osm_type) {
          return info.geojson;
        }
      }
    }
    
    return null;
  }

  /**
   * Create Leaflet layer from GeoJSON
   */
  createPolygonLayer(geojson, locationData) {
    return L.geoJSON(geojson, {
      style: this.defaultStyle,
      onEachFeature: (feature, layer) => {
        if (locationData.display_name) {
          layer.bindPopup(`
            <div>
              <h4>${locationData.display_name}</h4>
              ${locationData.type ? `<p><strong>Type:</strong> ${locationData.type}</p>` : ''}
              ${locationData.osm_id ? `<p><strong>OSM:</strong> ${locationData.osm_type}/${locationData.osm_id}</p>` : ''}
            </div>
          `);
        }

        layer.on({
          click: (e) => {
            this.highlightPolygon(this.getLocationId(locationData));
            L.DomEvent.stopPropagation(e);
          }
        });
      }
    });
  }

  /**
   * Load polygons for search results (original method - non-blocking)
   */
  async loadSearchResultPolygons(searchResults, highlightId = null) {
    // Prevent loading the same set of polygons multiple times
    const resultHash = this.getResultSetHash(searchResults);
    if (this.currentResultHash === resultHash) {
      console.log('Same polygon set already loaded, skipping...');
      return;
    }

    this.clearAllPolygons();
    this.currentResultHash = resultHash;

    const validResults = searchResults.filter(r => r?.osm_id);
    if (validResults.length === 0) return;

    console.log(`Loading ${validResults.length} polygons (non-blocking)`);
    
    // Load polygons without waiting
    const loadPromises = validResults.map(async (result) => {
      const shouldHighlight = highlightId && this.getLocationId(result) === highlightId;
      try {
        await this.loadPolygon(result, shouldHighlight);
      } catch (error) {
        console.warn(`Failed to load polygon for ${result.osm_id}:`, error);
      }
    });

    // Wait for all to complete before fitting bounds
    await Promise.all(loadPromises);

    // Fit map to all polygons after a short delay
    setTimeout(() => this.fitBoundsToAll(), 100);
  }

  /**
   * Generate hash for result set to detect duplicates
   */
  getResultSetHash(results) {
    if (!results || results.length === 0) return 'empty';
    
    return results
      .filter(r => r?.osm_id)
      .map(r => `${r.osm_type || 'unknown'}_${r.osm_id}`)
      .sort()
      .join('|');
  }

  /**
   * Load polygons for search results and wait for completion (NEW ASYNC VERSION)
   */
  async loadSearchResultPolygonsAsync(searchResults, highlightId = null) {
    if (this.isLoading) {
      console.log('Polygon loading already in progress, waiting...');
      // Wait for current loading to finish
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    
    try {
      this.clearAllPolygons();

      const validResults = searchResults.filter(r => r?.osm_id);
      if (validResults.length === 0) {
        console.log('No valid results with OSM IDs to load polygons for');
        return;
      }

      console.log(`Loading ${validResults.length} polygons (async/blocking)`);
      
      // Ensure polygon repository is loaded first
      await this.loadPolygonRepository();
      
      // Load all polygons and wait for completion
      const loadPromises = validResults.map(async (result) => {
        const shouldHighlight = highlightId && this.getLocationId(result) === highlightId;
        try {
          await this.loadPolygon(result, shouldHighlight);
          console.log(`Loaded polygon for ${result.osm_id || 'unknown'}`);
        } catch (error) {
          console.warn(`Failed to load polygon for ${result.osm_id}:`, error);
        }
      });

      // Wait for all polygons to load
      await Promise.all(loadPromises);
      
      console.log(`Successfully loaded ${this.polygonLayers.size} polygons`);

      // Fit map to all polygons
      if (this.polygonLayers.size > 0) {
        this.fitBoundsToAll();
      }
      
    } catch (error) {
      console.error('Error in async polygon loading:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if polygon loading is in progress
   */
  isPolygonLoading() {
    return this.isLoading;
  }

  /**
   * Wait for polygon loading to complete
   */
  async waitForPolygonLoading() {
    while (this.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Highlight specific polygon
   */
  highlightPolygon(locationId) {
    // Clear previous highlight
    this.polygonLayers.forEach((data, id) => {
      if (data.highlighted) {
        data.layer.setStyle(this.defaultStyle);
        data.highlighted = false;
      }
    });
  }

  /**
   * Remove specific polygon
   */
  removePolygon(locationId) {
    const polygonData = this.polygonLayers.get(locationId);
    if (polygonData) {
      this.polygonLayerGroup.removeLayer(polygonData.layer);
      this.polygonLayers.delete(locationId);
    }
  }

  /**
   * Clear all polygons
   */
  clearAllPolygons() {
    this.polygonLayerGroup.clearLayers();
    this.polygonLayers.clear();
    this.currentResultHash = null; // Reset hash when clearing
  }

  /**
   * Fit map bounds to all polygons
   */
  fitBoundsToAll() {
    try {
      const layers = Array.from(this.polygonLayers.values()).map(p => p.layer);
      if (layers.length === 0) return;
      
      const group = new L.featureGroup(layers);
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12 });
        console.log(`Fitted map bounds to ${layers.length} polygons`);
      }
    } catch (error) {
      console.warn('Could not fit bounds:', error);
    }
  }

  /**
   * Generate location ID
   */
  getLocationId(locationData) {
    if (locationData.osm_id) {
      return `${locationData.osm_type || 'unknown'}_${locationData.osm_id}`;
    }
    if (locationData.lat && locationData.lon) {
      return `coord_${locationData.lat}_${locationData.lon}`;
    }
    return `name_${this.hash(locationData.display_name || 'unknown')}`;
  }

  /**
   * Simple hash function
   */
  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Toggle polygon visibility
   */
  setVisible(visible) {
    if (visible) {
      if (!this.map.hasLayer(this.polygonLayerGroup)) {
        this.polygonLayerGroup.addTo(this.map);
      }
    } else {
      this.map.removeLayer(this.polygonLayerGroup);
    }
  }

  /**
   * Get polygon loading statistics
   */
  getLoadingStats() {
    return {
      isLoading: this.isLoading,
      loadedPolygons: this.polygonLayers.size,
      repositoryLoaded: !!this.polygonRepository,
      repositorySize: this.polygonRepository ? Object.keys(this.polygonRepository).length : 0
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.clearAllPolygons();
    this.map.removeLayer(this.polygonLayerGroup);
    this.polygonLayers.clear();
    this.polygonRepository = null;
    this.isLoading = false;
  }
}

export default PolygonManager;