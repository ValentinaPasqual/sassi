import './style.css';
import itemsjs from 'itemsjs';
import { parseData } from './utils/dataParser.js';
import { loadConfiguration } from './utils/configLoader.js';
import { initMap } from './utils/initMap.js';
import { navBarRenderer } from './utils/navBarRenderer.js';
import { PolygonManager } from './utils/polygonManager.js';

// Import the modules for facets Handling
import { FacetRenderer } from './utils/facetRenderer.js';
import { RangeRenderer } from './utils/rangeRenderer.js';
import { TaxonomyRenderer } from './utils/taxonomyRenderer.js';
import { SearchHandler } from './utils/searchHandler.js';
import { ResultsRenderer } from './utils/resultsRenderer.js';
import { Utilities } from './utils/facetsUtilities.js';

const base = import.meta.env.BASE_URL;

class LEDASearch {
  constructor() {

    this.loadConfiguration = loadConfiguration.bind(this);
    
    this.config = null;
    this.searchEngine = null;
    
    this.state = {
      query: '',
      filters: {},
      sort: '', // Default sort until config is loaded
      bounds: null,
    };

    this.lastLoadedPolygonIds = new Set();

    // Initialize map loading state (only on page load)
    this.initializeMapLoader();

    // Initialize the loader system (purple bar)
    this.initializeLoaderSystem();

    // Initialize the navigation bar and bind navigation bar event handlers
    this.navBar = navBarRenderer;
    this.initialize();
  }

