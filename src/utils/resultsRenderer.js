// resultsRenderer.js
import { ModalRenderer } from './modalRenderer.js';

export class ResultsRenderer {
  constructor(mapFocusCallback) {
    this.mapFocusCallback = mapFocusCallback;
    this.allWorks = [];
    this.modalRenderer = new ModalRenderer(mapFocusCallback);
  }

  updateResultsList(items, config, searchState = {}) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
      console.error('Results container not found');
      return;
    }

    // Store items and search state for modal use
    this.items = items;
    this.searchState = searchState;

    // Group items by ID_opera
    const groupedItems = this._groupByIdOpera(items);
    
    // Convert grouped items to array and render
    this.allWorks = Object.values(groupedItems);
    
    // Set data, config, and search state for modal renderer
    this.modalRenderer.setData(this.allWorks, this.items);
    this.modalRenderer.setConfig(config);
    this.modalRenderer.setSearchState(searchState); // Pass the search state including filters
    
    resultsContainer.innerHTML = this.allWorks
      .map((work, index) => this._renderResultItem(work, index))
      .join('');

    // Add event listeners to the buttons
    this._addMapFocusListeners();
    this._addModalListeners();
  }

  _groupByIdOpera(items) {
    const grouped = {};
    
    items.forEach(item => {
      const idOpera = item.ID_opera;
      
      if (!grouped[idOpera]) {
        // Initialize with the first occurrence of this ID_opera
        grouped[idOpera] = {
          ID_opera: idOpera,
          Titolo: item.Titolo,
          Autore: item.Autore,
          Anno: item.Anno,
          "Spazi geografici": [],
          coordinates: []
        };
      }
      
      // Add the geographical space and coordinates from this row
      if (item["Spazi geografici"]) {
        // Handle both string and array cases
        const spaces = Array.isArray(item["Spazi geografici"]) 
          ? item["Spazi geografici"] 
          : [item["Spazi geografici"]];
        
        spaces.forEach((space, spaceIndex) => {
          if (!grouped[idOpera]["Spazi geografici"].includes(space)) {
            grouped[idOpera]["Spazi geografici"].push(space);
            
            // Extract coordinates for this space
            const coords = this._extractCoordinatesFromItem(item, spaceIndex);
            grouped[idOpera].coordinates.push(coords);
          }
        });
      }
    });
    
    return grouped;
  }

  _renderResultItem(work, index) {
    // Create space buttons with coordinates
    const spacesButtons = work["Spazi geografici"].map((space, spaceIndex) => {
      const coordinates = work.coordinates[spaceIndex];
      
      if (coordinates && coordinates.lat && coordinates.lng) {
        return `
          <button class="focus-map-btn mr-2 mb-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-100 text-indigo-700 border-indigo-200 transition-all duration-200 hover:shadow-sm hover:bg-indigo-200 hover:scale-105 active:scale-95 cursor-pointer transform" 
                  data-space="${encodeURIComponent(space)}" 
                  data-lat="${coordinates.lat}" 
                  data-lng="${coordinates.lng}"
                  title="Clicca per visualizzare sulla mappa">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 inline mr-1">
              <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
            </svg>
            ${space}
          </button>
        `;
      } else {
        return `
            <button class="focus-map-btn mr-2 mb-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200 transition-all duration-200 hover:shadow-sm hover:bg-slate-200 hover:scale-105 active:scale-95 cursor-pointer transform"
                  data-space="${encodeURIComponent(space)}"
                  title="Coordinate non disponibili">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 inline mr-1 opacity-50">
              <path fill-rule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd" />
            </svg>
            ${space}
          </button>
        `;
      }
    }).join('');

    return `
      <div class="result-card p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <h3 class="font-semibold flex items-center justify-between mb-3">
          <span>${work.Titolo}, ${work.Autore} (${work.Anno})</span>
            <button class="modal-toggle-btn ml-2 inline-flex items-center justify-center p-2 rounded-full border bg-slate-100 text-slate-700 border-slate-200 transition-all duration-200 hover:shadow-sm hover:bg-slate-200 hover:scale-105 active:scale-95 cursor-pointer transform"
                    data-work-index="${index}"
                    title="Visualizza tutte le opere">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
            </button>
        </h3>
<div class="w-full max-w-6xl mx-auto px-4">
    <div class="flex items-start mt-2">
        <div class="w-2 h-2 rounded-full bg-indigo-500 mt-2 mr-3 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Spazi geografici descritti</h4>
            <div class="flex flex-wrap gap-1">
                ${spacesButtons}
            </div>
        </div>
    </div>
</div>
      </div>
    `;
  }

  _addModalListeners() {
    // Add event listeners to modal toggle buttons
    document.querySelectorAll('.modal-toggle-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const workIndex = parseInt(button.getAttribute('data-work-index'));
        this.modalRenderer.toggleModal(workIndex);
      });
    });
  }

  _extractCoordinatesFromItem(item, index) {
    let coordinates = { lat: null, lng: null };
    
    if (Array.isArray(item.lat_long) && item.lat_long.length > index) {
      const coordString = item.lat_long[index];
      if (coordString && typeof coordString === 'string') {
        const parts = coordString.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0].trim());
          const lng = parseFloat(parts[1].trim());
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates.lat = lat;
            coordinates.lng = lng;
          }
        }
      }
    } else if (item.lat_long && typeof item.lat_long === 'string') {
      // Handle single coordinate string
      const parts = item.lat_long.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates.lat = lat;
          coordinates.lng = lng;
        }
      }
    }
    
    return coordinates;
  }

  _addMapFocusListeners() {
    document.querySelectorAll('.focus-map-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const lat = button.getAttribute('data-lat');
        const lng = button.getAttribute('data-lng');
        
        if (lat && lng && this.mapFocusCallback) {
          this.mapFocusCallback(parseFloat(lat), parseFloat(lng), 8);
        } else {
          console.warn('Coordinate non disponibili per questa opera:', 
                      button.getAttribute('data-space'));
        }
      });
    });
  }
}