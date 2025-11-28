// src/map_components/core/SearchCoordinator.js

import { Utilities } from '../facets/facetsUtilities.js';

export class SearchCoordinator {
  constructor(searchHandler, config) {
    this.searchHandler = searchHandler;
    this.config = config;
    this.isLoading = false;
    
    // Create debounced search
    this.debouncedSearch = Utilities.debounce(async (state, callbacks) => {
      await this.performSearch(state, callbacks);
    }, 300);
  }

  async performSearch(state, callbacks) {
    try {      
      const results = this.searchHandler.performSearch(state, {
        onMarkersUpdate: callbacks.onMarkersUpdate,
        onResultsUpdate: callbacks.onResultsUpdate,
        onAggregationsUpdate: callbacks.onAggregationsUpdate
      });

      // Calculate unique pivot_ID count
      const uniqueResultsCount = this.calculateUniqueResultsCount(results.items);
      
      if (callbacks.onNavBarUpdate) {
        callbacks.onNavBarUpdate(results.items || []);
      }
      
      // Calculate bounds for map focus if we have items with coordinates
      const itemsCount = results.items?.length || 0;
      
      if (itemsCount > 0 && callbacks.onBoundsCalculated) {
        
        const bounds = this.calculateBounds(results.items);
        
        if (bounds) {
          callbacks.onBoundsCalculated(bounds);
        } 
      }
      return results;
    } catch (error) {
      console.error('❌ Search error:', error);
      if (callbacks.onError) {
        callbacks.onError('Search failed', 'error');
      }
    }
  }

  calculateBounds(items) {
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items to calculate bounds');
      return null;
    }
    
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    let hasValidCoordinates = false;
    let coordsFoundCount = 0;
    
    items.forEach((item, index) => {
      let lat, lng;
      
      // First, try to get from lat_long field (format: "lat,lng")
      if (item.lat_long) {
        const parts = item.lat_long.split(',');
        if (parts.length === 2) {
          lat = parseFloat(parts[0].trim());
          lng = parseFloat(parts[1].trim());
        }
      }
      
      // Fallback to individual lat/lng fields if lat_long not found
      if (!lat || !lng) {
        lat = item.lat || 
              item.latitude || 
              item._source?.lat || 
              item._source?.latitude ||
              item.source?.lat ||
              item.source?.latitude;
               
        lng = item.lng || 
              item.lon ||
              item.longitude || 
              item._source?.lng || 
              item._source?.lon ||
              item._source?.longitude ||
              item.source?.lng ||
              item.source?.lon ||
              item.source?.longitude;
      }
      
      if (lat !== undefined && lng !== undefined && 
          lat !== null && lng !== null &&
          !isNaN(lat) && !isNaN(lng)) {
        
        // Validate coordinates are within valid ranges
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          hasValidCoordinates = true;
          coordsFoundCount++;
        }
      }
    });
    
    // Check if any valid coordinates were found
    if (!hasValidCoordinates) {
      console.warn('⚠️ No valid coordinates found for bounds calculation. Skipping map focus.');
      return null;
    }
    
    // Add some padding (about 10% on each side)
    const latPadding = (maxLat - minLat) * 0.1 || 0.1; // Fallback if same point
    const lngPadding = (maxLng - minLng) * 0.1 || 0.1;
    
    const bounds = {
      southwest: [minLat - latPadding, minLng - lngPadding],
      northeast: [maxLat + latPadding, maxLng + lngPadding],
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      }
    };
    return bounds;
  }

  calculateUniqueResultsCount(items) {
    if (!items || !Array.isArray(items)) {
      return 0;
    }
    
    const uniqueResultsIds = new Set();
    
    items.forEach(item => {
      // Check different possible locations for pivot_ID
      const pivotId = item.pivot_ID || 
                    item.pivotID || 
                    item.pivot_id || 
                    item._source?.pivot_ID || 
                    item._source?.pivotID || 
                    item._source?.pivot_id ||
                    item.source?.pivot_ID ||
                    item.source?.pivotID ||
                    item.source?.pivot_id;
      
      if (pivotId !== undefined && pivotId !== null && pivotId !== '') {
        uniqueResultsIds.add(pivotId);
      }
    });
    
    return uniqueResultsIds.size;
  }

  getLoadingStatus() {
    return {
      isLoading: this.isLoading
    };
  }
}