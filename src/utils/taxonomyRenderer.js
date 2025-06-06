// taxonomyRenderer.js
export class TaxonomyRenderer {
  
  renderTaxonomy(container, facetData, facetKey, checkedState) {
    // Build hierarchical structure
    const hierarchy = this._buildHierarchy(facetData);
    
    // Calculate counts for all nodes
    this._calculateTotalCounts(hierarchy);
    
    // Add CSS styles if not already added
    this._addTaxonomyStyles();
    
    // Set HTML content
    container.innerHTML = this._createTaxonomyHTML(hierarchy, [], 0, facetKey, checkedState);
    
    // Add event listeners for toggle buttons
    this._addToggleListeners(container);
  }

  _buildHierarchy(facetData) {
    const hierarchy = {};
    
    // First pass: create the hierarchy
    facetData.forEach(bucket => {
      const parts = bucket.key.split(' > ');
      let currentLevel = hierarchy;
      
      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            children: {},
            docCount: 0,
            selfCount: 0
          };
        }
        if (index === parts.length - 1) {
          currentLevel[part].selfCount = bucket.doc_count;
        }
        currentLevel = currentLevel[part].children;
      });
    });
    
    return hierarchy;
  }

  _calculateTotalCounts(hierarchy) {
    // Calculate parent counts by summing children
    const calculateTotalCounts = (node) => {
      let totalCount = node.selfCount || 0;
      
      Object.values(node.children).forEach(child => {
        totalCount += calculateTotalCounts(child);
      });
      
      node.docCount = totalCount;
      return totalCount;
    };

    // Calculate counts for all root nodes
    Object.values(hierarchy).forEach(node => {
      calculateTotalCounts(node);
    });
  }

  _createTaxonomyHTML(node, path = [], level = 0, facetKey, checkedState) {
    let html = `<ul class="taxonomy-list" style="margin-left: ${level * 20}px;">`;
    
    Object.entries(node).forEach(([key, value]) => {
      if (key === 'children' || key === 'docCount' || key === 'selfCount') return;
      
      const currentPath = [...path, key];
      const fullPath = currentPath.join(' > ');
      const hasChildren = Object.keys(value.children).length > 0;
      
      html += `
        <li class="taxonomy-item">
          <div class="taxonomy-row">
            ${hasChildren ? 
              `<span class="toggle-btn" data-path="${fullPath}">▶</span>` : 
              '<span class="toggle-placeholder"></span>'}
            <label>
              <input type="checkbox" 
                     value="${fullPath}" 
                     data-facet-type="${facetKey}"
                     ${checkedState[facetKey]?.includes(fullPath) ? 'checked' : ''}>
              <span>${key} (${value.docCount})</span>
            </label>
          </div>
          ${hasChildren ? 
            `<div class="children" data-parent="${fullPath}" style="display: none;">
              ${this._createTaxonomyHTML(value.children, currentPath, level + 1, facetKey, checkedState)}
            </div>` : 
            ''}
        </li>
      `;
    });
    
    return html + '</ul>';
  }

  _addTaxonomyStyles() {
    // Check if styles already exist
    if (document.getElementById('taxonomy-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'taxonomy-styles';
    styleElement.textContent = `
      .taxonomy-list {
        list-style: none;
        padding: 0;
      }
      .taxonomy-item {
        margin: 5px 0;
      }
      .taxonomy-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .toggle-btn {
        cursor: pointer;
        width: 20px;
        user-select: none;
      }
      .toggle-placeholder {
        width: 20px;
      }
      .children {
        margin-left: 20px;
      }
    `;
    document.head.appendChild(styleElement);
  }

  _addToggleListeners(container) {
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('toggle-btn')) {
        const path = e.target.dataset.path;
        const childrenContainer = container.querySelector(`[data-parent="${path}"]`);
        if (childrenContainer) {
          const isHidden = childrenContainer.style.display === 'none';
          childrenContainer.style.display = isHidden ? 'block' : 'none';
          e.target.textContent = isHidden ? '▼' : '▶';
        }
      }
    });
  }
}