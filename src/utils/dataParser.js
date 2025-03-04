const base = import.meta.env.BASE_URL;

import { loadConfiguration } from './configLoader.js';

// Create a parser object instead of using 'this' in the global scope
const dataParser = {
  // Initialize with default config
  config: { datasetConfig: { multivalue_rows: {} } },
  
  // Initialize the parser
  async init() {
    try {
      // Load configuration
      const loadedConfig = await loadConfiguration();
      
      // Only update config if something valid was returned
      if (loadedConfig) {
        this.config = loadedConfig;
        
        // Ensure datasetConfig always exists
        if (!this.config.datasetConfig) {
          this.config.datasetConfig = { multivalue_rows: {} };
        } else if (!this.config.datasetConfig.multivalue_rows) {
          this.config.datasetConfig.multivalue_rows = {};
        }
      } else {
        console.warn('loadConfiguration returned undefined or null, using default config');
      }
      
      return this;
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Don't throw error, fall back to default config
      console.warn('Using default configuration due to error');
      return this;
    }
  },
  
  async parseData() {
    try {
      // Fetch the TSV file
      const response = await fetch(`${base}/data/data.tsv`);
      const tsvText = await response.text();
         
      // Parse TSV to JSON
      const preprocessJsonData = this.parseTsvToJson(tsvText);
  
      // Split multivalue fields based on config
      const jsonData = this.processMultivalueFields(preprocessJsonData);
      
      return jsonData;
    } catch (error) {
      console.error('Error in parseData:', error);
      return []; // Return empty array instead of throwing
    }
  },
  
  // Process multivalue fields
  processMultivalueFields(preprocessJsonData) {
    // Safe access to multivalue_rows with double fallback
    const multivalueConfig = this.config?.datasetConfig?.multivalue_rows || {};
    
    preprocessJsonData.forEach(item => {
      Object.keys(multivalueConfig).forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          const separator = multivalueConfig[field];
          item[field] = item[field].split(separator).map(val => val.trim());
        }
      });
    });
    
    return preprocessJsonData;
  },
  
  // Helper method to parse TSV to JSON
  parseTsvToJson(tsvText) {
    // Split the TSV text into rows
    const rows = tsvText.trim().split('\n');
    
    // Extract headers from the first row
    const headers = rows[0].split('\t');
    
    // Convert each data row to a JSON object
    return rows.slice(1).map(row => {
      const values = row.split('\t');
      const item = {};
      
      // Map each value to its corresponding header
      headers.forEach((header, index) => {
        // Handle the case where cell is not empty
        if (index < values.length && values[index] !== '') {
          const value = values[index];
          
          // Try to parse numbers and booleans
          if (value.toLowerCase() === 'true') {
            item[header] = true;
          } else if (value.toLowerCase() === 'false') {
            item[header] = false;
          } else if (!isNaN(value) && value.trim() !== '') {
            item[header] = Number(value);
          } else {
            item[header] = value;
          }
        } 
      });
      
      return item;
    });
  }
};

// Export the parser object
export { dataParser };
// Also export the parseData function for backward compatibility
export const parseData = async () => {
  // Always initialize first
  await dataParser.init();
  return dataParser.parseData();
};