# Changes to Faceted Search Implementation

## Overview
This document explains the changes made to implement two separate faceted searches for the catalogue and geodata files, while maintaining their interaction.

## Key Changes

### 1. Separate Search Engines
- Created two distinct ItemsJS search engines:
  - `catalogueSearchEngine`: Handles catalogue.tsv data
  - `geodataSearchEngine`: Handles geodata.tsv data

### 2. Facet Configuration
- Separated facets into two groups:
  - Catalogue facets (excluding Spazi geografici, Tipologie di luoghi, and Motivazione dell'interpretazione)
  - Geodata facets (Spazi geografici, Tipologie di luoghi, and Motivazione dell'interpretazione)

### 3. Interactive Filtering
- Implemented cross-filtering between the two search engines:
  - Filters from one search engine affect the results in the other
  - Maintains synchronization between the two datasets

### 4. UI Layout
- Created two separate facet containers:
  - `#catalogue-facets`: Contains catalogue-specific facets
  - `#geodata-facets`: Contains geodata-specific facets

## Implementation Details

### Search Engine Initialization
```javascript
// Initialize separate search engines
this.catalogueSearchEngine = itemsjs(catalogueData, this.config);
this.geodataSearchEngine = itemsjs(geodataData, this.config);
```

### Cross-Filtering Logic
```javascript
// When catalogue filters change, update geodata filters
this.catalogueSearchEngine.search({
  filters: this.state.catalogueFilters
}).then(results => {
  // Update geodata filters based on catalogue results
  this.updateGeodataFilters(results);
});
```

### UI Updates
- Added two distinct search input fields
- Created separate facet containers
- Maintained consistent styling across both search interfaces

## Benefits
- Clear separation of concerns between catalogue and geodata
- Maintained interactive relationship between datasets
- Improved user experience with dedicated search interfaces
- Better organization of facet categories