  async initialize() {
    try {
      this.showFilterLoader();
      
      this.config = await this.loadConfiguration();
      
      const jsonData = await parseData();

      this.config.searchConfig.per_page = jsonData.length;
  
      // Initialize itemsjs with the parsed JSON data
      this.searchEngine = itemsjs(jsonData, this.config);
  
      console.log('Search engine initialized with data:', jsonData.length, 'items');
      
      // Update sort after config is loaded
      this.state.sort = this.config.searchConfig.defaultSort;

      // Create the filters from the aggregations in the config
      const filters = {}
      for (const [field, aggregation] of Object.entries(this.config.aggregations)) {
        filters[field] = [];
      }
      this.state.filters = filters
      
      // initialise and imports the map 
      const mapResult = initMap(this.config);
      this.map = mapResult.map;
      this.markers = mapResult.markers;
      this.renderMarkers = mapResult.renderMarkers;

      // Initialize polygon manager
      this.polygonManager = new PolygonManager(this.map);

      // Initialize the modules
      this.facetRenderer = new FacetRenderer(this.config);
      this.rangeRenderer = new RangeRenderer();
      this.taxonomyRenderer = new TaxonomyRenderer();
      this.searchHandler = new SearchHandler(this.searchEngine, this.config);
      this.resultsRenderer = new ResultsRenderer((lat, lng, zoom) => this.focusOnMap(lat, lng, zoom));
      
      // Set up navbar with configuration
      this.navBar.setConfig(this.config);
      
      // Bind methods
      this.debouncedSearch = Utilities.debounce(this.performSearch.bind(this), 300);

      console.log('PolygonManager initialized:', this.polygonManager);

      this.bindEvents();
      this.bindNavBarEvents();
      await this.fetchAggregations();
      await this.performSearch();

      // Show map when everything is ready on page load
      this.showMap();
      
      // Hide loader after everything is ready
      setTimeout(() => {
        this.hideFilterLoader();
      }, 500);
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.hideFilterLoader();
    }
  }


/**
 * Initialize map loading state - makes map hidden/opaque until loaded
 */
initializeMapLoader() {
  // Find the map container (adjust selector based on your HTML structure)
  this.mapContainer = document.getElementById('map') || document.querySelector('.map-container') || document.querySelector('#map-container');
  
  if (this.mapContainer) {
    // Add loading styles to make map opaque/hidden
    this.mapContainer.style.opacity = '0.2'; // Even more opaque
    this.mapContainer.style.pointerEvents = 'none';
    this.mapContainer.style.transition = 'opacity 0.8s ease-in-out';
    
    // Optional: Add a loading overlay directly on the map
    const mapOverlay = document.createElement('div');
    mapOverlay.id = 'map-loading-overlay';
    mapOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(3px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #666;
      transition: opacity 0.8s ease-in-out;
    `;
    mapOverlay.innerHTML = 'Loading map and data...';
    
    this.mapContainer.style.position = 'relative';
    this.mapContainer.appendChild(mapOverlay);
    this.mapOverlay = mapOverlay;
  }
  
  // Track loading state
  this.isFullyLoaded = false;
}

/**
 * Show map when everything is loaded - with extended timing
 */
showMap() {
  // Mark as fully loaded
  this.isFullyLoaded = true;
  
  // Add extra delay to ensure everything is actually ready
  setTimeout(() => {
    if (this.mapContainer) {
      this.mapContainer.style.opacity = '1';
      this.mapContainer.style.pointerEvents = 'auto';
    }
    
    if (this.mapOverlay) {
      this.mapOverlay.style.opacity = '0';
      setTimeout(() => {
        if (this.mapOverlay && this.mapOverlay.parentNode) {
          this.mapOverlay.parentNode.removeChild(this.mapOverlay);
        }
      }, 800);
    }
  }, 1500); // Wait 1.5 seconds after "loading complete" before showing map
}

/**
 * Alternative: Show map only after first search completes
 */
showMapAfterFirstSearch() {
  if (!this.isFullyLoaded) return; // Don't show until initialization is complete
  
  if (this.mapContainer) {
    this.mapContainer.style.opacity = '1';
    this.mapContainer.style.pointerEvents = 'auto';
  }
  
  if (this.mapOverlay) {
    this.mapOverlay.style.opacity = '0';
    setTimeout(() => {
      if (this.mapOverlay && this.mapOverlay.parentNode) {
        this.mapOverlay.parentNode.removeChild(this.mapOverlay);
      }
    }, 800);
  }
}

  /**
   * Initialize the loader system with only the purple bar
   */
  initializeLoaderSystem() {
    // Create filter loader (purple bar)
    this.createFilterLoader();
  }

  /**
   * Create filter loader overlay (purple bar)
   */
  createFilterLoader() {
    this.filterLoader = document.createElement('div');
    this.filterLoader.id = 'filter-loader';
    this.filterLoader.className = `
      fixed top-0 left-0 right-0 z-40 
      bg-gradient-to-r from-blue-500 to-purple-500 
      h-1 transform scale-x-0 origin-left
      transition-transform duration-300 ease-out
      shadow-lg
    `;
    document.body.appendChild(this.filterLoader);
  }

  /**
   * Show filter loader (progress bar at top)
   */
  showFilterLoader() {
    if (this.filterLoader) {
      this.filterLoader.style.transform = 'scaleX(1)';
    }
  }

  /**
   * Hide filter loader
   */
  hideFilterLoader() {
    if (this.filterLoader) {
      setTimeout(() => {
        if (this.filterLoader) {
          this.filterLoader.style.transform = 'scaleX(0)';
        }
      }, 150);
    }
  }

  /**
   * Bind navigation bar events
   */
  bindNavBarEvents() {
    // Listen for clear all filters event from navbar
    this.navBar.addEventListener('clearAllFilters', () => {
      this.showFilterLoader();
      this.clearAllFilters();
    });

    // Listen for remove specific filter event from navbar
    this.navBar.addEventListener('removeFilter', (event) => {
      const { facetKey, value } = event.detail;
      this.showFilterLoader();
      this.removeSpecificFilter(facetKey, value);
    });

    // Listen for clear search query event from navbar
    this.navBar.addEventListener('clearSearchQuery', () => {
      this.showFilterLoader();
      this.clearSearchQuery();
    });
  }

  /**
   * Clear all filters and search query
   */
  clearAllFilters() {
    // Reset state
    this.state.query = '';
    this.state.filters = {};
    
    // Recreate empty filters structure
    for (const [field, aggregation] of Object.entries(this.config.aggregations)) {
      this.state.filters[field] = [];
    }

    // Update search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    // Trigger search with loader
    this.performSearchWithLoader().finally(() => {
      this.hideFilterLoader();
    });
  }

  /**
   * Remove a specific filter
   * @param {string} facetKey - The facet key
   * @param {string} value - The value to remove
   */
  removeSpecificFilter(facetKey, value) {
    if (!this.state.filters[facetKey]) return;

    if (value) {
      // Remove specific value from array
      this.state.filters[facetKey] = this.state.filters[facetKey].filter(v => v !== value);
    } else {
      // Clear entire facet (for range filters)
      this.state.filters[facetKey] = [];
    }

    // Trigger search with loader
    this.performSearchWithLoader().finally(() => {
      this.hideFilterLoader();
    });
  }

  /**
   * Clear search query only
   */
  clearSearchQuery() {
    this.state.query = '';
    
    // Update search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    // Trigger search with loader
    this.performSearchWithLoader().finally(() => {
      this.hideFilterLoader();
    });
  }

  // Your main methods that orchestrate the modules
  renderFacets(aggregations) {
    this.facetRenderer.renderFacets(
      aggregations, 
      this.state, 
      (action) => this.handleStateChange(action)
    );
  }

  /**
   * Update navbar with current search state and results
   * @param {number} resultsCount - Number of search results
   */
  updateNavBar(resultsCount = 0, options = {}) {
    this.navBar.updateFromSearchState(this.state, resultsCount, options);
  }

  /**
   * Perform search with loader wrapper
   */
  async performSearchWithLoader() {
    return new Promise((resolve) => {
      const results = this.performSearch();
      // Simulate minimum loading time for UX
      setTimeout(() => {
        resolve(results);
      }, 300);
    });
  }

  performSearch() {
    const results = this.searchHandler.performSearch(this.state, {
      // Updates the map markers
      onMarkersUpdate: (items) => this.renderMarkers(items),
      // Update the results section - now includes filters and query
      onResultsUpdate: (items) => this.resultsRenderer.updateResultsList(
        items, 
        this.config, 
        {
          filters: this.state.filters,
          query: this.state.query,
          sort: this.state.sort
        }
      ),
      // Updates facets
      onAggregationsUpdate: (aggregations) => this.renderFacets(aggregations)
    });

    // Update navbar with current state and results count
    this.updateNavBar(results.items ? results.items.length : 0);

    // Automatically load polygons for search results in the background
    if (results.items && results.items.length <= 400) { // Adjust limit as needed
      this.loadPolygonsForSearchResults();
    } else {
      console.log(`Too many results (${results.items.length}) - skipping polygon loading`);
      this.polygonManager.clearAllPolygons(); // Clear existing polygons
    }
      
    console.log('Search completed:', results.items ? results.items.length : 0, 'items');
    return results;
  }

  handleStateChange(action) {
    // Show purple bar loader for all actions
    this.showFilterLoader();
    
    switch (action.type) {
      case 'FACET_CHANGE':
        this.updateFilters(action.facetType, action.value, action.checked);
        break;
      case 'RANGE_CHANGE':
        this.state.filters[action.facetKey] = action.value;
        this.performSearchWithLoader().finally(() => {
          this.hideFilterLoader();
        });
        this.fetchAggregations();
        return; // Early return to avoid duplicate search
      case 'QUERY_CHANGE':
        this.state.query = action.query;
        break;
      case 'SORT_CHANGE':
        this.state.sort = action.sort;
        break;
    }
    
    // For non-range changes, trigger search
    if (action.type !== 'RANGE_CHANGE') {
      this.performSearchWithLoader().finally(() => {
        this.hideFilterLoader();
      });
    }
  }

  updateFilters(facetType, value, checked) {
    if (checked) {
      if (!this.state.filters[facetType]) {
        this.state.filters[facetType] = [];
      }
      this.state.filters[facetType].push(value);
    } else {
      this.state.filters[facetType] = 
        this.state.filters[facetType]?.filter(v => v !== value) || [];
    }
  }

  focusOnMap(lat, lng, zoom = 15) {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }
    
    try {
      // This is a Leaflet map, so we use setView
      this.map.setView([parseFloat(lat), parseFloat(lng)], zoom);
      console.log(`Map focused on coordinates: ${lat}, ${lng} with zoom level: ${zoom}`);
    } catch (error) {
      console.error('Error focusing map on coordinates:', error);
      
      // Debug information
      console.log('Map object:', this.map);
      console.log('Available methods:', Object.getOwnPropertyNames(this.map).filter(prop => typeof this.map[prop] === 'function'));
    }
  }

  bindEvents() {
    this.setupSearchInput();
    this.setupSortSelect();
    this.setupMarkerEvents();
    
    // Add debouncing for map movement to prevent excessive polygon reloading
    let mapMoveTimeout;
    this.map.on('moveend', () => {
      if (mapMoveTimeout) {
        clearTimeout(mapMoveTimeout);
      }
      mapMoveTimeout = setTimeout(() => {
        // Show purple bar for map moves
        this.showFilterLoader();
        
        const results = this.searchHandler.performSearch(this.state, {
          onMarkersUpdate: (items) => this.renderMarkers(items),
          // Updated to include filter state in map move as well
          onResultsUpdate: (items) => this.resultsRenderer.updateResultsList(
            items, 
            this.config,
            {
              filters: this.state.filters,
              query: this.state.query,
              sort: this.state.sort
            }
          ),
          onAggregationsUpdate: (aggregations) => this.renderFacets(aggregations)
        });
        
        this.updateNavBar(results.items ? results.items.length : 0, { skipAnimation: true });
        console.log('Map move search completed:', results.items ? results.items.length : 0, 'items');
        
        // Hide loader after a brief delay
        setTimeout(() => {
          this.hideFilterLoader();
        }, 500);
      }, 200); // 200ms debounce for map moves
    });
  }

  /**
   * Setup marker click events to load polygons
   */
  setupMarkerEvents() {
    // Listen for marker click events and load corresponding polygons
    this.map.on('marker:click', (event) => {
      const markerData = event.detail || event.data;
      if (markerData && markerData.osm_id) {
        console.log('Marker clicked, loading polygon for OSM ID:', markerData.osm_id);
        this.showFilterLoader();
        this.polygonManager.onMarkerClick(markerData);
        
        // Hide loader after a delay
        setTimeout(() => {
          this.hideFilterLoader();
        }, 1000);
      } else {
        console.log('Marker clicked but no OSM ID found - skipping polygon load');
      }
    });
  }

  setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) {
      console.error('Search input element not found');
      return;
    }

    const debouncedSearch = this.debounce(() => {
      this.showFilterLoader();
      this.state.query = searchInput.value;
      this.performSearchWithLoader().finally(() => {
        this.hideFilterLoader();
      });
    }, this.config.searchConfig.debounceTime || 300);

    searchInput.addEventListener('input', debouncedSearch);
  }

  setupSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect || !this.config.searchConfig.sortOptions) {
      console.error('Sort select element not found or sort options not configured');
      return;
    }

    sortSelect.innerHTML = this.config.searchConfig.sortOptions
      .map(option => `<option value="${option.value}">${option.label}</option>`)
      .join('');

    sortSelect.addEventListener('change', (e) => {
      this.showFilterLoader();
      this.state.sort = e.target.value;
      this.performSearchWithLoader().finally(() => {
        this.hideFilterLoader();
      });
    });
  }

  async fetchAggregations() {
    if (!this.searchEngine) {
      console.error('Search engine not initialized');
      return;
    }

    // Pass the current filters and query to get updated aggregations
    const results = this.searchEngine.search({
      query: this.state.query || '',
      filters: this.state.filters
    });

    const aggregations = {};
    for (const key in results.data.aggregations) {
      if (results.data.aggregations.hasOwnProperty(key)) {
        aggregations[key] = results.data.aggregations[key].buckets;
      }
    }
    this.renderFacets(aggregations);
  }

  debounce(func, delay) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, arguments), delay);
    };
  }

  /**
   * Clear all polygons from the map
  */
  clearPolygons() {
    if (this.polygonManager) {
      this.polygonManager.clearAllPolygons();
    }
  }

  /**
   * Toggle polygon visibility
   * @param {boolean} visible - Whether polygons should be visible
   */
  togglePolygons(visible) {
    if (this.polygonManager) {
      this.polygonManager.setPolygonVisibility(visible);
    }
  }

  /**
   * Load polygon for a specific item by OSM ID
   * @param {Object} item - Item data with osm_id
   * @param {boolean} highlight - Whether to highlight the polygon
   * @param {boolean} fitBounds - Whether to fit map bounds to polygon
   */
  loadPolygonForItem(item, highlight = true, fitBounds = true) {
    if (!item || !item.osm_id) {
      console.log('Item has no OSM ID - cannot load polygon:', item);
      return false;
    }

    if (this.polygonManager) {
      this.showFilterLoader();
      this.polygonManager.loadPolygon(item, highlight, fitBounds);
      
      // Hide loader after a delay
      setTimeout(() => {
        this.hideFilterLoader();
      }, 1000);
      
      return true;
    }
    return false;
  }

  /**
   * Manually trigger polygon loading for current search results
   */
  loadPolygonsForSearchResults() {
    if (!this.searchEngine) {
      console.error('Search engine not initialized');
      return;
    }

    // Get current search results
    const results = this.searchEngine.search({
      query: this.state.query || '',
      filters: this.state.filters
    });

    if (results && results.data && results.data.items) {
      const itemsWithOsmIds = results.data.items.filter(item => 
        item && 
        item.osm_id && 
        (typeof item.osm_id === 'string' || typeof item.osm_id === 'number')
      );
      
      if (itemsWithOsmIds.length > 0) {
        console.log(`Loading polygons for ${itemsWithOsmIds.length} items with OSM IDs`);
        
        // Use a debounced version to prevent rapid successive calls
        if (this.polygonLoadTimeout) {
          clearTimeout(this.polygonLoadTimeout);
        }
        
        this.polygonLoadTimeout = setTimeout(() => {
          this.polygonManager.loadSearchResultPolygons(itemsWithOsmIds);
          this.polygonLoadTimeout = null;
        }, 100); // 100ms delay to debounce
        
      } else {
        console.log('No search results with OSM IDs found');
        this.polygonManager.clearAllPolygons(); // Clear when no valid OSM IDs
      }
    }
  }

  /**
   * Get polygon manager instance (for external access)
   */
  getPolygonManager() {
    return this.polygonManager;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new LEDASearch();
});