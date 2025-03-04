const base = import.meta.env.BASE_URL;

async function loadConfiguration() {
  try {
    const response = await fetch(`${base}/config/map-config.json`);
    const config = await response.json();
    console.log('Loaded configuration:', config);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
}

export { loadConfiguration };