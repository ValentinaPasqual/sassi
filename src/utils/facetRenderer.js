// facetRenderer.js
import { TaxonomyRenderer } from './taxonomyRenderer.js';

export class FacetRenderer {
  constructor(config) {
    this.config = config;
    this.taxonomyRenderer = new TaxonomyRenderer(); // Add this line
  }

  renderFacets(aggregations, state, onStateChange) {
    if (!aggregations || !this.config.aggregations) {
      console.error('No aggregations data or configuration available.');
      return;
    }

    const facetsContainer = document.getElementById('facets-container');

    // Store current checked state before clearing
    const checkedState = this._getCheckedState();

    // Clear existing facets
    facetsContainer.innerHTML = '';

    // Group facets by category
    const categorizedFacets = {};

    Object.entries(this.config.aggregations).forEach(([facetKey, facetConfig]) => {
      const category = facetConfig.category || 'Other'; // Default category if none specified
      
      if (!categorizedFacets[category]) {
        categorizedFacets[category] = [];
      }
      
      categorizedFacets[category].push({ facetKey, facetConfig });
    });

    // Create category divs and render facets within them
    Object.entries(categorizedFacets).forEach(([categoryName, facets]) => {
      // Create category container
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'facet-category';
      categoryDiv.setAttribute('data-category', categoryName);
      
      // Create category title
      const categoryTitle = document.createElement('h3');
      categoryTitle.className = 'facet-category-title';
      categoryTitle.textContent = categoryName;
      categoryDiv.appendChild(categoryTitle);
      
      // Create container for facets within this category
      const categoryFacetsContainer = document.createElement('div');
      categoryFacetsContainer.className = 'facet-category-content';
      
      // Render each facet in this category
      facets.forEach(({ facetKey, facetConfig }) => {
        const facetGroup = this._createFacetGroup(facetKey, facetConfig);
        
        if (facetConfig.type === 'range') {
          this._renderRangeFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState, state, onStateChange);
        } else if (facetConfig.type === 'taxonomy') {
          this._renderTaxonomyFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState, onStateChange);
        } else {
          this._renderStandardFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState);
        }
        
        categoryFacetsContainer.appendChild(facetGroup);
      });
      
      categoryDiv.appendChild(categoryFacetsContainer);
      facetsContainer.appendChild(categoryDiv);
    });

    this._addFacetEventListeners(onStateChange);
  }

  _getCheckedState() {
    const checkedState = {};
    Object.keys(this.config.aggregations).forEach(facetKey => {
      const facetElement = document.getElementById(`${facetKey}-facet`);
      if (facetElement) {
        checkedState[facetKey] = Array.from(facetElement.querySelectorAll('input:checked')).map(input => input.value);
      }
    });
    return checkedState;
  }

  _createFacetGroup(facetKey, facetConfig) {
    const facetGroup = document.createElement('div');
    facetGroup.className = 'facet-group mb-4 p-4 bg-white rounded-lg shadow';
    facetGroup.id = `${facetKey}-facet`;

    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold mb-2';
    title.textContent = facetConfig.title || facetKey;
    facetGroup.appendChild(title);

    return facetGroup;
  }

  _renderRangeFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState, state, onStateChange) {
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
    
    // Render the bar chart - need to use ChartRenderer instance
    this._renderBarChart(chartElement, buckets, minValue, maxValue);

    // Get current filter values or use min/max values
    const currentFilter = state.filters[facetKey];
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
            // Use callback to update state instead of direct access
            onStateChange({ 
              type: 'RANGE_CHANGE', 
              facetKey, 
              value: [start, end] 
            });
            
            // Update the highlighted range in the chart
            this._updateChartHighlight(chartElement, buckets, start, end);
        }
    });

    // Handle input changes with debounce utility
    const handleInputChange = this._debounce((evt) => {
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
    this._updateChartHighlight(chartElement, buckets, startValue, endValue);
  }

_renderTaxonomyFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState, onStateChange) {
  // Create container for the taxonomy
  const taxonomyContainer = document.createElement('div');

  // Get facet data (e.g., hierarchy of terms)
  const facetData = aggregations[facetKey] || [];

  // Render the taxonomy into the container
  this.taxonomyRenderer.renderTaxonomy(taxonomyContainer, facetData, facetKey, checkedState);

  // Listen for custom 'taxonomyChange' events dispatched by taxonomyRenderer
  taxonomyContainer.addEventListener('taxonomyChange', (e) => {
    const { facetKey, allAffectedPaths, action } = e.detail;

    // Notify the main application state handler of each affected path
    allAffectedPaths.forEach((path) => {
      onStateChange({
        type: 'FACET_CHANGE',
        facetType: facetKey,
        value: path,
        checked: action === 'add'
      });
    });
  });

  // Append the taxonomy UI to the DOM
  facetGroup.appendChild(taxonomyContainer);
}



  _renderStandardFacet(facetGroup, facetKey, facetConfig, aggregations, checkedState) {
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

  // Helper methods for chart rendering and debouncing
  _renderBarChart(element, buckets, minValue, maxValue) {
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

  _updateChartHighlight(chartElement, buckets, startValue, endValue) {
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

  _addFacetEventListeners(onStateChange) {
    if (!this.config.aggregations) {
      console.error('Aggregations configuration not found');
      return;
    }

    Object.keys(this.config.aggregations).forEach(facetKey => {
      const facetContainer = document.getElementById(`${facetKey}-facet`);
      
      if (facetContainer) {
        facetContainer.querySelectorAll('input').forEach(input => {
          input.addEventListener('change', (event) => {
            this._onFacetChange(event, onStateChange);
          });
        });
      }
    });
  }

  _onFacetChange(event, onStateChange) {
    const { value, checked } = event.target;
    const facetType = event.target.dataset.facetType;
    onStateChange({ type: 'FACET_CHANGE', facetType, value, checked });
  }

   _debounce(func, delay) {
    let timer;
    return function () {
      clearTimeout(timer);  
      timer = setTimeout(() => func.apply(this, arguments), delay);
    };
   }
}