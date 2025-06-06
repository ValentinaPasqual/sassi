export class EventBinder {
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
  }

  bindSearchEvents() {
    this.setupSearchInput();
    this.setupSortSelect();
    this.setupMapEvents();
  }

  setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) {
      console.error('Search input element not found');
      return;
    }

    const debouncedSearch = this.debounce(this.handleSearch, 300);
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
      this.searchEngine.state.sort = e.target.value;
      this.searchEngine.performSearch();
    });
  }

  setupMapEvents() {
    if (this.map) {
      this.map.on('moveend', () => this.searchEngine.performSearch());
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
