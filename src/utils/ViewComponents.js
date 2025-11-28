// utils/ViewComponents.js
import { createMapUrlWithFilter } from './urlHelper.js';

/**
 * Componenti UI riutilizzabili per le viste
 */
export class ViewComponents {
  
  /**
   * Crea un badge con conteggio
   */
  static createCountBadge(count, className = '') {
    const badge = document.createElement('span');
    badge.className = `text-secondary-500 bg-secondary-100 px-3 py-1 rounded-full text-sm font-medium ${className}`;
    badge.textContent = count.toString();
    return badge;
  }

  /**
   * Crea un'icona chevron per accordion
   */
  static createChevron(isExpanded = false) {
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', `w-5 h-5 text-slate-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`);
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>';
    return chevron;
  }

  /**
   * Crea il bottone mappa
   */
  static createMapButton(indexKey, filterValue, onClick = null) {
    const button = document.createElement('button');
    button.className = 'p-2 text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 rounded';
    button.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
      </svg>
    `;
    button.onclick = (e) => {
      e.stopPropagation();
      if (onClick) {
        onClick(filterValue);
      } else {
        window.open(createMapUrlWithFilter(indexKey, filterValue), '_blank');
      }
    };
    button.title = `Visualizza sulla mappa`;
    return button;
  }

  /**
   * Crea l'header di un accordion item
   */
  static createAccordionHeader(config) {
    const {
      title,
      subtitle = null,
      description = null,
      count,
      indexKey,
      filterValue,
      onToggle,
      onMapClick,
      isExpanded = false,
      hasExpandableContent = false,
      customClasses = '',
      titleClasses = 'font-semibold text-lg text-primary-900',
      items = []
    } = config;

    const header = document.createElement('div');
    header.className = `flex items-center justify-between p-4 ${hasExpandableContent ? 'cursor-pointer hover:bg-slate-50' : ''} ${customClasses}`;

    // Lato sinistro: titolo, sottotitolo e descrizione
    const left = document.createElement('div');
    left.className = 'flex items-center space-x-4 flex-1 min-w-0';

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1';
    
    info.innerHTML = `
      <div class="${titleClasses}">${title}</div>
      ${subtitle ? `<div class="text-sm text-slate-600">${subtitle}</div>` : ''}
    `;

    left.appendChild(info);

    // Lato destro: badge, chevron (opzionale), bottone mappa
    const right = document.createElement('div');
    right.className = 'flex items-center space-x-3 flex-shrink-0';

    const badge = this.createCountBadge(count);
    const mapButton = this.createMapButton(indexKey, filterValue, onMapClick);

    right.appendChild(badge);
    
    // Aggiungi chevron SOLO se c'è contenuto espandibile
    let chevron = null;
    if (hasExpandableContent) {
      chevron = this.createChevron(isExpanded);
      right.appendChild(chevron);
    }
    
    right.appendChild(mapButton);

    header.appendChild(left);
    header.appendChild(right);

    // Click handler per toggle (solo se c'è contenuto espandibile)
    if (hasExpandableContent) {
      header.onclick = (e) => {
        if (e.target === mapButton || e.target.closest('button') === mapButton) return;
        if (onToggle) onToggle();
      };
    }

    return { header, chevron };
  }

  /**
   * Crea un accordion item completo
   */
  static createAccordionItem(config) {
    const {
      id,
      title,
      subtitle,
      count,
      indexKey,
      filterValue,
      content,
      onToggle,
      onMapClick,
      isExpanded = false,
      customClasses = '',
      titleClasses = 'font-semibold text-lg text-primary-900'
    } = config;

    const container = document.createElement('div');
    container.className = 'border-b border-slate-200 last:border-b-0';

    const { header, chevron } = this.createAccordionHeader({
      title,
      subtitle,
      count,
      indexKey,
      filterValue,
      onMapClick,
      isExpanded,
      customClasses,
      titleClasses,
      onToggle: () => {
        const contentEl = document.getElementById(id);
        if (contentEl && chevron) {
          contentEl.classList.toggle('hidden');
          chevron.classList.toggle('rotate-180');
          if (onToggle) onToggle(id, !contentEl.classList.contains('hidden'));
        }
      }
    });

    const contentWrapper = document.createElement('div');
    contentWrapper.id = id;
    contentWrapper.className = `accordion-content bg-slate-50 ${isExpanded ? '' : 'hidden'}`;
    contentWrapper.appendChild(content);

    container.appendChild(header);
    container.appendChild(contentWrapper);

    return container;
  }

  /**
   * Crea un bottone tab
   */
  static createTabButton(text, icon, isActive, onClick) {
    const button = document.createElement('button');
    button.className = isActive 
      ? 'flex items-center gap-2 w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700'
      : 'flex items-center gap-2 w-full px-3 py-2 text-sm bg-slate-200 text-slate-700 rounded hover:bg-slate-300';
    button.innerHTML = `<span>${icon}</span><span>${text}</span>`;
    button.onclick = onClick;
    return button;
  }

  /**
   * Crea un container vuoto per "nessun risultato"
   */
  static createEmptyState(message = 'Nessun risultato trovato') {
    const wrapper = document.createElement('div');
    wrapper.className = 'bg-white rounded-lg shadow-sm';
    wrapper.innerHTML = `
      <div class="text-center py-8 text-slate-500 p-6">
        <p>${message}</p>
      </div>
    `;
    return wrapper;
  }
}