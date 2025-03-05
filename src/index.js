// Importa la funzione di inizializzazione della mappa
import { initMap } from './utils/initMap.js';
import { parseData } from './utils/dataParser.js';
import { loadConfiguration } from './utils/configLoader.js';

// Funzione per aggiornare i contenuti dinamicamente
function updateProjectDescription(config) {
  // Aggiorna elementi in base agli attributi data-*
  const projectTitle = document.querySelector('[data-content="project-title"]');
  if (projectTitle) projectTitle.textContent = config.project.projectTitle;
  
  const projectSubtitle = document.querySelector('[data-content="project-subtitle"]');
  if (projectSubtitle) projectSubtitle.textContent = config.project.projectSubtitle;
  
  const mapInfoTitle = document.querySelector('[data-content="map-info-title"]');
  if (mapInfoTitle) mapInfoTitle.textContent = config.project.mapInfoTitle;
  
  const mapInfoDescription = document.querySelector('[data-content="map-info-description"]');
  if (mapInfoDescription) mapInfoDescription.textContent = config.project.mapInfoDescription;
  
  // Per il testo del titolo del progetto
  const projectNameElement = document.querySelector('[data-content="project-name"]');
  if (projectNameElement) {
    // Troviamo l'ultimo nodo di testo che contiene "Il Progetto"
    let lastTextNode = null;
    for (let i = 0; i < projectNameElement.childNodes.length; i++) {
      if (projectNameElement.childNodes[i].nodeType === Node.TEXT_NODE) {
        lastTextNode = projectNameElement.childNodes[i];
      }
    }
    
    if (lastTextNode) {
      lastTextNode.textContent = "Il " + config.project.projectName;
    }
  }
  
  // Aggiorna i paragrafi della descrizione
  const descParts = config.project.projectDescription.split('<br><br>');
  const desc1 = document.querySelector('[data-content="project-description-1"]');
  const desc2 = document.querySelector('[data-content="project-description-2"]');
  
  if (desc1 && descParts.length > 0) desc1.textContent = descParts[0];
  if (desc2 && descParts.length > 1) desc2.textContent = descParts[1];
  
  console.log("Contenuti aggiornati con successo");
}

