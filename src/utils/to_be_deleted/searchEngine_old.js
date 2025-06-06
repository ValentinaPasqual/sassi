import itemsjs from 'itemsjs';
import { parseData } from './dataParser.js';
import { loadConfiguration } from './configLoader.js';

export class SearchEngine {
  constructor() {
    this.config = null;
    this.engine = null;
  }

  async initialize() {
    try {
      this.config = await loadConfiguration();
      const jsonData = await parseData();
      
      this.config.searchConfig.per_page = jsonData.length;
      this.engine = itemsjs(jsonData, this.config);
      
      return {
        engine: this.engine,
        config: this.config
      };
    } catch (error) {
      console.error('Search engine initialization error:', error);
      throw error;
    }
  }

  search(query = '', filters = {}) {
    if (!this.engine) {
      throw new Error('Search engine not initialized');
    }
    
    return this.engine.search({
      query,
      filters
    });
  }

  getAggregations() {
    if (!this.engine) {
      throw new Error('Search engine not initialized');
    }
    
    return this.engine.search().data.aggregations;
  }
}
