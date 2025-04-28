import './style.css';
import itemsjs from 'itemsjs';
import { parseData } from './utils/dataParser.js';
import { loadConfiguration } from './utils/configLoader.js';
import { initMap } from './utils/initMap.js';

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

    // Get loader element
    this.loaderElement = document.getElementById('loader-container');
    this.initialize();
  }

   // Hide loader
  hideLoader() {
    if (this.loaderElement) {
      this.loaderElement.classList.add('loader-hidden');
    }
  }

  async initialize() {
    try {
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

      this.bindEvents();
      await this.fetchAggregations();
      await this.performSearch();
      this.hideLoader();
    } catch (error) {
      console.error('Initialization error:', error);
      this.hideLoader();
    }
  }

  bindEvents() {
    this.setupSearchInput();
    this.setupSortSelect();
    this.map.on('moveend', () => this.performSearch());
  }

  setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) {
      console.error('Search input element not found');
      return;
    }

    const debouncedSearch = this.debounce(() => {
      this.state.query = searchInput.value;
      this.performSearch();
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
      this.state.sort = e.target.value;
      this.performSearch();
    });
  }

  async fetchAggregations() {
    if (!this.searchEngine) {
      console.error('Search engine not initialized');
      return;
    }

    // Now we pass the current filters and query to get updated aggregations
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

  renderFacets(aggregations) {
    if (!aggregations || !this.config.aggregations) {
        console.error('No aggregations data or configuration available.');
        return;
    }
    
    const facetsContainer = document.getElementById('facets-container');
    
    // Store current checked state before clearing
    const checkedState = {};
    Object.keys(this.config.aggregations).forEach(facetKey => {
      const facetElement = document.getElementById(`${facetKey}-facet`);
      if (facetElement) {
        checkedState[facetKey] = Array.from(facetElement.querySelectorAll('input:checked')).map(input => input.value);
      }
    });

    // Clear existing facets
    facetsContainer.innerHTML = '';

    // Create facets for each configured aggregation
    Object.entries(this.config.aggregations).forEach(([facetKey, facetConfig]) => {
        // Create facet group container
        const facetGroup = document.createElement('div');
        facetGroup.className = 'facet-group mb-4 p-4 bg-white rounded-lg shadow';
        facetGroup.id = `${facetKey}-facet`;

        // Create title
        const title = document.createElement('h3');
        title.className = 'text-lg font-semibold mb-2';
        title.textContent = facetConfig.title || facetKey;
        facetGroup.appendChild(title);

// In the renderFacets method, replace the slider creation code with this:
if (facetConfig.type === 'range') {
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'facet-slider my-4';

  const valueBuckets = aggregations[facetKey] || [];
  // Store the full bucket information for the bar chart
  const buckets = valueBuckets
    .map(bucket => {
      const value = parseInt(bucket.key, 10);
      return isNaN(value) ? null : {
        value: value,
        count: bucket.doc_count || 0
      };
    })
    .filter(bucket => bucket !== null);
  
  // Extract just the values for min/max calculations
  const values = buckets.map(bucket => bucket.value);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Create the chart and slider structure
  sliderContainer.innerHTML = `
    <label class="sr-only">Value range</label>
    <div class="relative">
      <div id="${facetKey}-chart" class="w-full h-24 mb-2"></div>
    </div>
    <div id="${facetKey}-slider" class="mt-2"></div>
    <div class="mt-5">
      <div class="text-sm font-medium mb-2">Custom range:</div>
      <div class="flex space-x-4">
        <div class="flex-1">
          <input id="${facetKey}-min-input" type="number"
                 class="py-2 px-3 block w-full border rounded-md text-sm focus:ring focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-gray-300"
                 value="${minValue}">
        </div>
        <div class="flex-1">
          <input id="${facetKey}-max-input" type="number"
                 class="py-2 px-3 block w-full border rounded-md text-sm focus:ring focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-gray-300"
                 value="${maxValue}">
        </div>
      </div>
    </div>
  `;

  facetGroup.appendChild(sliderContainer);

  // Access elements using querySelector within sliderContainer
  const chartElement = sliderContainer.querySelector(`#${facetKey}-chart`);
  const slider = sliderContainer.querySelector(`#${facetKey}-slider`);
  const minInput = sliderContainer.querySelector(`#${facetKey}-min-input`);
  const maxInput = sliderContainer.querySelector(`#${facetKey}-max-input`);
  
  // Render the bar chart
  this.renderBarChart(chartElement, buckets, minValue, maxValue);

  // Get current filter values or use min/max values
  const currentFilter = this.state.filters[facetKey];
  let startValue, endValue;

  if (!currentFilter || currentFilter.length === 0) {
      startValue = minValue;
      endValue = maxValue;
  } else {
      startValue = currentFilter[0];
      endValue = currentFilter[1];
  }

  // Initialize noUiSlider
  noUiSlider.create(slider, {
      start: [startValue, endValue],
      connect: true,
      step: 1, // Integer steps
      range: {
          'min': minValue,
          'max': maxValue
      },
      format: {
          to: (value) => Math.round(value),
          from: (value) => parseInt(value, 10)
      }
  });

  // Update inputs when slider changes
  slider.noUiSlider.on('update', (values) => {
      minInput.value = Math.round(Number(values[0]));
      maxInput.value = Math.round(Number(values[1]));
  });

  // Handle slider changes
  slider.noUiSlider.on('change', (values) => {
      const [start, end] = values.map(val => Math.round(Number(val)));

      if (!isNaN(start) && !isNaN(end)) {
          this.state.filters[facetKey] = [start, end];
          this.performSearch();
          this.fetchAggregations();
          
          // Update the highlighted range in the chart
          this.updateChartHighlight(chartElement, buckets, start, end);
      }
  });

  // Handle input changes
  const handleInputChange = this.debounce((evt) => {
      const isMin = evt.target === minInput;
      const inputValue = parseInt(evt.target.value, 10);
      const [currentMin, currentMax] = slider.noUiSlider.get().map(Number);

      if (!isNaN(inputValue)) {
          slider.noUiSlider.set([
              isMin ? inputValue : currentMin,
              isMin ? currentMax : inputValue
          ]);
      }
  }, 200);

  minInput.addEventListener('input', handleInputChange);
  maxInput.addEventListener('input', handleInputChange);

  // Initial chart highlight based on current range
  this.updateChartHighlight(chartElement, buckets, startValue, endValue);
}

      else if (facetConfig.type === 'taxonomy') {
        const taxonomyContainer = document.createElement('div');
        taxonomyContainer.className = 'taxonomy-container';
      
        // Build hierarchical structure
        const hierarchy = {};
        const facetData = aggregations[facetKey] || [];
        
        // First pass: create the hierarchy
        facetData.forEach(bucket => {
          const parts = bucket.key.split(' > ');
          let currentLevel = hierarchy;
          
          parts.forEach((part, index) => {
            if (!currentLevel[part]) {
              currentLevel[part] = {
                children: {},
                docCount: 0,
                selfCount: 0
              };
            }
            if (index === parts.length - 1) {
              currentLevel[part].selfCount = bucket.doc_count;
            }
            currentLevel = currentLevel[part].children;
          });
        });
      
        // Second pass: calculate parent counts by summing children
        function calculateTotalCounts(node) {
          let totalCount = node.selfCount || 0;
          
          Object.values(node.children).forEach(child => {
            totalCount += calculateTotalCounts(child);
          });
          
          node.docCount = totalCount;
          return totalCount;
        }
      
        // Calculate counts for all root nodes
        Object.values(hierarchy).forEach(node => {
          calculateTotalCounts(node);
        });
      
        // Rest of the rendering code remains the same
        function createTaxonomyHTML(node, path = [], level = 0) {
          let html = '<ul class="taxonomy-list" style="margin-left: ' + (level * 20) + 'px;">';
          
          Object.entries(node).forEach(([key, value]) => {
            if (key === 'children' || key === 'docCount' || key === 'selfCount') return;
            
            const currentPath = [...path, key];
            const fullPath = currentPath.join(' > ');
            const hasChildren = Object.keys(value.children).length > 0;
            
            html += `
              <li class="taxonomy-item">
                <div class="taxonomy-row">
                  ${hasChildren ? 
                    `<span class="toggle-btn" data-path="${fullPath}">▶</span>` : 
                    '<span class="toggle-placeholder"></span>'}
                  <label>
                    <input type="checkbox" 
                           value="${fullPath}" 
                           data-facet-type="${facetKey}"
                           ${checkedState[facetKey]?.includes(fullPath) ? 'checked' : ''}>
                    <span>${key} (${value.docCount})</span>
                  </label>
                </div>
                ${hasChildren ? 
                  `<div class="children" data-parent="${fullPath}" style="display: none;">
                    ${createTaxonomyHTML(value.children, currentPath, level + 1)}
                  </div>` : 
                  ''}
              </li>
            `;
          });
          
          return html + '</ul>';
        }

        // Add CSS styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          .taxonomy-list {
            list-style: none;
            padding: 0;
          }
          .taxonomy-item {
            margin: 5px 0;
          }
          .taxonomy-row {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .toggle-btn {
            cursor: pointer;
            width: 20px;
            user-select: none;
          }
          .toggle-placeholder {
            width: 20px;
          }
          .children {
            margin-left: 20px;
          }
        `;
        document.head.appendChild(styleElement);

        // Set HTML content
        taxonomyContainer.innerHTML = createTaxonomyHTML(hierarchy);

        // Add event listeners for toggle buttons
        taxonomyContainer.addEventListener('click', (e) => {
          if (e.target.classList.contains('toggle-btn')) {
            const path = e.target.dataset.path;
            const childrenContainer = taxonomyContainer.querySelector(`[data-parent="${path}"]`);
            if (childrenContainer) {
              const isHidden = childrenContainer.style.display === 'none';
              childrenContainer.style.display = isHidden ? 'block' : 'none';
              e.target.textContent = isHidden ? '▼' : '▶';
            }
          }
        });

        facetGroup.appendChild(taxonomyContainer);
      }
      
      
      else {
          const optionsContainer = document.createElement('div');
          optionsContainer.className = 'facet-options space-y-2';

          const facetData = aggregations[facetKey] || [];
          facetData.forEach(bucket => {
              const label = document.createElement('label');
              label.className = 'cursor-pointer block';
              label.style.display = 'block';

              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.value = bucket.key;
              checkbox.className = 'form-checkbox mr-2';
              checkbox.dataset.facetType = facetKey;

              if (checkedState[facetKey]?.includes(bucket.key)) {
                  checkbox.checked = true;
              }

              const text = document.createElement('span');
              text.textContent = `${bucket.key} (${bucket.doc_count})`;
              text.className = 'text-sm';

              label.appendChild(checkbox);
              label.appendChild(text);
              optionsContainer.appendChild(label);
          });

          facetGroup.appendChild(optionsContainer);
      }

      facetsContainer.appendChild(facetGroup);
  });

    this.addFacetEventListeners();
  }

  // handles barchart in slider 

  // Add these methods to your class

/**
 * Renders a bar chart showing the distribution of values
 * @param {HTMLElement} element - The container element for the chart
 * @param {Array} buckets - Array of value buckets with counts
 * @param {number} minValue - Minimum value in the range
 * @param {number} maxValue - Maximum value in the range
 */
renderBarChart(element, buckets, minValue, maxValue) {
  // Clear any existing content
  element.innerHTML = '';
  
  // Find the maximum count for scaling
  const maxCount = Math.max(...buckets.map(bucket => bucket.count));
  
  // Create a container for the bars
  const barsContainer = document.createElement('div');
  barsContainer.className = 'flex items-end w-full h-full relative';
  element.appendChild(barsContainer);
  
  // Sort buckets by value to ensure bars are in order
  const sortedBuckets = [...buckets].sort((a, b) => a.value - b.value);
  
  // Create and append bar elements
  sortedBuckets.forEach(bucket => {
    const barHeight = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
    
    const bar = document.createElement('div');
    bar.className = 'flex-1 mx-px';
    bar.style.height = `${barHeight}%`;
    bar.style.backgroundColor = '#b0c4de';
    bar.dataset.value = bucket.value;
    bar.dataset.count = bucket.count;
    bar.title = `Value: ${bucket.value}, Count: ${bucket.count}`;
    
    barsContainer.appendChild(bar);
  });
  
  // Add a selection overlay for highlighting the active range
  const highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'absolute top-0 h-full pointer-events-none';
  highlightOverlay.style.backgroundColor = 'rgba(66, 153, 225, 0.3)';
  highlightOverlay.id = `${element.id}-highlight`;
  element.appendChild(highlightOverlay);
}

/**
 * Updates the highlighted section of the chart based on selected range
 * @param {HTMLElement} chartElement - The chart container element
 * @param {Array} buckets - Array of value buckets
 * @param {number} startValue - Start of selected range
 * @param {number} endValue - End of selected range
 */
updateChartHighlight(chartElement, buckets, startValue, endValue) {
  const highlight = chartElement.querySelector(`#${chartElement.id}-highlight`);
  if (!highlight) return;
  
  const range = buckets[buckets.length - 1].value - buckets[0].value;
  if (range <= 0) return;
  
  // Calculate the left position and width as percentages
  const leftPos = ((startValue - buckets[0].value) / range) * 100;
  const width = ((endValue - startValue) / range) * 100;
  
  highlight.style.left = `${leftPos}%`;
  highlight.style.width = `${width}%`;
}

  onFacetChange(event) {
    const { value, checked } = event.target;
    const facetType = event.target.dataset.facetType;

    if (checked) {
      if (!this.state.filters[facetType]) {
        this.state.filters[facetType] = [];
      }
      this.state.filters[facetType].push(value);
    } else {
      this.state.filters[facetType] = this.state.filters[facetType].filter(v => v !== value);
    }
    
    this.performSearch();
    this.fetchAggregations();
  }

  handleSliderChange(event, facetKey) {
    const value = event.target.value;
    // Depending on your aggregation, the value can be a number or a date range
    const dateFilter = { [facetKey]: value };

    // Update filters
    this.state.filters[facetKey] = [value]; // Simple example, you can adjust for actual date ranges
    this.performSearch();
    this.fetchAggregations();
}

  addFacetEventListeners() {
    if (!this.config.aggregations) {
      console.error('Aggregations configuration not found');
      return;
    }

    Object.keys(this.config.aggregations).forEach(facetKey => {
      const facetContainer = document.getElementById(`${facetKey}-facet`);
  
      if (facetContainer) {
        facetContainer.querySelectorAll('input').forEach(input => {
          input.addEventListener('change', this.onFacetChange.bind(this));
        });
      }
    });
  }

  performSearch() {
    if (!this.searchEngine) {
      console.error('Search engine not initialized');
      return;
    }

    const { filters } = this.state;
    
    // Separate filters by type to handle them differently
    const regularFilters = {};
    const dateFilters = {};
    const taxonomyFilters = {};

    Object.entries(filters).forEach(([key, values]) => {
      if (!values || values.length === 0) return;
      
      const config = this.config.aggregations[key];
      if (!config) return;

      switch (config.type) {
        case 'range':
          dateFilters[key] = values;
          break;
        case 'taxonomy':
          taxonomyFilters[key] = values;
          break;
        default:
          regularFilters[key] = values;
      }
    });

    const results = this.searchEngine.search({
      query: this.state.query || '',
      filters: regularFilters,
      sort: this.state.sort || 'title_asc',
      per_page: 526,
      filter: (item) => {

        // Check date filters
        for (const [field, range] of Object.entries(dateFilters)) {
          if (range.length === 2) {
            const [startDate, endDate] = range;
            const itemDate = new Date(item[field]).getTime();
            if (!(itemDate >= startDate && itemDate <= endDate)) {
              return false;
            }
          }
        }

        // Check taxonomy filters
        for (const [field, paths] of Object.entries(taxonomyFilters)) {
          if (!item[field]) return false;
          
          // Check if any of the selected paths match the item's taxonomy
          const itemValue = item[field];
          const matches = paths.some(path => {
            return itemValue === path || itemValue.startsWith(path + ' > ');
          });
          
          if (!matches) return false;
        }

        return true;
      }
    });

    // Update the map
    // const coordinates = results.data.items
    //   .filter(item => item.latitude && item.longitude)
    //   .map(item => [item.latitude, item.longitude]);

    // if (coordinates.length > 0) {
    //   const bounds = L.latLngBounds(coordinates);
    //   // this.map.fitBounds(bounds);
    // }

    // Update the map
    const coordinates = results.data.items
    .filter(item => item.lat_long && item.lat_long.length > 0)
    .map(item => {  
      // Get the string from the array's first element
      const coordString = item.lat_long[0];
      const [latitude, longitude] = coordString.split(",");
      return [parseFloat(latitude), parseFloat(longitude)];
    });

    // Update markers and results
    this.renderMarkers(results.data.items);

    this.updateResultsList(results.data.items);

    // Update aggregations
    const aggregations = {};
    for (const key in results.data.aggregations) {
      if (results.data.aggregations.hasOwnProperty(key)) {
        aggregations[key] = results.data.aggregations[key].buckets;
      }
    }
    this.renderFacets(aggregations);
}

// Method to focus the map on specific coordinates
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

// Updated updateResultsList method
updateResultsList(items) {
  const resultsContainer = document.getElementById('results');
  if (!resultsContainer) {
    console.error('Results container not found');
    return;
  }

  resultsContainer.innerHTML = items
  .map((item) => {
    // If Spazi geografici is an array, use it directly
    const spaces = Array.isArray(item["Spazi geografici"]) ? item["Spazi geografici"] : [];
    
    // Get coordinates from the item
    
    // Create space buttons with actual coordinates when available
    const spacesButtons = spaces.map((space, index) => {
      let coordinates = [];
      if (Array.isArray(item.lat_long) && item.lat_long.length > 0) {
        const coordString = item.lat_long[index];
        if (coordString && typeof coordString === 'string') {
          const parts = coordString.split(',');
          if (parts.length === 2) {
            coordinates = [parts[0].trim(), parts[1].trim()];
          }
        }
      }

      const lat = coordinates[0] ;
      const lng = coordinates[1] 
      
      if (lat && lng) {
        return `
        <button class="focus-map-btn mr-2 px-2 py-1 text-sm bg-gray-100 rounded" 
                data-space="${encodeURIComponent(space)}" 
                data-lat="${lat}" 
                data-lng="${lng}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 inline mr-1">
            <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
          </svg>
          ${space}
        </button>
      `;
    }
    else {
      return `
        <button class="focus-map-btn mr-2 px-2 py-1 text-sm bg-gray-100 rounded" 
                data-space="${encodeURIComponent(space)}" >
          ${space}
        </button>
      `;
    }
    }).join('');

    return `
      <div class="p-4 bg-white rounded-lg shadow">
        <h3 class="font-semibold flex items-center">${item.Titolo}, ${item.Autore} (${item.Anno})
          <a href="../pages/record.html?scheda=${encodeURIComponent(item.Titolo)}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </h3>
        <div class="mt-2">
          <div class="flex flex-wrap items-center">
            ${spacesButtons}
          </div>
        </div>
      </div>
    `;
  })
  .join('');

  // Store a reference to the current instance
  const self = this;
  
  // Add event listeners to the buttons
  document.querySelectorAll('.focus-map-btn').forEach(button => {
    button.addEventListener('click', function() {
      const lat = this.getAttribute('data-lat');
      const lng = this.getAttribute('data-lng');
      
      if (lat && lng) {
        // Call the new focusOnMap method
        self.focusOnMap(lat, lng, 8);
      } else {
        console.warn('Coordinate non disponibili per questa opera');
      }
    });
  });
}

  debounce(func, delay) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, arguments), delay);
    };
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new LEDASearch();
});