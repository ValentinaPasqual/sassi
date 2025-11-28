const base = import.meta.env.BASE_URL;

async function loadConfiguration() {
  try {
    const storageKey = `mapConfig_${__APP_ID__}`;
    
    // Aggiungi un timestamp come query parameter per bypassare la cache
    const cacheBuster = new Date().getTime();
    const response = await fetch(`${base}config/map-config.json?v=${cacheBuster}`);
    const config = await response.json();
    
    // Aggiorna il localStorage con la nuova config
    localStorage.setItem(storageKey, JSON.stringify(config));
    console.log(`Configuration loaded from server (cache bypassed) and saved to ${storageKey}`);
    
    return config;
  } catch (error) {
    console.error('Error loading configuration from server:', error);
    
    // Fallback: se il server non risponde, usa localStorage come backup
    const savedConfig = localStorage.getItem(storageKey);
    
    if (savedConfig) {
      console.warn('Using cached configuration from localStorage as fallback');
      return JSON.parse(savedConfig);
    }
    
    throw error;
  }
}

async function saveConfiguration(config) {
  try {
    const storageKey = `mapConfig_${__APP_ID__}`;
    localStorage.setItem(storageKey, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration saved to ${storageKey}`);
         
    return true;
  } catch (error) {
    console.error('Error saving configuration:', error);
    return false;
  }
}

export { loadConfiguration, saveConfiguration };