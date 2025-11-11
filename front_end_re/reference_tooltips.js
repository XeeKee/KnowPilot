/**
 * @file Reference tooltip system for CollabThink articles.
 * 
 * This module provides interactive reference tooltips that display when users
 * hover over reference markers [n] in articles. It implements a sophisticated
 * tooltip system with smooth animations, responsive positioning, and efficient
 * event delegation for optimal performance.
 */

/**
 * Initialize reference tooltip functionality when the DOM is loaded.
 * 
 * Sets up the reference tooltip system by adding necessary CSS styles
 * and initializing event listeners for reference marker interactions.
 * This function establishes the foundation for the tooltip functionality.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add reference styles to document for consistent tooltip appearance
    addReferenceStyles();
    
    // Initialize reference hover tooltips with event delegation
    initReferenceTooltips();
});

/**
 * Add CSS styles for reference markers and tooltips to the document.
 * 
 * Injects comprehensive CSS styles into the document head to ensure
 * consistent tooltip appearance and smooth animations. The styles
 * include responsive design considerations and accessibility features.
 */
function addReferenceStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
    /* Reference marker styles with interactive cursor */
    .reference-marker {
        cursor: pointer;
        color: #0066cc;
        font-weight: normal;
        position: relative;
    }
    
    /* Reference hover tooltip styles with professional appearance */
    .reference-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background-color: #f8f9fa;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        padding: 10px;
        max-width: 400px;
        min-width: 250px;
        word-break: break-word;
        z-index: 1000;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        text-align: left;
        display: none;
    }
    
    .reference-tooltip-title {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .reference-tooltip-content {
        margin-bottom: 5px;
        white-space: normal;
    }
    
    .reference-tooltip-url {
        font-size: 12px;
        color: #0366d6;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    /* Smooth hover tooltip animation for better UX */
    @keyframes tooltipFadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    .reference-tooltip.show {
        display: block;
        animation: tooltipFadeIn 0.2s ease-out forwards;
    }
    `;
    document.head.appendChild(styleEl);
}

/**
 * Initialize reference hover tooltips using event delegation.
 * 
 * Sets up event listeners for mouseover and mouseout events on reference
 * markers. Uses event delegation for optimal performance when dealing
 * with dynamically generated content.
 */
function initReferenceTooltips() {
    // Use event delegation to listen to mouseover events for all reference markers in the document
    document.addEventListener('mouseover', function(e) {
        const target = e.target;
        
        // Check if hovering over reference marker
        if (target.classList.contains('reference-marker')) {
            handleReferenceMouseOver(target);
        }
    });
    
    // Listen to mouseout events for tooltip hiding
    document.addEventListener('mouseout', function(e) {
        const target = e.target;
        
        // Check if moving away from reference marker
        if (target.classList.contains('reference-marker')) {
            handleReferenceMouseOut(target);
        }
    });
}

/**
 * Handle mouseover events on reference markers to display tooltips.
 * 
 * Retrieves reference data, creates or updates tooltip content,
 * and displays the tooltip with smooth animation. This function
 * implements the core tooltip display logic.
 * 
 * @param {HTMLElement} referenceElement - The reference marker element that was hovered
 */
function handleReferenceMouseOver(referenceElement) {
    // Get reference ID from data attribute
    const refId = referenceElement.getAttribute('data-ref-id');
    if (!refId) return;
    
    // Find the chapter containing the reference for context
    const chapterElement = findParentChapter(referenceElement);
    if (!chapterElement) return;
    
    // Get chapter index for data retrieval
    const chapterIndex = chapterElement.getAttribute('data-index');
    if (chapterIndex === null) return;
    
    // Get chapter reference data from global storage or DOM
    const chapterData = window.getChapterData?.(chapterIndex) || {};
    const references = chapterData.references || {};
    const refData = references[refId];
    
    if (!refData || !refData.content) return;
    
    // Create or get hover tooltip element for this reference
    let tooltipEl = referenceElement.querySelector('.reference-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'reference-tooltip';
        referenceElement.appendChild(tooltipEl);
    }
    
    // Build tooltip content with structured information
    let tooltipContent = '';
    
    // Add title if available for better context
    if (refData.title) {
        tooltipContent += `<div class="reference-tooltip-title">${refData.title}</div>`;
    }
    
    // Add content summary with word limit for readability
    let contentPreview = refData.content;
    if (typeof contentPreview === 'string') {
        const words = contentPreview.split(/\s+/);
        if (words.length > 100) {
            contentPreview = words.slice(0, 100).join(' ') + '...';
        }
    }
    tooltipContent += `<div class="reference-tooltip-content">${contentPreview}</div>`;
    
    // Add URL if available for source attribution
    if (refData.url) {
        tooltipContent += `<div class="reference-tooltip-url">${refData.url}</div>`;
    }
    
    tooltipEl.innerHTML = tooltipContent;
    
    // Show hover tooltip with animation
    tooltipEl.classList.add('show');
}

/**
 * Handle mouseout events on reference markers to hide tooltips.
 * 
 * Removes the 'show' class from tooltips when the mouse leaves
 * a reference marker, triggering the hide animation.
 * 
 * @param {HTMLElement} referenceElement - The reference marker element that was left
 */
function handleReferenceMouseOut(referenceElement) {
    const tooltipEl = referenceElement.querySelector('.reference-tooltip');
    if (tooltipEl) {
        tooltipEl.classList.remove('show');
    }
}

/**
 * Find the parent chapter element containing a reference marker.
 * 
 * Traverses up the DOM tree from the reference element to find
 * the nearest ancestor with the 'chapter-item' class. This is
 * used to determine the context for reference data retrieval.
 * 
 * @param {HTMLElement} element - The element to start searching from
 * @returns {HTMLElement|null} The parent chapter element or null if not found
 */
function findParentChapter(element) {
    let current = element;
    
    // Traverse up DOM tree to find chapter element
    while (current && !current.classList.contains('chapter-item')) {
        current = current.parentElement;
    }
    
    return current;
}

/**
 * Helper function to retrieve chapter data for reference tooltips.
 * 
 * Attempts to get chapter data from multiple sources: global storage,
 * DOM data attributes, or fallback to empty object. This function
 * provides a unified interface for accessing chapter reference data.
 * 
 * @param {number} index - The chapter index to retrieve data for
 * @returns {Object} Chapter data object with references and metadata
 */
window.getChapterData = function(index) {
    // Get chapter data from global variable or storage
    // Note: Chapter data needs to be maintained in main application
    if (window.chapterDataStore && window.chapterDataStore[index]) {
        console.log('[getChapterData] return from chapterDataStore:', index, window.chapterDataStore[index]);
        return window.chapterDataStore[index];
    }
    
    // Find chapter element in DOM as fallback
    const chapterElement = document.getElementById(`chapter-${index}`);
    if (chapterElement) {
        // Try to restore reference data from data attribute
        const referencesAttr = chapterElement.getAttribute('data-references');
        if (referencesAttr) {
            try {
                const references = JSON.parse(referencesAttr);
                console.log('[getChapterData] return from data-references attribute:', index, references);
                return {
                    index: index,
                    references: references
                };
            } catch (e) {
                console.error('Failed to parse reference data:', e);
            }
        }
    }
    
    return {};
};

// Initialize global chapter data storage for performance optimization
window.chapterDataStore = window.chapterDataStore || {};

/**
 * Save chapter data to global storage for efficient access.
 * 
 * Stores chapter data in a global object to avoid repeated DOM
 * queries and improve tooltip performance. This function is
 * called by the main application when chapter data is available.
 * 
 * @param {Object} chapterData - Chapter data object with index and references
 */
window.saveChapterData = function(chapterData) {
    if (chapterData && typeof chapterData.index !== 'undefined') {
        window.chapterDataStore[chapterData.index] = chapterData;
    }
};