// Funzione principale asincrona per la mappa
async function initializeMap(config, data) {
  try {
    // Crea un elemento container con ID specifico per Leaflet
    const mapId = 'map';
    
    // Verifica se il container esiste già
    let mapContainer = document.getElementById(mapId);
    
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

// Funzione per inizializzare la sezione delle località in evidenza
async function initializeFeaturedLocations(data) {
  try {
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
  } catch (error) {
    console.error('Errore durante l\'inizializzazione delle località in evidenza:', error);
  }
}

// Funzione per generare la sezione "Percorsi narrativi"
function generateStorytellingPaths(data) {
  // Raggruppa gli elementi per valore di storytelling_path
  const pathGroups = {};
  
  // Raccogli solo gli elementi con storytelling_path come stringa non vuota
  data.forEach(item => {
    if (item.storytelling_path && typeof item.storytelling_path === 'string') {
      const pathName = item.storytelling_path;
      
      if (!pathGroups[pathName]) {
        pathGroups[pathName] = [];
      }
      
      pathGroups[pathName].push(item);
    }
  });
  
  // Se non ci sono percorsi narrativi, non mostrare la sezione
  const pathNames = Object.keys(pathGroups);
  if (pathNames.length === 0) return null;
  
  // Crea il container principale
  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
  
  // Aggiungi il titolo della sezione
  const title = document.createElement('h2');
  title.className = 'text-3xl font-bold text-gray-900 mb-8';
  title.textContent = 'Percorsi narrativi';
  container.appendChild(title);
  
  // Crea la griglia per le schede dei percorsi
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  container.appendChild(grid);
  
  // Genera una scheda per ogni gruppo di percorso narrativo
  pathNames.forEach(pathName => {
    const pathItems = pathGroups[pathName];
    
    // Crea la scheda
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 card-hover transition duration-300';
    
    // Aggiungi l'immagine se il primo elemento ha un'immagine
    if (pathItems[0].image_url) {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'h-48 overflow-hidden';
      
      const image = document.createElement('img');
      image.src = pathItems[0].image_url;
      image.alt = pathName;
      image.className = 'w-full h-full object-cover';
      
      imageContainer.appendChild(image);
      card.appendChild(imageContainer);
    }
    
    // Crea il contenuto della scheda
    const content = document.createElement('div');
    content.className = 'p-6';
    
    // Intestazione con nome del percorso e conteggio
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    
    const name = document.createElement('h3');
    name.className = 'text-xl font-bold';
    name.textContent = pathName;
    
    const count = document.createElement('span');
    count.className = 'text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded';
    count.textContent = `${pathItems.length} elementi`;
    
    header.appendChild(name);
    header.appendChild(count);
    content.appendChild(header);
    
    // Descrizione del percorso
    if (pathItems[0].storytelling_path_description) {
      const description = document.createElement('p');
      description.className = 'text-gray-600 mb-4';
      description.textContent = pathItems[0].storytelling_path_description;
      content.appendChild(description);
    }
    
    // Lista di elementi inclusi (max 10)
    const itemsList = document.createElement('div');
    itemsList.className = 'mt-4 mb-4';
    
    const itemsTitle = document.createElement('h4');
    itemsTitle.className = 'text-sm font-medium text-gray-700 mb-2';
    itemsTitle.textContent = 'Elementi inclusi:';
    itemsList.appendChild(itemsTitle);
    
    const itemsContainer = document.createElement('ul');
    itemsContainer.className = 'text-sm text-gray-600 pl-5 list-disc';
    
    // Mostra fino a 10 elementi
    const displayItems = pathItems.slice(0, 10);
    displayItems.forEach(item => {
      const listItem = document.createElement('li');
      listItem.textContent = item.Name || 'Elemento senza nome';
      itemsContainer.appendChild(listItem);
    });
    
    // Se ci sono più di 10 elementi, mostra un indicatore
    if (pathItems.length > 10) {
      const moreItems = document.createElement('li');
      moreItems.className = 'italic';
      moreItems.textContent = `e altri ${pathItems.length - 10} elementi...`;
      itemsContainer.appendChild(moreItems);
    }
    
    itemsList.appendChild(itemsContainer);
    content.appendChild(itemsList);
    
    // Link per esplorare - apre in una nuova pagina
    const link = document.createElement('a');
    link.href = `pages/narrative.html?percorso=${encodeURIComponent(pathName)}`;
    link.rel = 'noopener noreferrer';
    link.className = 'text-indigo-600 font-medium hover:text-indigo-800 inline-flex items-center explore-path-button';
    link.textContent = 'Esplora percorso';
    
    content.appendChild(link);
    card.appendChild(content);
    
    // Aggiungi la scheda alla griglia
    grid.appendChild(card);
  });
  
  return container;
}

// Funzione per inizializzare la sezione dei percorsi narrativi
async function initializeStorytellingPaths(data) {
  try {
      // Trova l'elemento container per i percorsi narrativi
      const pathsContainer = document.getElementById('storytelling-paths-container');
      if (pathsContainer) {
        const pathsSection = generateStorytellingPaths(data);
        if (pathsSection) {
          pathsContainer.appendChild(pathsSection);
          console.log('Sezione "Percorsi narrativi" generata con successo');
        } else {
          console.log('Nessun percorso narrativo trovato nei dati');
        }
      } else {
        console.warn('Container per i percorsi narrativi non trovato (ID: storytelling-paths-container)');
      }
  } catch (error) {
    console.error('Errore durante l\'inizializzazione dei percorsi narrativi:', error);
  }
}

// Funzione per aggiornare i contenuti dinamicamente
document.addEventListener('DOMContentLoaded', async() => {
        const config = await loadConfiguration();
        const data = await parseData();
        initializeMap(config, data);
        updateProjectDescription(config)
        initializeFeaturedLocations(data);
        initializeStorytellingPaths(data);
});