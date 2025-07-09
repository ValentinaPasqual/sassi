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

class LEDASearch {
  constructor() {
    this.config = null;
    this.searchEngine = null;
    this.state = {
      query: '',
      filters: {},
      sort: '',
      bounds: null,
    };

    this.isLoading = false;
    this.isInitialLoad = true; // Track if this is the first load
    this.isFullyLoaded = false; // Track if app is fully initialized
    this.initialize();
  }

  async initialize() {
    try {
      this.showFullScreenLoader();
      this.showProgressLoader();
      
      // Load configuration and data
      this.config = await loadConfiguration();
      const jsonData = await parseData();
      this.config.searchConfig.per_page = jsonData.length;
      
      // Initialize search engine
      this.searchEngine = itemsjs(jsonData, this.config);
      this.state.sort = this.config.searchConfig.defaultSort;
      this.state.filters = this.createEmptyFilters();
      
      // Initialize map and components
      await this.initializeComponents();
      
      // Setup event handlers
      this.bindEvents();
      this.bindNavBarEvents();
      
      // Perform initial search and load polygons
      await this.performSearch();
      
      // Mark initial load as complete
      this.isInitialLoad = false;
      this.isFullyLoaded = true;
      
      // Everything is loaded - hide all loaders
      this.hideProgressLoader();
      this.hideFullScreenLoader();
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.showNotification('Error loading application', 'error');
      this.hideProgressLoader();
      this.hideFullScreenLoader();
    }
  }

  createEmptyFilters() {
    const filters = {};
    for (const [field] of Object.entries(this.config.aggregations)) {
      filters[field] = [];
    }
    return filters;
  }

  async initializeComponents() {
    // Initialize map
    const mapResult = initMap(this.config);
    this.map = mapResult.map;
    this.markers = mapResult.markers;
    this.renderMarkers = mapResult.renderMarkers;
    this.setFocusResultCallback = mapResult.setFocusResultCallback;

    // Initialize polygon manager - polygons will be shown after initial load
    this.polygonManager = new PolygonManager(this.map);
    await this.polygonManager.loadPolygonRepository();
    // Don't hide polygons here - let them show when loaded

    // Initialize modules
    this.facetRenderer = new FacetRenderer(this.config);
    this.rangeRenderer = new RangeRenderer();
    this.taxonomyRenderer = new TaxonomyRenderer();
    this.searchHandler = new SearchHandler(this.searchEngine, this.config);
    this.resultsRenderer = new ResultsRenderer((lat, lng, zoom) => this.focusOnMap(lat, lng, zoom));
    
    // Setup navbar
    this.navBar = navBarRenderer;
    this.navBar.setConfig(this.config);
    
    // Connect map to results
    this.connectMapToResults();
    
    // Create debounced search that handles its own loader
    this.debouncedSearch = Utilities.debounce(async () => {
      try {
        await this.performSearch();
      } finally {
        this.hideProgressLoader();
      }
    }, 300);
  }

  connectMapToResults() {
    if (this.setFocusResultCallback) {
      this.setFocusResultCallback((idOpera) => {
        const success = this.resultsRenderer.focusOnResult(idOpera);
        if (!success) {
          this.showNotification('Item not found in current results', 'warning');
        }
        return success;
      });
    }
  }

  // Full screen loader for initial load
  showFullScreenLoader() {
    if (!this.fullScreenLoader) {
      this.fullScreenLoader = document.createElement('div');
      this.fullScreenLoader.className = 'fixed inset-0 z-[9999] bg-white flex items-center justify-center';
      this.fullScreenLoader.innerHTML = `
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Loading LEDA Search</h2>
          <p class="text-gray-500">Initializing map, data, and components...</p>
        </div>
      `;
      document.body.appendChild(this.fullScreenLoader);
    }
    this.fullScreenLoader.style.display = 'flex';
  }

