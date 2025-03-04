// Importa la funzione di inizializzazione della mappa
import { initMap } from './utils/initMap.js';
import { parseData } from './utils/dataParser.js';
import { loadConfiguration } from './utils/configLoader.js';

// Funzione per generare la sezione "In evidenza sulla mappa"
function generateFeaturedLocations(data) {
    // Seleziona solo gli elementi con in_evidence impostato a true
    const featuredItems = data.filter(item => item.in_evidence === true);
    
    // Se non ci sono elementi in evidenza, non mostrare la sezione
    if (featuredItems.length === 0) return null;
    
    // Crea il container principale
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
    
    // Aggiungi il titolo della sezione
    const title = document.createElement('h2');
    title.className = 'text-3xl font-bold text-gray-900 mb-8';
    title.textContent = 'Luoghi d\'interesse';
    container.appendChild(title);
    
    // Crea la griglia per le schede
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    container.appendChild(grid);
    
    // Genera una scheda per ogni elemento in evidenza
    featuredItems.forEach(item => {
      // Crea la scheda
      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 card-hover transition duration-300';
      
      // Aggiungi l'immagine
      const imageContainer = document.createElement('div');
      imageContainer.className = 'h-48 overflow-hidden';
      
      // const image = document.createElement('img');
      // image.src = item.image_url || '/api/placeholder/600/400'; // Usa un placeholder se non c'è un'immagine
      // image.alt = item.name || 'Immagine montagna';
      // image.className = 'w-full h-full object-cover';
      
      // imageContainer.appendChild(image);
      // card.appendChild(imageContainer);
      
      // Crea il contenuto della scheda
      const content = document.createElement('div');
      content.className = 'p-6';
      
      // Intestazione con nome e anno
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-2';
      
      const name = document.createElement('h3');
      name.className = 'text-xl font-bold';
      name.textContent = item.Name || 'Luogo senza nome';
      
      const year = document.createElement('span');
      year.className = 'text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded';
      year.textContent = item.Date || '';
      
      header.appendChild(name);
      if (item.Date) {
        header.appendChild(year);
      }
      content.appendChild(header);
      
      // Descrizione
      const description = document.createElement('p');
      description.className = 'text-gray-600 mb-4';
      description.textContent = item.in_evidence_description || '';
      content.appendChild(description);
      
      // Link per esplorare
      const link = document.createElement('a');
      link.href = `#${item.id || ''}`;
      link.className = 'text-indigo-600 font-medium hover:text-indigo-800 inline-flex items-center';

    // link.textContent = 'Esplora la storia'; to be added then
    //   const icon = document.createElement('i');
    //   icon.className = 'fas fa-arrow-right ml-2';
    //   link.appendChild(icon);
      
      content.appendChild(link);
      card.appendChild(content);
      
      // Aggiungi la scheda alla griglia
      grid.appendChild(card);
    });
    
    return container;
  }

// Funzione principale asincrona per la mappa
async function initializeMap() {
  try {
    // Crea un elemento container con ID specifico per Leaflet
    const mapId = 'map';
    
    // Verifica se il container esiste già
    let mapContainer = document.getElementById(mapId);
    
    // Carica la configurazione
    const config = await loadConfiguration();
    
    // Assicurati che la struttura della configurazione sia completa
    if (!config.map) {
      console.warn('Configurazione della mappa mancante, utilizzo configurazione predefinita');
      config.map = {
        initialView: [45.9763, 7.6586],
        initialZoom: 8,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      };
    }
    
    // Passa l'ID del container alla configurazione
    config.map.containerId = mapId;
    
    console.log(`Inizializzazione mappa con container ID: "${mapId}"`);
    
    // Inizializza la mappa con la configurazione UNA SOLA VOLTA
    const mapResult = initMap(config);
    const map = mapResult.map;
    const markers = mapResult.markers;
    const renderMarkers = mapResult.renderMarkers;
    
    // Carica e analizza i dati
    try {
      // Carica e analizza i dati
      const data = await parseData();
      
      // Aggiungi i dati alla mappa
      if (data && Array.isArray(data)) {
        console.log(`Aggiunti ${data.length} punti alla mappa`);
        
        // Usa la funzione renderMarkers per aggiungere i marker alla mappa già inizializzata
        if (renderMarkers && typeof renderMarkers === 'function') {
          renderMarkers(data);
        } else {
          console.warn('La funzione renderMarkers non è disponibile');
        }
        
        // Rendi i dati disponibili globalmente per altri moduli
        window.alpinismData = data;
      } else {
        console.warn('Nessun dato valido trovato o formato dati non valido');
      }
    } catch (dataError) {
      console.error('Errore durante il caricamento o l\'analisi dei dati:', dataError);
      // Continua con la mappa senza dati
    }
    
    console.log('Mappa inizializzata con successo');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione della mappa:', error);
    
    // Mostra un messaggio di errore visibile
    const errorContainer = document.querySelector('.map-container') || document.body;
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message p-4 bg-red-100 text-red-700 border border-red-300 rounded';
    errorMessage.textContent = 'Si è verificato un errore durante il caricamento della mappa. Ricarica la pagina per riprovare.';
    errorContainer.appendChild(errorMessage);
  }
}

// Funzione per inizializzare la sezione delle località in evidenza
async function initializeFeaturedLocations() {
  try {
    // Verifica se i dati sono già disponibili globalmente
    if (window.alpinismData) {
      const data = window.alpinismData;
      
      // Trova l'elemento container per le località in evidenza
      const featuredContainer = document.getElementById('featured-locations-container');
      if (featuredContainer) {
        const featuredSection = generateFeaturedLocations(data);
        if (featuredSection) {
          featuredContainer.appendChild(featuredSection);
          console.log('Sezione "In evidenza sulla mappa" generata con successo');
        } else {
          console.log('Nessun elemento in evidenza trovato nei dati');
        }
      } else {
        console.warn('Container per le località in evidenza non trovato (ID: featured-locations-container)');
        
        // Cerchiamo di trovare un punto logico dove inserire la sezione
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
          // Creiamo un container per la sezione e lo inseriamo dopo la mappa
          const newFeaturedContainer = document.createElement('div');
          newFeaturedContainer.id = 'featured-locations-container';
          mapContainer.parentNode.insertBefore(newFeaturedContainer, mapContainer.nextSibling);
          
          // Ora generiamo la sezione
          const featuredSection = generateFeaturedLocations(data);
          if (featuredSection) {
            newFeaturedContainer.appendChild(featuredSection);
            console.log('Sezione "In evidenza sulla mappa" generata e inserita automaticamente');
          }
        }
      }
    } else {
      // Se i dati non sono disponibili, caricali
      try {
        const data = await parseData();
        if (data && Array.isArray(data)) {
          // Salva i dati globalmente
          window.alpinismData = data;
          
          // Continua con l'inizializzazione della sezione
          const featuredContainer = document.getElementById('featured-locations-container');
          if (featuredContainer) {
            const featuredSection = generateFeaturedLocations(data);
            if (featuredSection) {
              featuredContainer.appendChild(featuredSection);
              console.log('Sezione "In evidenza sulla mappa" generata con successo');
            }
          }
        }
      } catch (error) {
        console.error('Errore durante il caricamento dei dati per le località in evidenza:', error);
      }
    }
  } catch (error) {
    console.error('Errore durante l\'inizializzazione delle località in evidenza:', error);
  }
}

// Quando il documento è completamente caricato
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  initializeFeaturedLocations();
});