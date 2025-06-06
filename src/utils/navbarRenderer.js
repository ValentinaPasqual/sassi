/**
 * Navigation Bar Renderer Module
 * Handles all navigation bar functionality including panel toggles, 
 * active filters display, results counter, map legend, and filter popup
 */

export class NavBarRenderer {
    constructor() {
        this.elements = {};
        this.activeFiltersCount = 0;
        this.resultsCount = 0;
        this.isInitialized = false;
        this.currentFilters = {};
        this.currentQuery = '';
        this.config = null;
        
        // Initialize elements after DOM is ready
        this.init();
    }

    /**
     * Initialize the navigation bar and bind all event handlers
     */
    init() {
        // Get all DOM elements
        this.elements = {
            filtersPanel: document.getElementById('filters-panel'),
            resultsPanel: document.getElementById('results-panel'),
            toggleFilters: document.getElementById('toggle-filters'),
            toggleResults: document.getElementById('toggle-results'),
            activeFiltersBadge: document.getElementById('active-filters-badge'),
            activeFiltersCount: document.getElementById('active-filters-count'),
            resultsCounter: document.getElementById('results-counter'),
            resultsCount: document.getElementById('results-count'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            mapCenterBtn: document.getElementById('map-center-btn'),
            toggleLegendBtn: document.getElementById('toggle-legend-btn'),
            mapLegend: document.getElementById('map-legend'),
            closeLegendBtn: document.getElementById('close-legend-btn')
        };

        // Bind event handlers
        this.bindEventHandlers();
        
        // Initialize panels as closed for better mobile experience
        this.initializePanelStates();
        
        // Handle responsive behavior
        this.setupResponsiveBehavior();
        
        // Style the clear all button as red and position it properly
        this.styleClearAllButton();
        
        this.isInitialized = true;
    }

    /**
     * Style the clear all button to be red and positioned next to active filters badge
     */
    styleClearAllButton() {
        if (this.elements.clearAllBtn) {
            // Add red styling classes
            this.elements.clearAllBtn.className = 'ml-2 px-3 py-1 bg-pink-100 hover:bg-pink-200 text-red-500 text-xs rounded-full transition-colors duration-200 hidden';
            this.elements.clearAllBtn.innerHTML = '<i class="fas fa-times mr-1"></i>Cancella tutto';
        }
    }

    /**
     * Set configuration for the navbar (used for filter labels and formatting)
     * @param {Object} config - Application configuration
     */
    setConfig(config) {
        this.config = config;
    }

    /**
     * Update the navigation bar with current search state
     * @param {Object} searchState - Current search state from main application
     * @param {number} resultsCount - Number of search results
     * @param {Object} options - Update options including skipAnimation
     */
    updateFromSearchState(searchState, resultsCount = 0, options = {}) {
        if (!searchState) return;

        // Store current state
        this.currentFilters = { ...searchState.filters };
        this.currentQuery = searchState.query || '';

        // Calculate active filters count
        const filtersCount = this.calculateActiveFiltersCount(searchState.filters);
        
        // Update displays - pass skipAnimation option through
        this.updateActiveFiltersCount(filtersCount, options.skipAnimation);
        this.updateResultsCount(resultsCount, options.skipAnimation);
    }

    /**
     * Calculate the total number of active filters
     * @param {Object} filters - Current filters object
     * @returns {number} Total count of active filters
     */
    calculateActiveFiltersCount(filters) {
        if (!filters || typeof filters !== 'object') return 0;
        
        let count = 0;
        Object.values(filters).forEach(filterValues => {
            if (Array.isArray(filterValues)) {
                // For range filters stored as [min, max], count as 1
                // For standard facets stored as array of values, count each value
                if (filterValues.length === 2 && 
                    typeof filterValues[0] === 'number' && 
                    typeof filterValues[1] === 'number') {
                    // This looks like a range filter [min, max]
                    count += 1;
                } else {
                    // This is a standard facet with multiple selected values
                    count += filterValues.length;
                }
            } else if (filterValues && typeof filterValues === 'object') {
                // Handle range filters stored as objects or other object-type filters
                if (filterValues.min !== undefined || filterValues.max !== undefined) {
                    count += 1;
                }
            }
        });
        
        return count;
    }

    /**
     * Update the active filters count display with conditional animation
     * @param {number} count - Number of active filters
     * @param {boolean} skipAnimation - Whether to skip the bounce animation
     */
    updateActiveFiltersCount(count, skipAnimation = false) {
        this.activeFiltersCount = count;
        this.elements.activeFiltersCount.textContent = count;
        
        if (count > 0) {
            this.showElementWithAnimation(this.elements.activeFiltersBadge, skipAnimation);
            this.showElementWithAnimation(this.elements.clearAllBtn, skipAnimation);
        } else {
            this.hideElementWithAnimation(this.elements.activeFiltersBadge);
            this.hideElementWithAnimation(this.elements.clearAllBtn);
        }
        
        this.emitEvent('activeFiltersChanged', { count });
    }

    /**
     * Update the results count display with conditional animation
     * @param {number} count - Number of results
     * @param {boolean} skipAnimation - Whether to skip the bounce animation
     */
    updateResultsCount(count, skipAnimation = false) {
        this.resultsCount = count;
        this.elements.resultsCount.textContent = count;
        
        if (count > 0) {
            this.showElementWithAnimation(this.elements.resultsCounter, skipAnimation);
        } else {
            this.hideElementWithAnimation(this.elements.resultsCounter);
        }
        
        this.emitEvent('resultsCountChanged', { count });
    }

    /**
     * Show element with conditional animation
     * @param {HTMLElement} element - Element to show
     * @param {boolean} skipAnimation - Whether to skip the bounce animation
     */
    showElementWithAnimation(element, skipAnimation = false) {
        if (!element) return;
        
        // If skipping animation, just show the element immediately
        if (skipAnimation) {
            element.classList.remove('hidden');
            element.style.opacity = '1';
            element.style.transform = 'scale(1) translateY(0px)';
            element.style.transition = 'none';
            return;
        }
        
        // Prevent double execution
        if (element.dataset.animating === 'true') return;
        element.dataset.animating = 'true';
        
        // Remove hidden class and prepare for animation
        element.classList.remove('hidden');
        
        // Clean up any existing classes to avoid conflicts
        element.classList.remove('opacity-0', 'scale-95', '-translate-y-2', 'opacity-100', 'scale-100', 'translate-y-0');
        
        // Set initial state - dramatic for visibility
        element.style.opacity = '0';
        element.style.transform = 'scale(0.7) translateY(-25px)';
        element.style.transition = 'none'; // No transition for initial state
        
        // Force reflow
        element.offsetHeight;
        
        // Start the bouncy animation sequence
        requestAnimationFrame(() => {
            // First bounce - overshoot with fast timing
            element.style.transition = 'all 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            element.style.opacity = '1';
            element.style.transform = 'scale(1.08) translateY(-3px)';
            
            // Second bounce - settle down
            setTimeout(() => {
                element.style.transition = 'all 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                element.style.transform = 'scale(0.98) translateY(2px)';
                
                // Final settle - perfect position
                setTimeout(() => {
                    element.style.transition = 'all 0.1s ease-out';
                    element.style.transform = 'scale(1) translateY(0px)';
                    
                    // Clear the animation lock after everything is done
                    setTimeout(() => {
                        element.dataset.animating = 'false';
                    }, 100);
                }, 120);
            }, 150);
        });
    }

    /**
     * Hide element with smooth animation
     * @param {HTMLElement} element - Element to hide
     */
    hideElementWithAnimation(element) {
        if (!element) return;
        
        // Add animation classes for hiding
        element.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
        element.classList.add('opacity-0', 'scale-95', '-translate-y-2');
        
        // Hide element after animation completes
        setTimeout(() => {
            if (element.classList.contains('opacity-0')) {
                element.classList.add('hidden');
            }
        }, 300); // Match the transition duration
    }

    /**
     * Create and show the active filters popup positioned exactly over the badge
     */
    showActiveFiltersPopup() {
        // Check if popup already exists - if so, close it
        const existingPopup = document.getElementById('active-filters-popup');
        if (existingPopup) {
            this.hideActiveFiltersPopup();
            return;
        }

        // Get badge position for precise positioning
        const badgeRect = this.elements.activeFiltersBadge.getBoundingClientRect();
        
        // Create popup with high z-index to appear over everything
        const popup = document.createElement('div');
        popup.id = 'active-filters-popup';
        popup.className = 'fixed p-2 w-72 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 transform transition-all duration-300 translate-y-4 opacity-0 max-h-96 overflow-hidden';
        popup.style.zIndex = '9999'; // Very high z-index to appear over everything
        
        // Position popup exactly over the badge
        popup.style.left = `${badgeRect.left}px`;
        popup.style.bottom = `${window.innerHeight - badgeRect.top + 10}px`; // 10px above the badge
        
        // Adjust if popup would go off-screen
        const popupWidth = 288; // w-72 = 18rem = 288px
        if (badgeRect.left + popupWidth > window.innerWidth) {
            popup.style.left = `${window.innerWidth - popupWidth - 16}px`; // 16px margin from edge
        }
        
        // Popup header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-2';
        header.innerHTML = `
            <h3 class="p-2 text-sm font-semibold text-gray-800">Filtri Attivi</h3>
            <button id="close-filters-popup" class="absolute top-2 right-2 p-1.5 bg-pink-100 hover:bg-pink-200 active:bg-pink-200 rounded-full text-red-500 shadow-md hover:shadow-lg transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 group-hover:rotate-90 transition-transform duration-200">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        // Popup content
        const content = document.createElement('div');
        content.className = 'space-y-1 max-h-64 overflow-y-auto overflow-x-hidden';
        
        // Build filters content
        const filtersContent = this.buildFiltersContent();
        content.innerHTML = filtersContent;

        // Assemble popup
        popup.appendChild(header);
        popup.appendChild(content);
        
        // Add to DOM
        document.body.appendChild(popup);

        // Animate in
        requestAnimationFrame(() => {
            popup.classList.remove('translate-y-4', 'opacity-0');
            popup.classList.add('translate-y-0', 'opacity-100');
        });

        // Bind close events and popup-specific clear all button
        this.bindPopupEvents(popup);
    }

    /**
     * Build the HTML content for active filters display with grouped categories
     * @returns {string} HTML content
     */
    buildFiltersContent() {
        if (!this.currentFilters || Object.keys(this.currentFilters).length === 0) {
            return `
                <div class="flex items-center p-4 rounded-lg bg-gray-50">
                    <span class="text-sm text-gray-700">Nessun filtro attivo</span>
                </div>
            `;
        }

        let content = '';

        // Add search query if present with enhanced styling
        if (this.currentQuery && this.currentQuery.trim()) {
            content += `
                <div class="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <div class="flex-1 min-w-0">
                            <span class="text-sm font-medium text-blue-700">Ricerca:</span>
                            <span class="text-sm text-blue-600 ml-1 font-mono bg-blue-100 px-2 py-1 rounded text-xs">"${this.escapeHtml(this.currentQuery)}"</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Group filters by category (facet label)
        const groupedFilters = {};
        Object.entries(this.currentFilters).forEach(([facetKey, values]) => {
            if (!values || (Array.isArray(values) && values.length === 0)) return;
            
            const facetLabel = this.getFacetLabel(facetKey);
            
            if (!groupedFilters[facetLabel]) {
                groupedFilters[facetLabel] = [];
            }
            
            if (Array.isArray(values)) {
                // Handle multiple values for the same facet
                if (values.length === 2 && 
                    typeof values[0] === 'number' && 
                    typeof values[1] === 'number') {
                    // This looks like a range filter [min, max]
                    groupedFilters[facetLabel].push({
                        type: 'range',
                        value: this.formatRangeFilter({ min: values[0], max: values[1] }),
                        facetKey
                    });
                } else {
                    // Multiple discrete values - add each one
                    values.forEach(value => {
                        groupedFilters[facetLabel].push({
                            type: 'value',
                            value: value,
                            facetKey
                        });
                    });
                }
            } else if (typeof values === 'object') {
                // Handle range or object filters
                groupedFilters[facetLabel].push({
                    type: 'range',
                    value: this.formatRangeFilter(values),
                    facetKey
                });
            }
        });

        // Build content for each category
        Object.entries(groupedFilters).forEach(([categoryLabel, filterItems]) => {
            content += `
                <div class="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div class="flex items-start">
                        <div class="w-2 h-2 rounded-full bg-indigo-500 mt-2 mr-3 flex-shrink-0"></div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-semibold text-gray-800 mb-2">${categoryLabel}</h4>
                            <div class="flex flex-wrap gap-1.5">
            `;
            
            // Add values for this category as inline pills
            filterItems.forEach((item, index) => {
                const isRange = item.type === 'range';
                const bgColor = isRange ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
                const icon = isRange ? 
                    `<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>` :
                    `<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
                
                content += `
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${bgColor} transition-all duration-200 hover:shadow-sm">
                        ${icon}
                        ${this.escapeHtml(item.value)}
                    </span>
                `;
            });
            
            content += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        return content || `
            <div class="flex items-center p-4 rounded-lg bg-gray-50">
                <span class="text-sm text-gray-700">Nessun filtro attivo</span>
            </div>
        `;
    }

    /**
     * Get human-readable label for a facet key
     * @param {string} facetKey - The facet key
     * @returns {string} Human-readable label
     */
    getFacetLabel(facetKey) {
        if (this.config && this.config.aggregations && this.config.aggregations[facetKey]) {
            return this.config.aggregations[facetKey].title || facetKey;
        }
        // Fallback: capitalize and replace underscores/dashes
        return facetKey.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format range filter for display
     * @param {Object} rangeValues - Range filter object
     * @returns {string} Formatted range text
     */
    formatRangeFilter(rangeValues) {
        if (rangeValues.min !== undefined && rangeValues.max !== undefined) {
            return `${rangeValues.min} - ${rangeValues.max}`;
        } else if (rangeValues.min !== undefined) {
            return `≥ ${rangeValues.min}`;
        } else if (rangeValues.max !== undefined) {
            return `≤ ${rangeValues.max}`;
        }
        return 'Range filter';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Hide the active filters popup
     */
    hideActiveFiltersPopup() {
        const popup = document.getElementById('active-filters-popup');
        if (popup) {
            popup.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }
    }

    /**
     * Bind events for the popup (simplified - only close and clear all)
     * @param {HTMLElement} popup - Popup element
     */
    bindPopupEvents(popup) {
        // Close button
        const closeBtn = popup.querySelector('#close-filters-popup');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideActiveFiltersPopup());
        }

        // Popup clear all button
        const popupClearAllBtn = popup.querySelector('#popup-clear-all-btn');
        if (popupClearAllBtn) {
            popupClearAllBtn.addEventListener('click', () => this.handleClearAllFilters());
        }

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideActiveFiltersPopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Close when clicking outside (but not the badge that opens it)
        const outsideClickHandler = (e) => {
            if (!popup.contains(e.target) && !this.elements.activeFiltersBadge.contains(e.target)) {
                this.hideActiveFiltersPopup();
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        
        // Add click handler after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 100);
    }

    /**
     * Bind all event handlers for navigation elements
     */
    bindEventHandlers() {
        // Panel toggle handlers
        this.elements.toggleFilters.addEventListener('click', () => {
            this.togglePanel('filters');
        });

        this.elements.toggleResults.addEventListener('click', () => {
            this.togglePanel('results');
        });

        // Clear all filters handler - now resets interface including facets
        this.elements.clearAllBtn.addEventListener('click', () => {
            this.handleClearAllFilters();
        });

        // Map center handler
        this.elements.mapCenterBtn.addEventListener('click', () => {
            this.handleMapCenter();
        });

        // Legend toggle handlers
        this.elements.toggleLegendBtn.addEventListener('click', () => {
            this.toggleLegend();
        });

        this.elements.closeLegendBtn.addEventListener('click', () => {
            this.closeLegend();
        });

        // Active filters badge click handler - show popup
        if (this.elements.activeFiltersBadge) {
            this.elements.activeFiltersBadge.addEventListener('click', () => {
                this.showActiveFiltersPopup();
            });
            
            // Make it look clickable
            this.elements.activeFiltersBadge.style.cursor = 'pointer';
            this.elements.activeFiltersBadge.title = 'Clicca per vedere i filtri attivi';
        }
    }

    /**
     * Initialize panel states (closed by default)
     */
    initializePanelStates() {
        this.elements.filtersPanel.classList.add('panel-closed');
        this.elements.resultsPanel.classList.add('panel-closed-right');
        this.elements.toggleFilters.classList.remove('active');
        this.elements.toggleResults.classList.remove('active');
    }

    /**
     * Toggle a specific panel (filters or results)
     * @param {string} panelType - 'filters' or 'results'
     */
    togglePanel(panelType) {
        if (panelType === 'filters') {
            const isClosing = !this.elements.filtersPanel.classList.contains('panel-closed');
            this.elements.filtersPanel.classList.toggle('panel-closed');
            this.elements.toggleFilters.classList.toggle('active', !isClosing);
            
            // Emit custom event for external handling
            this.emitEvent('panelToggled', { 
                type: 'filters', 
                isOpen: !isClosing 
            });
        } else if (panelType === 'results') {
            const isClosing = !this.elements.resultsPanel.classList.contains('panel-closed-right');
            this.elements.resultsPanel.classList.toggle('panel-closed-right');
            this.elements.toggleResults.classList.toggle('active', !isClosing);
            
            // Emit custom event for external handling
            this.emitEvent('panelToggled', { 
                type: 'results', 
                isOpen: !isClosing 
            });
        }
    }

    /**
     * Close all panels
     */
    closeAllPanels() {
        this.elements.filtersPanel.classList.add('panel-closed');
        this.elements.resultsPanel.classList.add('panel-closed-right');
        this.elements.toggleFilters.classList.remove('active');
        this.elements.toggleResults.classList.remove('active');
    }

    /**
     * Handle clear all filters action - Enhanced with proper interface reset
     */
    handleClearAllFilters() {
        // Hide popup if open
        this.hideActiveFiltersPopup();
        
        // Reset local state immediately
        this.currentFilters = {};
        this.currentQuery = '';
        
        // Update UI immediately to provide instant feedback
        this.updateActiveFiltersCount(0);
        this.updateResultsCount(0);
        
        // Emit custom event for external handling with interface reset flag FIRST
        this.emitEvent('clearAllFilters', { 
            resetInterface: true,
            clearSearch: true,
            clearFacets: true,
            clearMap: true
        });
        
        // Reset the facets interface after a delay to avoid conflicts
        setTimeout(() => {
            this.resetFacetsInterface();
        }, 100);
        
        // Clear search input if it exists
        this.clearSearchInput();
        
        // Show confirmation notification
        this.showNotification('Tutti i filtri sono stati rimossi', 'success', 2000);
    }

    /**
     * Handle map center action
     */
    handleMapCenter() {
        // Emit custom event for external handling
        this.emitEvent('centerMap');
    }

    /**
     * Toggle the map legend visibility
     */
    toggleLegend() {
        const isHidden = this.elements.mapLegend.classList.contains('legend-hidden');
        this.elements.mapLegend.classList.toggle('legend-hidden');
        this.elements.toggleLegendBtn.classList.toggle('active', isHidden);

        // Emit custom event
        this.emitEvent('legendToggled', { isVisible: isHidden });
    }

    /**
     * Close the map legend
     */
    closeLegend() {
        this.elements.mapLegend.classList.add('legend-hidden');
        this.elements.toggleLegendBtn.classList.remove('active');

        // Emit custom event
        this.emitEvent('legendClosed');
    }

    /**
     * Update the map legend with new items
     * @param {Array} legendItems - Array of legend items with color, label, count, and optional onClick
     */
    updateMapLegend(legendItems) {
        const legendContent = document.querySelector('.map-legend-content');
        if (!legendContent) return;

        legendContent.innerHTML = '';
        
        legendItems.forEach((item, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item flex items-center p-2 rounded-lg cursor-pointer';
            legendItem.dataset.legendIndex = index;
            
            legendItem.innerHTML = `
                <div class="w-4 h-4 rounded-full mr-3 flex-shrink-0" style="background-color: ${item.color}"></div>
                <span class="text-sm text-gray-700 flex-1">${item.label}</span>
                ${item.count !== undefined ? `<span class="text-xs text-gray-500 ml-2">${item.count}</span>` : ''}
            `;
            
            // Add click handler if provided
            if (item.onClick && typeof item.onClick === 'function') {
                legendItem.addEventListener('click', (e) => {
                    item.onClick(item, index, e);
                });
            }
            
            legendContent.appendChild(legendItem);
        });

        // Emit custom event
        this.emitEvent('legendUpdated', { items: legendItems });
    }

    /**
     * Setup responsive behavior for mobile devices
     */
    setupResponsiveBehavior() {
        // Handle window resize for better mobile experience
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                // On mobile, close panels by default
                this.closeAllPanels();
            }
        });

        // Initial mobile check
        if (window.innerWidth < 768) {
            this.closeAllPanels();
        }
    }

    /**
     * Get current state of the navigation bar
     * @returns {Object} Current state object
     */
    getState() {
        return {
            activeFiltersCount: this.activeFiltersCount,
            resultsCount: this.resultsCount,
            isFiltersOpen: !this.elements.filtersPanel.classList.contains('panel-closed'),
            isResultsOpen: !this.elements.resultsPanel.classList.contains('panel-closed-right'),
            isLegendVisible: !this.elements.mapLegend.classList.contains('legend-hidden'),
            currentFilters: { ...this.currentFilters },
            currentQuery: this.currentQuery
        };
    }

    /**
     * Set the state of the navigation bar
     * @param {Object} state - State object to apply
     */
    setState(state) {
        if (state.activeFiltersCount !== undefined) {
            this.updateActiveFiltersCount(state.activeFiltersCount);
        }
        
        if (state.resultsCount !== undefined) {
            this.updateResultsCount(state.resultsCount);
        }
        
        if (state.isFiltersOpen !== undefined) {
            const isCurrentlyOpen = !this.elements.filtersPanel.classList.contains('panel-closed');
            if (state.isFiltersOpen !== isCurrentlyOpen) {
                this.togglePanel('filters');
            }
        }
        
        if (state.isResultsOpen !== undefined) {
            const isCurrentlyOpen = !this.elements.resultsPanel.classList.contains('panel-closed-right');
            if (state.isResultsOpen !== isCurrentlyOpen) {
                this.togglePanel('results');
            }
        }
        
        if (state.isLegendVisible !== undefined) {
            const isCurrentlyVisible = !this.elements.mapLegend.classList.contains('legend-hidden');
            if (state.isLegendVisible !== isCurrentlyVisible) {
                this.toggleLegend();
            }
        }

        if (state.currentFilters !== undefined) {
            this.currentFilters = { ...state.currentFilters };
        }

        if (state.currentQuery !== undefined) {
            this.currentQuery = state.currentQuery;
        }
    }

    /**
     * Emit a custom event from the navigation bar
     * @param {string} eventName - Name of the event
     * @param {Object} detail - Event detail data
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(`navbar:${eventName}`, {
            detail,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Add event listener for navigation bar events
     * @param {string} eventName - Event name (without 'navbar:' prefix)
     * @param {Function} handler - Event handler function
     */
    addEventListener(eventName, handler) {
        document.addEventListener(`navbar:${eventName}`, handler);
    }

    /**
     * Remove event listener for navigation bar events
     * @param {string} eventName - Event name (without 'navbar:' prefix)
     * @param {Function} handler - Event handler function
     */
    removeEventListener(eventName, handler) {
        document.removeEventListener(`navbar:${eventName}`, handler);
    }

    /**
     * Show a notification in the navigation bar
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${this.getNotificationClasses(type)}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * Get CSS classes for notification types
     * @param {string} type - Notification type
     * @returns {string} CSS classes
     */
    getNotificationClasses(type) {
        const classes = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        return classes[type] || classes.info;
    }

    /**
     * Destroy the navigation bar and clean up event listeners
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.setupResponsiveBehavior);
        
        // Remove popup if exists
        this.hideActiveFiltersPopup();
        
        // Clear references
        this.elements = {};
        this.currentFilters = {};
        this.currentQuery = '';
        this.config = null;
        this.isInitialized = false;
    }

    /**
     * Force update the interface state - useful for external resets
     * @param {Object} newFilters - New filters state
     * @param {string} newQuery - New query state
     * @param {number} newResultsCount - New results count
     */
    forceUpdate(newFilters = {}, newQuery = '', newResultsCount = 0) {
        this.currentFilters = { ...newFilters };
        this.currentQuery = newQuery;
        
        const filtersCount = this.calculateActiveFiltersCount(newFilters);
        this.updateActiveFiltersCount(filtersCount);
        this.updateResultsCount(newResultsCount);
        
        // Close any open popups
        this.hideActiveFiltersPopup();
        
        // If filters are empty, reset the interface
        if (Object.keys(newFilters).length === 0 && !newQuery) {
            setTimeout(() => {
                this.resetFacetsInterface();
            }, 50);
        }
    }

    /**
     * Reset the entire interface to initial state
     */
    resetInterface() {
        this.currentFilters = {};
        this.currentQuery = '';
        this.updateActiveFiltersCount(0);
        this.updateResultsCount(0);
        this.hideActiveFiltersPopup();
        this.closeAllPanels();
        this.resetFacetsInterface();
        this.clearSearchInput();
    }

    /**
     * Reset all facets in the interface to their unchecked/default state
     */
    resetFacetsInterface() {
        const facetsContainer = document.getElementById('facets-container');
        if (!facetsContainer) return;

        // Reset all checkboxes
        const checkboxes = facetsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Reset all range sliders to their min/max values
        const sliders = facetsContainer.querySelectorAll('[id$="-slider"]');
        sliders.forEach(sliderElement => {
            if (sliderElement.noUiSlider) {
                try {
                    // Get the original range from the slider configuration
                    const range = sliderElement.noUiSlider.options.range;
                    sliderElement.noUiSlider.set([range.min, range.max]);
                    
                    // Reset associated input fields
                    const facetKey = sliderElement.id.replace('-slider', '');
                    const minInput = document.getElementById(`${facetKey}-min-input`);
                    const maxInput = document.getElementById(`${facetKey}-max-input`);
                    if (minInput) minInput.value = range.min;
                    if (maxInput) maxInput.value = range.max;
                    
                    // Reset chart highlight if it exists
                    const chartElement = document.getElementById(`${facetKey}-chart`);
                    if (chartElement) {
                        const highlight = chartElement.querySelector(`#${facetKey}-chart-highlight`);
                        if (highlight) {
                            highlight.style.left = '0%';
                            highlight.style.width = '100%';
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to reset slider ${sliderElement.id}:`, error);
                }
            }
        });

        // Reset taxonomy facets (collapse all expanded items)
        const toggleButtons = facetsContainer.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(button => {
            const path = button.dataset.path;
            const childrenContainer = facetsContainer.querySelector(`[data-parent="${path}"]`);
            if (childrenContainer && childrenContainer.style.display !== 'none') {
                childrenContainer.style.display = 'none';
                button.textContent = '▶';
            }
        });
    }

    /**
     * Clear the search input field if it exists
     */
    clearSearchInput() {
        // Common search input selectors
        const searchSelectors = [
            '#search-input',
            '#query-input', 
            '.search-input',
            'input[type="search"]',
            'input[placeholder*="search" i]',
            'input[placeholder*="cerca" i]'
        ];

        for (const selector of searchSelectors) {
            const searchInput = document.querySelector(selector);
            if (searchInput) {
                searchInput.value = '';
                // Trigger input event to notify any listeners
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                break;
            }
        }
    }

    /**
     * Helper method to update chart highlight (similar to FacetRenderer._updateChartHighlight)
     * @param {HTMLElement} chartElement - Chart element
     * @param {Array} buckets - Bucket data
     * @param {number} startValue - Start value
     * @param {number} endValue - End value
     */
    _updateChartHighlight(chartElement, buckets, startValue, endValue) {
        if (!chartElement || !buckets || buckets.length === 0) return;
        
        const highlight = chartElement.querySelector(`#${chartElement.id}-highlight`);
        if (!highlight) return;
        
        const range = buckets[buckets.length - 1].value - buckets[0].value;
        if (range <= 0) return;
        
        // Calculate the left position and width as percentages
        const leftPos = ((startValue - buckets[0].value) / range) * 100;
        const width = ((endValue - startValue) / range) * 100;
        
        highlight.style.left = `${Math.max(0, leftPos)}%`;
        highlight.style.width = `${Math.max(0, Math.min(100, width))}%`;
    }
}

// Export singleton instance
export const navBarRenderer = new NavBarRenderer();