  hideFullScreenLoader() {
    if (this.fullScreenLoader) {
      this.fullScreenLoader.style.opacity = '0';
      this.fullScreenLoader.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => {
        if (this.fullScreenLoader) {
          this.fullScreenLoader.style.display = 'none';
        }
      }, 300);
    }
  }

  // Progress loader for actions (Alternative approach)
  showProgressLoader() {
    if (!this.progressLoader) {
      this.progressLoader = document.createElement('div');
      this.progressLoader.className = 'fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200';
      this.progressLoader.style.display = 'block';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'h-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg';
      progressBar.style.width = '0%';
      progressBar.style.transition = 'width 0.3s ease-out';
      
      this.progressLoader.appendChild(progressBar);
      document.body.appendChild(this.progressLoader);
      
      console.log('Progress loader created and added to DOM');
    }
    
    this.progressLoader.style.display = 'block';
    const progressBar = this.progressLoader.querySelector('div');
    if (progressBar) {
      // Force a reflow
      progressBar.offsetHeight;
      progressBar.style.width = '100%';
      console.log('Progress bar animation started');
    }
    this.isLoading = true;
  }

  hideProgressLoader() {
    if (this.progressLoader) {
      const progressBar = this.progressLoader.querySelector('div');
      if (progressBar) {
        progressBar.style.width = '0%';
        console.log('Progress bar animation ended');
      }
      // Hide the container after animation completes
      setTimeout(() => {
        if (this.progressLoader) {
          this.progressLoader.style.display = 'none';
        }
      }, 300);
    }
    this.isLoading = false;
  }

  // Simplified notification system
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg max-w-sm text-white transition-all duration-300 ${
      type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Main search method
  async performSearch() {
    // Don't show progress loader during initial load (full screen loader is shown)
    // Only show progress loader for user interactions after app is fully loaded
    if (!this.isInitialLoad && !this.isLoading && this.isFullyLoaded) {
      this.showProgressLoader();
    }
    
    try {
      const results = this.searchHandler.performSearch(this.state, {
        onMarkersUpdate: (items) => this.renderMarkers(items),
        onResultsUpdate: (items) => this.resultsRenderer.updateResultsList(items, this.config, {
          filters: this.state.filters,
          query: this.state.query,
          sort: this.state.sort
        }),
        onAggregationsUpdate: (aggregations) => this.renderFacets(aggregations)
      });

      this.updateNavBar(results.items?.length || 0);
      
      // Only load and show polygons when filters are active or search query exists
      const hasActiveFilters = this.hasActiveFilters();
      const hasSearchQuery = this.state.query && this.state.query.trim().length > 0;
      
      if ((hasActiveFilters || hasSearchQuery) && results.items && results.items.length <= 400) {
        await this.loadPolygons(results.items);
        this.polygonManager.setVisible(true);
        console.log('Polygons loaded and shown (filters/search active)');
      } else {
        this.polygonManager.clearAllPolygons();
        console.log('Polygons cleared (no filters/search active)');
      }
      
      console.log('Search completed:', results.items?.length || 0, 'items found');
      return results;
    } catch (error) {
      console.error('Search error:', error);
      this.showNotification('Search failed', 'error');
    } finally {
      if (!this.isInitialLoad && this.isFullyLoaded) {
        this.hideProgressLoader();
      }
    }
  }

  // Simplified polygon loading
  async loadPolygons(items) {
    const itemsWithOsmIds = items.filter(item => item?.osm_id);
    
    if (itemsWithOsmIds.length > 0) {
      try {
        await this.polygonManager.loadSearchResultPolygons(itemsWithOsmIds);
        console.log(`Loaded ${itemsWithOsmIds.length} polygons`);
      } catch (error) {
        console.error('Error loading polygons:', error);
      }
    } else {
      this.polygonManager.clearAllPolygons();
    }
  }

  // Method to toggle polygon visibility
  togglePolygonVisibility(show = true) {
    if (this.polygonManager) {
      this.polygonManager.setVisible(show);
      console.log(`Polygons ${show ? 'shown' : 'hidden'}`);
    }
  }

  // State management
  async handleStateChange(action) {
    console.log('handleStateChange called with action:', action);
    
    // Show progress loader for all filter/state changes (only if app is fully loaded)
    if (this.isFullyLoaded) {
      this.showProgressLoader();
    }
    
    try {
      switch (action.type) {
        case 'FACET_CHANGE':
          this.updateFilters(action.facetType, action.value, action.checked);
          break;
        case 'RANGE_CHANGE':
          this.state.filters[action.facetKey] = action.value;
          break;
        case 'QUERY_CHANGE':
          this.state.query = action.query;
          break;
        case 'SORT_CHANGE':
          this.state.sort = action.sort;
          break;
      }
      
      console.log('State updated, triggering search. New state:', this.state);
      
      // Force a new search by bypassing the loading check
      this.isLoading = false;
      
      const results = this.searchHandler.performSearch(this.state, {
        onMarkersUpdate: (items) => this.renderMarkers(items),
        onResultsUpdate: (items) => this.resultsRenderer.updateResultsList(items, this.config, {
          filters: this.state.filters,
          query: this.state.query,
          sort: this.state.sort
        }),
        onAggregationsUpdate: (aggregations) => this.renderFacets(aggregations)
      });

      this.updateNavBar(results.items?.length || 0);
      
      // Only load and show polygons when filters are active or search query exists
      const hasActiveFilters = this.hasActiveFilters();
      const hasSearchQuery = this.state.query && this.state.query.trim().length > 0;
      
      if ((hasActiveFilters || hasSearchQuery) && results.items && results.items.length <= 400) {
        await this.loadPolygons(results.items);
        this.polygonManager.setVisible(true);
        console.log('Polygons loaded and shown (filters/search active)');
      } else {
        this.polygonManager.clearAllPolygons();
        console.log('Polygons cleared (no filters/search active)');
      }
      
      console.log('Filter search completed:', results.items?.length || 0, 'items found');
      
    } catch (error) {
      console.error('Error in handleStateChange:', error);
    } finally {
      if (this.isFullyLoaded) {
        this.hideProgressLoader();
      }
    }
  }

  // Check if any filters are currently active
  hasActiveFilters() {
    if (!this.state.filters) return false;
    
    for (const [key, values] of Object.entries(this.state.filters)) {
      if (Array.isArray(values) && values.length > 0) {
        return true;
      }
      if (!Array.isArray(values) && values) {
        return true;
      }
    }
    return false;
  }

  updateFilters(facetType, value, checked) {
    console.log(`Updating filter: ${facetType}, value: ${value}, checked: ${checked}`);
    
    if (checked) {
      if (!this.state.filters[facetType]) {
        this.state.filters[facetType] = [];
      }
      this.state.filters[facetType].push(value);
    } else {
      this.state.filters[facetType] = 
        this.state.filters[facetType]?.filter(v => v !== value) || [];
    }
    
    console.log('Updated filters:', this.state.filters);
  }

  // Event binding
  bindEvents() {
    this.setupSearchInput();
    this.setupSortSelect();
    this.setupMapEvents();
  }

  bindNavBarEvents() {
    this.navBar.addEventListener('clearAllFilters', () => this.clearAllFilters());
    this.navBar.addEventListener('removeFilter', (event) => {
      const { facetKey, value } = event.detail;
      this.removeFilter(facetKey, value);
    });
    this.navBar.addEventListener('clearSearchQuery', () => this.clearSearchQuery());
  }

  setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.state.query = searchInput.value;
        if (this.isFullyLoaded) {
          this.showProgressLoader();
        }
        this.debouncedSearch();
      });
    }
  }

  setupSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && this.config.searchConfig.sortOptions) {
      sortSelect.innerHTML = this.config.searchConfig.sortOptions
        .map(option => `<option value="${option.value}">${option.label}</option>`)
        .join('');
      
      sortSelect.addEventListener('change', (e) => {
        this.state.sort = e.target.value;
        if (this.isFullyLoaded) {
          this.showProgressLoader();
        }
        this.performSearch().finally(() => {
          if (this.isFullyLoaded) {
            this.hideProgressLoader();
          }
        });
      });
    }
  }

  setupMapEvents() {
    // Debounced map move handler
    const debouncedMapMove = Utilities.debounce(async () => {
      if (this.isFullyLoaded) {
        this.showProgressLoader();
      }
      try {
        await this.performSearch();
      } finally {
        if (this.isFullyLoaded) {
          this.hideProgressLoader();
        }
      }
    }, 500);
    
    this.map.on('moveend', debouncedMapMove);
    
    // Marker click handler
    this.map.on('marker:click', async (event) => {
      const markerData = event.detail || event.data;
      if (markerData?.osm_id) {
        if (this.isFullyLoaded) {
          this.showProgressLoader();
        }
        try {
          await this.polygonManager.onMarkerClick(markerData);
        } finally {
          if (this.isFullyLoaded) {
            this.hideProgressLoader();
          }
        }
      }
    });
  }

  // Utility methods
  focusOnMap(lat, lng, zoom = 15) {
    if (this.map) {
      this.map.setView([parseFloat(lat), parseFloat(lng)], zoom);
    }
  }

  renderFacets(aggregations) {
    this.facetRenderer.renderFacets(aggregations, this.state, (action) => this.handleStateChange(action));
  }

  updateNavBar(resultsCount = 0, options = {}) {
    this.navBar.updateFromSearchState(this.state, resultsCount, options);
  }

  // Filter management
  clearAllFilters() {
    this.state.query = '';
    this.state.filters = this.createEmptyFilters();
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    if (this.isFullyLoaded) {
      this.showProgressLoader();
    }
    this.performSearch().finally(() => {
      if (this.isFullyLoaded) {
        this.hideProgressLoader();
      }
    });
  }

  removeFilter(facetKey, value) {
    if (!this.state.filters[facetKey]) return;
    
    if (value) {
      this.state.filters[facetKey] = this.state.filters[facetKey].filter(v => v !== value);
    } else {
      this.state.filters[facetKey] = [];
    }
    
    if (this.isFullyLoaded) {
      this.showProgressLoader();
    }
    this.performSearch().finally(() => {
      if (this.isFullyLoaded) {
        this.hideProgressLoader();
      }
    });
  }

  clearSearchQuery() {
    this.state.query = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    if (this.isFullyLoaded) {
      this.showProgressLoader();
    }
    this.performSearch().finally(() => {
      if (this.isFullyLoaded) {
        this.hideProgressLoader();
      }
    });
  }

  // Public API methods
  getPolygonManager() {
    return this.polygonManager;
  }

  // Show/hide polygons (public method for UI controls)
  showPolygons() {
    this.togglePolygonVisibility(true);
  }

  hidePolygons() {
    this.togglePolygonVisibility(false);
  }

  getLoadingStatus() {
    return {
      isLoading: this.isLoading,
      isFullyLoaded: this.isFullyLoaded,
      searchEngineReady: !!this.searchEngine,
      mapReady: !!this.map,
      configLoaded: !!this.config
    };
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.ledaSearch = new LEDASearch();
});