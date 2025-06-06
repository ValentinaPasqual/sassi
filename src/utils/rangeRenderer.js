// RangeRenderer.js
export class RangeRenderer {
  
  /**
   * Renders a bar chart showing the distribution of values
   * @param {HTMLElement} element - The container element for the chart
   * @param {Array} buckets - Array of value buckets with counts
   * @param {number} minValue - Minimum value in the range
   * @param {number} maxValue - Maximum value in the range
   */
  renderBarChart(element, buckets, minValue, maxValue) {
    // Clear any existing content
    element.innerHTML = '';
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...buckets.map(bucket => bucket.count));
    
    // Create a container for the bars
    const barsContainer = document.createElement('div');
    barsContainer.className = 'flex items-end w-full h-full relative';
    element.appendChild(barsContainer);
    
    // Sort buckets by value to ensure bars are in order
    const sortedBuckets = [...buckets].sort((a, b) => a.value - b.value);
    
    // Create and append bar elements
    sortedBuckets.forEach(bucket => {
      const barHeight = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
      
      const bar = document.createElement('div');
      bar.className = 'flex-1 mx-px';
      bar.style.height = `${barHeight}%`;
      bar.style.backgroundColor = '#b0c4de';
      bar.dataset.value = bucket.value;
      bar.dataset.count = bucket.count;
      bar.title = `Value: ${bucket.value}, Count: ${bucket.count}`;
      
      barsContainer.appendChild(bar);
    });
    
    // Add a selection overlay for highlighting the active range
    const highlightOverlay = document.createElement('div');
    highlightOverlay.className = 'absolute top-0 h-full pointer-events-none';
    highlightOverlay.style.backgroundColor = 'rgba(66, 153, 225, 0.3)';
    highlightOverlay.id = `${element.id}-highlight`;
    element.appendChild(highlightOverlay);
  }

  /**
   * Updates the highlighted section of the chart based on selected range
   * @param {HTMLElement} chartElement - The chart container element
   * @param {Array} buckets - Array of value buckets
   * @param {number} startValue - Start of selected range
   * @param {number} endValue - End of selected range
   */
  updateChartHighlight(chartElement, buckets, startValue, endValue) {
    const highlight = chartElement.querySelector(`#${chartElement.id}-highlight`);
    if (!highlight) return;
    
    const range = buckets[buckets.length - 1].value - buckets[0].value;
    if (range <= 0) return;
    
    // Calculate the left position and width as percentages
    const leftPos = ((startValue - buckets[0].value) / range) * 100;
    const width = ((endValue - startValue) / range) * 100;
    
    highlight.style.left = `${leftPos}%`;
    highlight.style.width = `${width}%`;
  }
}