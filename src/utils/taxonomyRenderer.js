export class TaxonomyRenderer {
  renderTaxonomy(container, facetData, facetKey, checkedState) {
    const hierarchy = this._buildHierarchy(facetData);
    this._calculateTotalCounts(hierarchy);
    container.className = 'taxonomy-container max-w-full overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2';
    container.innerHTML = this._createTaxonomyHTML(hierarchy, [], 0, facetKey, checkedState);
    this._addToggleListeners(container);
    this._addCheckboxListeners(container, hierarchy, facetKey);
  }

  _buildHierarchy(facetData) {
    const hierarchy = {};
    if (!Array.isArray(facetData)) return hierarchy;

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
    const calculateTotalCounts = (node) => {
      let totalCount = node.selfCount || 0;
      Object.values(node.children || {}).forEach(child => {
        totalCount += calculateTotalCounts(child);
      });
      node.docCount = totalCount;
      return totalCount;
    };

    Object.values(hierarchy).forEach(node => {
      calculateTotalCounts(node);
    });
  }

  _hasSelectedChild(node, checkedPaths, currentPathArray = []) {
    for (const [key, value] of Object.entries(node)) {
      if (['children', 'docCount', 'selfCount'].includes(key)) continue;

      const fullPath = [...currentPathArray, key].join(' > ');
      if (checkedPaths.includes(fullPath)) return true;

      if (Object.keys(value.children).length > 0) {
        if (this._hasSelectedChild(value.children, checkedPaths, [...currentPathArray, key])) return true;
      }
    }
    return false;
  }

  _createTaxonomyHTML(node, path = [], level = 0, facetKey, checkedState) {
    const checkedPaths = checkedState[facetKey] || [];
    let html = '<div class="space-y-1">';

    Object.entries(node).forEach(([key, value]) => {
      if (['children', 'docCount', 'selfCount'].includes(key)) return;

      const currentPath = [...path, key];
      const fullPath = currentPath.join(' > ');
      const hasChildren = Object.keys(value.children).length > 0;
      const isChecked = checkedPaths.includes(fullPath);
      const hasCheckedChild = hasChildren && this._hasSelectedChild(value.children, checkedPaths, currentPath);
      const shouldExpand = isChecked || hasCheckedChild;
      const indentClass = level > 0 ? `ml-${Math.min(level * 4, 12)}` : '';

      html += `
        <div class="taxonomy-item ${indentClass}">
          <div class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 transition-colors whitespace-nowrap min-w-max">
            ${hasChildren ? 
              `<button class="toggle-btn flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors" data-path="${fullPath}">
                <svg class="w-3 h-3 text-gray-600 transform transition-transform duration-200 ${shouldExpand ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>` : '<div class="w-5 h-5 flex-shrink-0"></div>'}
            <label class="flex items-center gap-2 cursor-pointer flex-grow min-w-0">
              <input type="checkbox" value="${fullPath}" data-facet-type="${facetKey}" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0" ${isChecked ? 'checked' : ''}>
              <span class="text-sm text-gray-700 whitespace-nowrap flex-shrink-0 ${isChecked ? 'font-medium text-blue-700' : ''}">${key}</span>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-auto">${value.docCount}</span>
            </label>
          </div>
          ${hasChildren ? 
            `<div class="children ml-2 ${shouldExpand ? '' : 'hidden'}" data-parent="${fullPath}">
              ${this._createTaxonomyHTML(value.children, currentPath, level + 1, facetKey, checkedState)}
            </div>` : ''}
        </div>`;
    });

    return html + '</div>';
  }

  _getParentPaths(fullPath) {
    const parts = fullPath.split(' > ');
    const parentPaths = [];
    for (let i = 1; i < parts.length; i++) {
      parentPaths.push(parts.slice(0, i).join(' > '));
    }
    return parentPaths;
  }

  _getAllChildPaths(node, currentPath = []) {
    const paths = [];
    Object.entries(node).forEach(([key, value]) => {
      if (['children', 'docCount', 'selfCount'].includes(key)) return;
      const fullPath = [...currentPath, key].join(' > ');
      paths.push(fullPath);
      if (Object.keys(value.children).length > 0) {
        paths.push(...this._getAllChildPaths(value.children, [...currentPath, key]));
      }
    });
    return paths;
  }

  _getChildPathsForNode(hierarchy, fullPath) {
    const parts = fullPath.split(' > ');
    let currentNode = hierarchy;
    for (const part of parts) {
      if (currentNode[part]) {
        currentNode = currentNode[part];
      } else {
        return [];
      }
    }
    return this._getAllChildPaths(currentNode.children, parts);
  }

  _addToggleListeners(container) {
    container.addEventListener('click', (e) => {
      if (e.target.closest('.toggle-btn')) {
        const toggleBtn = e.target.closest('.toggle-btn');
        const path = toggleBtn.dataset.path;
        const childrenContainer = container.querySelector(`[data-parent="${path}"]`);
        const arrow = toggleBtn.querySelector('svg');

        if (childrenContainer && arrow) {
          const isHidden = childrenContainer.classList.contains('hidden');
          childrenContainer.classList.toggle('hidden');
          arrow.classList.toggle('rotate-90', isHidden);
        }
      }
    });
  }

  _addCheckboxListeners(container, hierarchy, facetKey) {
    container._hierarchy = hierarchy;

    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const checkbox = e.target;
        const fullPath = checkbox.value;
        const isChecked = checkbox.checked;
        e.stopPropagation();

        const parentPaths = this._getParentPaths(fullPath) || [];
        const allChildPaths = this._getChildPathsForNode(hierarchy, fullPath) || [];

        // Store the paths that will be affected for event dispatch
        const affectedPaths = [];

        this._updateRelatedCheckboxes(container, hierarchy, fullPath, isChecked, parentPaths, allChildPaths, affectedPaths);

        // Dispatch events for all affected paths
        affectedPaths.forEach(({ path, checked, action }) => {
          const changeEvent = new CustomEvent('taxonomyChange', {
            detail: {
              facetKey,
              path: path,
              checked: checked,
              action: action
            }
          });
          container.dispatchEvent(changeEvent);
        });
      }
    });
  }

  _updateRelatedCheckboxes(container, hierarchy, clickedPath, isChecked, parentPaths, childPaths, affectedPaths = []) {
    // Add the clicked path to affected paths
    affectedPaths.push({
      path: clickedPath,
      checked: isChecked,
      action: isChecked ? 'add' : 'remove'
    });

    if (isChecked) {
      // When checking a child, check all parent paths
      parentPaths?.forEach(parentPath => {
        const parentCheckbox = container.querySelector(`input[value="${parentPath}"]`);
        if (parentCheckbox && !parentCheckbox.checked) {
          parentCheckbox.checked = true;
          this._updateCheckboxVisuals(parentCheckbox, true);
          affectedPaths.push({
            path: parentPath,
            checked: true,
            action: 'add'
          });
        }
      });

      // When checking a parent, check all child paths
      childPaths?.forEach(childPath => {
        const childCheckbox = container.querySelector(`input[value="${childPath}"]`);
        if (childCheckbox && !childCheckbox.checked) {
          childCheckbox.checked = true;
          this._updateCheckboxVisuals(childCheckbox, true);
          affectedPaths.push({
            path: childPath,
            checked: true,
            action: 'add'
          });
        }
      });

    } else {
      // When unchecking a parent, uncheck all child paths
      childPaths?.forEach(childPath => {
        const childCheckbox = container.querySelector(`input[value="${childPath}"]`);
        if (childCheckbox && childCheckbox.checked) {
          childCheckbox.checked = false;
          this._updateCheckboxVisuals(childCheckbox, false);
          affectedPaths.push({
            path: childPath,
            checked: false,
            action: 'remove'
          });
        }
      });

      // When unchecking a child, check if parents should be unchecked
      parentPaths?.forEach(parentPath => {
        const parentCheckbox = container.querySelector(`input[value="${parentPath}"]`);
        if (parentCheckbox && parentCheckbox.checked) {
          const parentChildPaths = this._getChildPathsForNode(hierarchy, parentPath) || [];
          const hasCheckedChildren = parentChildPaths.some(childPath => {
            const childCheckbox = container.querySelector(`input[value="${childPath}"]`);
            return childCheckbox && childCheckbox.checked;
          });
          if (!hasCheckedChildren) {
            parentCheckbox.checked = false;
            this._updateCheckboxVisuals(parentCheckbox, false);
            affectedPaths.push({
              path: parentPath,
              checked: false,
              action: 'remove'
            });
          }
        }
      });
    }

    // Update visuals for the clicked checkbox
    this._updateCheckboxVisuals(container.querySelector(`input[value="${clickedPath}"]`), isChecked);
  }

  _updateCheckboxVisuals(checkbox, isChecked) {
    if (!checkbox) return;

    const label = checkbox.closest('label');
    const textSpan = label?.querySelector('span.text-sm');
    if (textSpan) {
      textSpan.classList.toggle('font-medium', isChecked);
      textSpan.classList.toggle('text-blue-700', isChecked);
    }
  }
}