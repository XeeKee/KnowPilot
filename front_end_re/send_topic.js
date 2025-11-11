/**
 * JavaScript file for sending topics to backend
 */

    // Global position
window.currentPos = -1;  // current active record position
window.sessionUuid = null;  // current session UUID
window.currentTopic = "";  // current topic text

/**
 * initialize the global position manager
 */
async function initializeGlobalPosManager() {
    try {
        const response = await fetch('/api/session/current_pos', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                window.currentPos = data.current_pos;
                window.sessionUuid = data.session_uuid;
                console.log(`Global pos manager initialized: pos=${window.currentPos}, session=${window.sessionUuid}`);
            }
        }
    } catch (error) {
        console.warn('Failed to initialize global pos manager:', error);
    }
}

function getCurrentPos() {
    return window.currentPos !== undefined ? window.currentPos : 0;
}

async function setCurrentPos(pos) {
    try {
        const response = await fetch('/api/session/current_pos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ pos: pos })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                window.currentPos = pos;
                console.log(`Global currentPos updated to ${pos}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.warn('Error setting current position:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    
    initializeGlobalPosManager();
    // Get DOM elements
    const chatInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.send-button');
    const chatMessages = document.querySelector('.chat-messages');
    const sidebarNav = document.querySelector('.sidebar-nav');
    const outlineDataInput = document.getElementById('outlineData');

    // Add button state management
    let activeButtonType = null;
    const exampleBlocks = document.querySelectorAll('.example-block[data-type]');

    // Initialize button click events
    exampleBlocks.forEach(block => {
        block.addEventListener('click', function() {
            const buttonType = this.dataset.type;
            
            // Special handling for excel-report button: directly trigger preset content generation
            if (buttonType === 'excel-report') {
                // Add click animation effect
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 600);
                
                generateExcelReportDemo();
                return;
            }
            
            // Special handling for occasional-research button: directly trigger oceanographic research demo
            if (buttonType === 'occasional-research') {
                // Add click animation effect
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 600);
                
                generateOceanographicResearchDemo();
                return;
            }
            
            // Special handling for research-homework button: directly trigger industrial report demo
            if (buttonType === 'research-homework') {
                // Add click animation effect
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 600);
                
                generateIndustrialReportDemo();
                return;
            }
            
            // If clicking the currently active button, deactivate it
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                activeButtonType = null;
            } else {
                // Deactivate other buttons
                exampleBlocks.forEach(b => b.classList.remove('active'));
                // Activate current button
                this.classList.add('active');
                activeButtonType = buttonType;
            }
        });
    });

    // Function to send topic to backend
    function sendTopicToBackend() {
        // Get user input topic
        const topicText = chatInput.value.trim();

        // Check if topic is empty
        if (!topicText) {
            return;
        }
        
        // Save to a global variable for other JS files
        window.currentTopic = topicText;

        // Clear the existing article container when starting a new task
        if (typeof window.clearArticleContainer === 'function') {
            const cleared = window.clearArticleContainer();
            if (cleared) {
                console.log('已清空之前的文章容器，开始新任务');
            }
        }

        // Show loading state
        showOutlineLoadingState();
        sendButton.disabled = true;

        // Select prompt type based on button state
        let promptType = 'default';
        if (activeButtonType) {
            switch(activeButtonType) {
                case 'occasional-research':
                    promptType = 'occasional_research';
                    break;
                case 'excel-report':
                    promptType = 'excel_report';
                    break;
                case 'research-homework':
                    promptType = 'research_homework';
                    break;
            }
        }

        // Create request data
        const requestData = {
            type: 'generate_outline',
            prompt: topicText,
            prompt_type: promptType
        };

        // Send POST request to backend
        fetch('/api/generate/outlines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestData)
        })
            .then(async response => {
                if (!response.ok) {
                    
                    const fallbackBody = {
                        topic: topicText,
                        outline: `# ${topicText}\n\n- 引言\n- 要点1\n- 要点2\n- 结论`
                    };
                    const fb = await fetch('/api/generate/demooutline', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(fallbackBody)
                    });
                    if (!fb.ok) {
                        throw new Error('Outline generation failed');
                    }
                    return fb.text();
                }
                return response.text();
            })
            .then(async data => {
                // Print received data to console
                console.log('Data received from backend:', data);

                await initializeGlobalPosManager();
                
                window.skipSaveOutlineToHistory = true;
                
                // Display outline in sidebar
                displayOutlineInSidebar(data);
                
                if (window.autoExpandSidebar) {
                    window.autoExpandSidebar();
                }
                
                // Clear input box
                chatInput.value = '';
                
                updateSendButtonState();
            })
            .catch(error => {
                console.error('Failed to send topic:', error);
            })
            .finally(() => {
                // Hide loading state and restore button state
                hideOutlineLoadingState();
                sendButton.disabled = false;
            });
    }

    // Show outline generation loading state
    function showOutlineLoadingState(message = 'Generating outline, please wait...', autoHideDelay = null) {
        // Check if loading indicator already exists
        let loadingIndicator = document.querySelector('.outline-loading');
        if (loadingIndicator) {
            // If exists, just update message if needed
            const msgP = loadingIndicator.querySelector('.loading-content p');
            if (msgP && message) {
                msgP.textContent = message;
            }
            // Reset auto hide timer if needed
            if (autoHideDelay !== null) {
                clearTimeout(loadingIndicator._autoHideTimer);
                loadingIndicator._autoHideTimer = setTimeout(hideOutlineLoadingState, autoHideDelay);
            }
            return;
        }

        // Create loading indicator
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'outline-loading';
        loadingIndicator.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .outline-loading {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            }
            .loading-content {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #4a6ee0;
                border-radius: 50%;
                margin: 0 auto 15px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(loadingIndicator);

        // Auto hide if delay provided
        if (autoHideDelay !== null) {
            loadingIndicator._autoHideTimer = setTimeout(hideOutlineLoadingState, autoHideDelay);
        }
    }

    // Hide outline generation loading state
    function hideOutlineLoadingState() {
        const loadingIndicator = document.querySelector('.outline-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    // Helper function to remove outline numbering prefixes
    function removeOutlineNumbering(outlineText) {
        if (!outlineText || typeof outlineText !== 'string') {
            return outlineText;
        }

        return outlineText.split('\n').map(line => {
            // Skip empty lines
            if (!line.trim()) {
                return line;
            }

            // Match lines that start with # (markdown headers)
            const headerMatch = line.match(/^(#+)\s*(.*)$/);
            if (headerMatch) {
                const hashmarks = headerMatch[1];
                let content = headerMatch[2].trim();
                
                if (isIntroductoryStatement(content)) {
                    return ''; 
                }
                
                content = removeBoldWrapper(content);
                
                // Remove various numbering patterns:
                // 1. Chinese numbering: 一、二、三、四、五、六、七、八、九、十、 etc.
                content = content.replace(/^[一二三四五六七八九十]+[、。]\s+/, '');
                
                // 2. Roman numerals: I、II、III、IV、V、VI、VII、VIII、IX、X、 etc.
                content = content.replace(/^[IVXLCDM]+[、。]\s+/, '');
                
                // 3. Arabic numerals with various separators: 1、1. 1) (1) [1] 
                content = content.replace(/^[\(\（]?\d+[\)\）\.\、\]\s]+/, '');
                
                // 4. Hierarchical numbering: 1.1、1.1.1、1.2.3.4、 etc.
                content = content.replace(/^\d+(\.\d+)*[、。\.\s]+/, '');
                
                // 5. Alphabetical numbering: A、B、C、 a、b、c、 etc.
                content = content.replace(/^[A-Za-z][、。\.\)\s]+/, '');
                
                // 6. Mixed patterns with parentheses: (1)、（一）、[A]、 etc.
                content = content.replace(/^[\(\（\[]([一二三四五六七八九十]|[IVXLCDM]+|\d+|[A-Za-z])[\)\）\]][、。\s]+/, '');
                
                if (!content.trim()) {
                    return '';
                }
                
                return `${hashmarks} ${content.trim()}`;
            }
            
            // For non-header lines, also check for introductory statements
            let cleanedLine = line.trim();
            
            if (isIntroductoryStatement(cleanedLine)) {
                return ''; 
            }
            
            cleanedLine = removeBoldWrapper(cleanedLine);
            
            // Remove the same patterns for non-header lines
            cleanedLine = cleanedLine.replace(/^[一二三四五六七八九十]+[、。]\s+/, '');
            cleanedLine = cleanedLine.replace(/^[IVXLCDM]+[、。]\s+/, '');
            cleanedLine = cleanedLine.replace(/^[\(\（]?\d+[\)\）\.\、\]\s]+/, '');
            cleanedLine = cleanedLine.replace(/^\d+(\.\d+)*[、。\.\s]+/, '');
            cleanedLine = cleanedLine.replace(/^[A-Za-z][、。\.\)\s]+/, '');
            cleanedLine = cleanedLine.replace(/^[\(\（\[]([一二三四五六七八九十]|[IVXLCDM]+|\d+|[A-Za-z])[\)\）\]][、。\s]+/, '');
            
            return cleanedLine;
        }).filter(line => line.trim() !== '').join('\n'); 
    }
    /**
    * Check if it is an introductory sentence
    * @param {string} content - The text content to be checked
    * @returns {boolean} - Returns true if it is an introductory sentence 
    */
    function isIntroductoryStatement(content) {
        if (!content || typeof content !== 'string') {
            return false;
        }
        
        const trimmedContent = content.trim();
        
        if (trimmedContent.startsWith('以下')) {
            return true;
        }
        
        if (trimmedContent.endsWith('：') || trimmedContent.endsWith(':')) {
            return true;
        }
        
        const introPatterns = [
            /^以下是.*$/,
            /^下面是.*$/,
            /^现将.*如下.*$/,
            /^具体.*如下.*$/,
            /^详细.*如下.*$/,
            /.*提纲.*如下.*：?$/,
            /.*大纲.*如下.*：?$/,
            /.*框架.*如下.*：?$/,
            /.*内容.*如下.*：?$/
        ];
        
        return introPatterns.some(pattern => pattern.test(trimmedContent));
    }

    /**
    * Remove the ** ** wrapping from the text
    * @param {string} content - The text to be processed
    * @returns {string} - The content after removing the wrapping 
    */
    function removeBoldWrapper(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }
        
        return content.replace(/^\*\*(.*)\*\*$/, '$1').trim();
    }

    // Helper function to generate hierarchical numbering
    function generateHierarchicalNumbering(outlineLines) {
        const numbering = [];
        const counters = [0, 0, 0, 0, 0, 0]; // Support up to 6 levels
        
        outlineLines.forEach(line => {
            const match = line.match(/^(#+)\s*(.+)$/);
            if (match) {
                const level = match[1].length;
                
                // Reset deeper level counters (levels deeper than current level)
                for (let i = level; i < counters.length; i++) {
                    counters[i] = 0;
                }
                
                // Increment current level counter
                counters[level - 1]++;
                
                // Generate number string
                let numberStr = '';
                for (let i = 0; i < level; i++) {
                    if (counters[i] > 0) {
                        numberStr += (numberStr ? '.' : '') + counters[i];
                    }
                }
                
                numbering.push(numberStr);
            }
        });
        
        return numbering;
    }
    
    // Helper function to check if an item has children
    function hasChildrenItems(outlineLines, currentIndex, currentLevel) {
        for (let i = currentIndex + 1; i < outlineLines.length; i++) {
            const match = outlineLines[i].match(/^(#+)\s*(.+)$/);
            if (match) {
                const level = match[1].length;
                if (level > currentLevel) {
                    return true;
                } else if (level <= currentLevel) {
                    break;
                }
            }
        }
        return false;
    }
    
    // Initialize toggle functionality
    function initToggleFunctionality() {
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        
        // Remove existing event listeners first to avoid duplicates
        toggleButtons.forEach(button => {
            // Clone the button to remove all event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // Re-query after replacement
        const newToggleButtons = document.querySelectorAll('.toggle-btn');
        
        newToggleButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                
                // Skip if this button has no children
                if (this.classList.contains('no-children')) {
                    return;
                }
                
                const index = parseInt(this.dataset.index);
                const outlineBlocks = document.querySelectorAll('.outline-block');
                const currentBlock = outlineBlocks[index];
                const currentLevel = parseInt(currentBlock.dataset.level);
                
                const isCollapsed = this.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // Expand: show children
                    this.textContent = '▼';
                    this.classList.remove('collapsed');
                    showChildren(outlineBlocks, index, currentLevel);
                } else {
                    // Collapse: hide children
                    this.textContent = '▶';
                    this.classList.add('collapsed');
                    hideChildren(outlineBlocks, index, currentLevel);
                }
            });
        });
    }
    
    // Helper function to hide children
    function hideChildren(outlineBlocks, parentIndex, parentLevel) {
        for (let i = parentIndex + 1; i < outlineBlocks.length; i++) {
            const block = outlineBlocks[i];
            const level = parseInt(block.dataset.level);
            
            if (level > parentLevel) {
                block.classList.add('collapsed');
            } else {
                break;
            }
        }
    }
    
    // Helper function to show children
    function showChildren(outlineBlocks, parentIndex, parentLevel) {
        for (let i = parentIndex + 1; i < outlineBlocks.length; i++) {
            const block = outlineBlocks[i];
            const level = parseInt(block.dataset.level);
            
            if (level > parentLevel) {
                // Only show direct children, not grandchildren if their parent is collapsed
                if (level === parentLevel + 1) {
                    block.classList.remove('collapsed');
                } else {
                    // Check if any parent between this item and the original parent is collapsed
                    let shouldShow = true;
                    for (let j = i - 1; j > parentIndex; j--) {
                        const parentBlock = outlineBlocks[j];
                        const parentBlockLevel = parseInt(parentBlock.dataset.level);
                        if (parentBlockLevel < level && parentBlockLevel > parentLevel) {
                            const toggleBtn = parentBlock.querySelector('.toggle-btn');
                            if (toggleBtn && toggleBtn.classList.contains('collapsed')) {
                                shouldShow = false;
                                break;
                            }
                        }
                    }
                    if (shouldShow) {
                        block.classList.remove('collapsed');
                    }
                }
            } else {
                break;
            }
        }
    }

    // Function to display outline in sidebar
    
    function displayOutlineInSidebar(outlineContent) {
        // Clear existing content but keep New Task, Private Library, OUTLINES title bar and divider
        while (sidebarNav.children.length > 4) {
            sidebarNav.removeChild(sidebarNav.lastChild);
        }

        // Parse outline lines
        const outlineLines = outlineContent.split('\n').filter(line => /^#+\s/.test(line));

        // If no outline format lines found, display original content
        if (outlineLines.length === 0) {
            const item = document.createElement('li');
            item.textContent = outlineContent.substring(0, 100) + (outlineContent.length > 100 ? '...' : '');
            sidebarNav.appendChild(item);
            return;
        }

        // Add outline operation buttons to title bar
        const sidebarBrand = sidebarNav.querySelector('.sidebar-brand');

        // Check if toolbar already exists, remove if it does
        let existingToolbar = document.querySelector('.outline-toolbar');
        if (existingToolbar) {
            existingToolbar.remove();
        }

        // Create toolbar as a separate row
        const outlineToolbar = document.createElement('li');
        outlineToolbar.className = 'outline-toolbar-container';
        outlineToolbar.innerHTML = `
            <div class="outline-toolbar">
                <button class="add-block-btn" title="Add new outline item">ADD</button>
                <button class="sort-outline-btn" title="Enable/disable drag sorting">SORT</button>
                <button class="modify-outline-btn" title="Modify outline">AI</button>
                <button class="generate-article-btn" title="Generate article button">GENERATE</button>
            </div>
        `;

        // Add toolbar after the divider
        sidebarNav.insertBefore(outlineToolbar, sidebarNav.children[4]);

        // Create outline container
        const outlineContainer = document.createElement('ul');
        outlineContainer.className = 'outline-container';
        sidebarNav.appendChild(outlineContainer);

        // Generate hierarchical numbering
        const numbering = generateHierarchicalNumbering(outlineLines);
        
        // Iterate through outline lines and add to sidebar
        outlineLines.forEach((line, index) => {
            const match = line.match(/^(#+)\s*(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2];
                const levelNumber = numbering[index];

                const outlineBlock = document.createElement('li');
                outlineBlock.className = 'outline-block';
                outlineBlock.dataset.level = level;
                outlineBlock.dataset.index = index;
                outlineBlock.style.paddingLeft = ((level - 1) * 10) + 'px';

                // Check if this item has children
                const hasChildren = hasChildrenItems(outlineLines, index, level);
                
                // Create outline item content with toggle button and level number
                outlineBlock.innerHTML = `
                    <div class="outline-item">
                        <span class="toggle-btn ${hasChildren ? '' : 'no-children'}" data-index="${index}">${hasChildren ? '▼' : ''}</span>
                        <span class="level-number">${levelNumber}</span>
                        <span class="block-content" title="${text}">${text}</span>
                        <div class="outline-actions">
                            <button class="edit-btn" title="Edit">✎</button>
                            <button class="delete-btn" title="Delete">×</button>
                        </div>
                    </div>
                `;

                // Add click event to scroll to corresponding article title
                outlineBlock.addEventListener('click', function (event) {
                    // Exclude clicks on edit, delete buttons and toggle button
                    if (event.target.classList.contains('edit-btn') ||
                        event.target.classList.contains('delete-btn') ||
                        event.target.classList.contains('toggle-btn')) {
                        return;
                    }

                    // If global scroll function is available, call it
                    if (window.scrollToArticleTitle) {
                        const titleText = this.querySelector('.block-content').textContent;
                        window.scrollToArticleTitle(titleText);
                    }
                });

                outlineContainer.appendChild(outlineBlock);
            }
        });
        
        // Add toggle functionality
        initToggleFunctionality();

        // Initialize outline interaction features
        initOutlineInteractions();

        // Update outline data
        updateOutlineData();

        // Save outline to history - we'll skip this for demo content since it's handled by the API
        if (!window.skipSaveOutlineToHistory) {
            saveOutlineToHistory(outlineContent);
        }
        // Reset flag for next time
        window.skipSaveOutlineToHistory = false;
    }

    
    //window.displayOutlineInSidebar = displayOutlineInSidebar;

    // Event handler function for outline container clicks
    function handleOutlineContainerClick(e) {
        if (e.target.classList.contains('edit-btn')) {
            e.stopPropagation();
            const outlineBlock = e.target.closest('.outline-block');
            const currentText = outlineBlock.querySelector('.block-content').textContent;
            const currentLevel = parseInt(outlineBlock.dataset.level);

            showEditDialog(currentText, currentLevel, function (newText, newLevel) {
                outlineBlock.querySelector('.block-content').textContent = newText;
                outlineBlock.querySelector('.block-content').title = newText;
                outlineBlock.dataset.level = newLevel;
                outlineBlock.style.paddingLeft = ((newLevel - 1) * 10) + 'px';

                // Re-calculate and update numbering for all items
                refreshOutlineNumbering();

                // Update outline data
                updateOutlineData();
            });
        } else if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation();
            const outlineBlock = e.target.closest('.outline-block');
            outlineBlock.remove();

            // Re-calculate and update numbering for all remaining items
            refreshOutlineNumbering();

            // Update outline data
            updateOutlineData();
        } else if (e.target.closest('.outline-block') && 
                  !e.target.classList.contains('edit-btn') &&
                  !e.target.classList.contains('delete-btn') &&
                  !e.target.classList.contains('toggle-btn')) {
            // Handle outline block click for scrolling to article title
            const outlineBlock = e.target.closest('.outline-block');
            if (window.scrollToArticleTitle) {
                const titleText = outlineBlock.querySelector('.block-content').textContent;
                window.scrollToArticleTitle(titleText);
            }
        }
    }

    // Initialize outline interaction features
    function initOutlineInteractions() {
        // Initialize drag sorting functionality
        let sortingEnabled = false;
        const sortButton = document.querySelector('.sort-outline-btn');
        const outlineContainer = document.querySelector('.outline-container');

        // Add button click event
        sortButton.addEventListener('click', function () {
            sortingEnabled = !sortingEnabled;

            if (sortingEnabled) {
                // Enable sorting mode
                this.textContent = 'STOP';
                this.style.backgroundColor = '#f39c12';
                outlineContainer.classList.add('sortable-mode');

                // Add sorting functionality
                outlineContainer.setAttribute('draggable', true);
                const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');

                outlineBlocks.forEach(block => {
                    block.setAttribute('draggable', true);

                    // Add drag start event
                    block.addEventListener('dragstart', function (e) {
                        e.dataTransfer.setData('text/plain', '');
                        this.classList.add('dragging');
                    });

                    // Add drag end event
                    block.addEventListener('dragend', function (e) {
                        this.classList.remove('dragging');
                    });

                    // Add dragover event
                    block.addEventListener('dragover', function (e) {
                        e.preventDefault();
                        const draggingElement = outlineContainer.querySelector('.dragging');
                        const afterElement = getDragAfterElement(outlineContainer, e.clientY);

                        if (afterElement == null) {
                            outlineContainer.appendChild(draggingElement);
                        } else {
                            outlineContainer.insertBefore(draggingElement, afterElement);
                    }
                });
            });

                showSortingFeedback('Drag sorting enabled - drag items to reorder', true);

            } else {
                // Disable sorting mode
                    this.textContent = 'SORT';
                this.style.backgroundColor = '';
                outlineContainer.classList.remove('sortable-mode');

                // Remove sorting functionality
                const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');
                outlineBlocks.forEach(block => {
                    block.removeAttribute('draggable');
                    // Remove dragging class if exists
                    block.classList.remove('dragging');
                });

                showSortingFeedback('Drag sorting disabled', false);

                // Re-calculate and update numbering after sorting
                refreshOutlineNumbering();

                // Update outline data after sorting
                updateOutlineData();
            }

            // Get element after which dragged element should be inserted
            function getDragAfterElement(container, y) {
                const draggableElements = [...container.querySelectorAll('.outline-block:not(.dragging)')];

                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;

                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            }

            // Show sorting feedback
            function showSortingFeedback(message, isEnabled) {
                // Remove existing feedback
                const existingFeedback = document.querySelector('.sorting-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }

                const feedback = document.createElement('div');
                feedback.className = 'sorting-feedback';
                feedback.style.cssText = `
                    position: fixed;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: ${isEnabled ? '#2ecc71' : '#95a5a6'};
                    color: white;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    z-index: 3000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                feedback.textContent = message;
                document.body.appendChild(feedback);

                // Show animation
                setTimeout(() => {
                    feedback.style.opacity = '1';
                }, 10);

                // Remove after 3 seconds
                setTimeout(() => {
                    feedback.style.opacity = '0';
                    setTimeout(() => {
                        if (feedback.parentNode) {
                            feedback.parentNode.removeChild(feedback);
                        }
                    }, 300);
                }, 3000);
            }
        });

        // Add button click events
        const addButton = document.querySelector('.add-block-btn');
        const modifyButton = document.querySelector('.modify-outline-btn');

        addButton.addEventListener('click', function () {
            showEditDialog('', 1, function (text, level) {
                // Create new outline block
                const outlineContainer = document.querySelector('.outline-container');
                
                // Get current outline lines to calculate proper numbering
                const currentOutlineBlocks = document.querySelectorAll('.outline-block');
                const outlineLines = [];
                
                // Convert existing blocks to outline lines format for numbering calculation
                currentOutlineBlocks.forEach(block => {
                    const blockLevel = parseInt(block.dataset.level);
                    const blockText = block.querySelector('.block-content').textContent;
                    const hashmarks = '#'.repeat(blockLevel);
                    outlineLines.push(`${hashmarks} ${blockText}`);
                });
                
                // Add the new item to the lines for numbering calculation
                const hashmarks = '#'.repeat(level);
                outlineLines.push(`${hashmarks} ${text}`);
                
                // Generate numbering for all items including the new one
                const numbering = generateHierarchicalNumbering(outlineLines);
                const newItemNumber = numbering[numbering.length - 1];
                
                // Create the new outline block
                const outlineBlock = document.createElement('li');
                outlineBlock.className = 'outline-block';
                outlineBlock.dataset.level = level;
                outlineBlock.dataset.index = currentOutlineBlocks.length;
                outlineBlock.style.paddingLeft = ((level - 1) * 10) + 'px';

                // The new item won't have children initially, so no toggle button needed
                outlineBlock.innerHTML = `
                    <div class="outline-item">
                        <span class="toggle-btn no-children" data-index="${currentOutlineBlocks.length}"></span>
                        <span class="level-number">${newItemNumber}</span>
                        <span class="block-content" title="${text}">${text}</span>
                        <div class="outline-actions">
                            <button class="edit-btn" title="Edit">✎</button>
                            <button class="delete-btn" title="Delete">×</button>
                        </div>
                    </div>
                `;

                outlineContainer.appendChild(outlineBlock);

                // Re-calculate and update numbering for all existing items
                refreshOutlineNumbering();

                // Update outline data
                updateOutlineData();
            });
        });

        modifyButton.addEventListener('click', function () {
                showModifyOutlineDialog();
            });

        // Add edit and delete events using event delegation
        const outlineContainerForEvents = document.querySelector('.outline-container');
        
        // Remove existing delegated event listeners (if any)
        outlineContainerForEvents.removeEventListener('click', handleOutlineContainerClick);
        
        // Add new delegated event listener
        outlineContainerForEvents.addEventListener('click', handleOutlineContainerClick);
    }

    // Show edit dialog
    function showEditDialog(text, level, callback) {
        // Check if dialog already exists, remove if it does
        const existingDialog = document.getElementById('outlineEditDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create dialog element
        const dialog = document.createElement('div');
        dialog.id = 'outlineEditDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(33, 37, 41, 0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
            backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        `;
        
        dialog.innerHTML = `
            <div style="
                background: #ffffff;
                border-radius: 12px;
                padding: 28px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f1f3f4;
                ">
                    <h3 style="
                        margin: 0;
                        color: #212529;
                        font-size: 20px;
                        font-weight: 600;
                        letter-spacing: -0.025em;
                    ">${text ? 'Edit Outline Item' : 'Add Outline Item'}</h3>
                    <button onclick="document.getElementById('outlineEditDialog').remove()" style="
                        background: none;
                        border: none;
                        color: #6c757d;
                        cursor: pointer;
                        font-size: 24px;
                        padding: 4px;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">×</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label for="itemText" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                    ">Content:</label>
                    <input type="text" id="itemText" value="${text}" placeholder="Enter outline content" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 14px;
                        font-family: inherit;
                        box-sizing: border-box;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 28px;">
                    <label for="itemLevel" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                    ">Level:</label>
                    <select id="itemLevel" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 14px;
                        font-family: inherit;
                        background-color: white;
                        cursor: pointer;
                        outline: none;
                    ">
                        <option value="1" ${level === 1 ? 'selected' : ''}>Level 1 (Main Topic)</option>
                        <option value="2" ${level === 2 ? 'selected' : ''}>Level 2 (Subtitle)</option>
                        <option value="3" ${level === 3 ? 'selected' : ''}>Level 3 (Sub-subtitle)</option>
                        <option value="4" ${level === 4 ? 'selected' : ''}>Level 4 (Detail)</option>
                    </select>
                </div>
                
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                ">
                    <button 
                        id="cancelEdit" 
                        style="
                            padding: 10px 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.backgroundColor='#5a6268'"
                        onmouseout="this.style.backgroundColor='#6c757d'"
                    >Cancel</button>
                    <button 
                        id="confirmEdit" 
                        style="
                            padding: 10px 20px;
                            background: #495057;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.backgroundColor='#343a40'"
                        onmouseout="this.style.backgroundColor='#495057'"
                    >Confirm</button>
                </div>
            </div>
        `;

        // Add custom styles for scrollbar and input focus
        if (!document.getElementById('outline-edit-dialog-style')) {
            const style = document.createElement('style');
            style.id = 'outline-edit-dialog-style';
            style.textContent = `
                #itemText:focus, #itemLevel:focus {
                    border-color: #adb5bd !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                
                /* Custom scrollbar styles */
                #outlineEditDialog > div {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
                }
                
                #outlineEditDialog > div::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                #outlineEditDialog > div::-webkit-scrollbar-track {
                    background: transparent;
                    margin: 10px 0;
                }
                
                #outlineEditDialog > div::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                    border: 2px solid transparent;
                }
                
                #outlineEditDialog > div::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(0, 0, 0, 0.3);
                }
            `;
            document.head.appendChild(style);
        }

        // Add dialog to document
        document.body.appendChild(dialog);

        // Focus input
        const textInput = document.getElementById('itemText');
        textInput.focus();
        textInput.select();

        // Bind button events
        document.getElementById('cancelEdit').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('confirmEdit').addEventListener('click', () => {
            const newText = document.getElementById('itemText').value.trim();
            const newLevel = parseInt(document.getElementById('itemLevel').value);

            if (newText) {
                callback(newText, newLevel);
                dialog.remove();
            } else {
                // Use nicer notification instead of default alert
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #f8d7da;
                    color: #721c24;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 14px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    z-index: 3100;
                `;
                notification.textContent = 'Please enter content';
                dialog.appendChild(notification);
                
                // Remove after 2 seconds
                setTimeout(() => notification.remove(), 2000);
            }
        });

        // Press Enter to confirm
        textInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const newText = document.getElementById('itemText').value.trim();
                const newLevel = parseInt(document.getElementById('itemLevel').value);

                if (newText) {
                    callback(newText, newLevel);
                    dialog.remove();
                }
            }
        });
    }

    // Show modify outline dialog
    function showModifyOutlineDialog() {
        const currentOutline = getCurrentOutlineText();
        if (!currentOutline) {
            // Use nicer notification instead of default alert
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #f8d7da;
                color: #721c24;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 3100;
            `;
            notification.textContent = 'Please generate an outline first';
            document.body.appendChild(notification);
            
            // Remove after 2 seconds
            setTimeout(() => notification.remove(), 2000);
            return;
        }

        // Check if dialog already exists, remove if it does
        const existingDialog = document.getElementById('modifyOutlineDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create dialog element
        const dialog = document.createElement('div');
        dialog.id = 'modifyOutlineDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(33, 37, 41, 0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
            backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        `;
        
        dialog.innerHTML = `
            <div style="
                background: #ffffff;
                border-radius: 12px;
                padding: 28px;
                max-width: 580px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f1f3f4;
                ">
                    <h3 style="
                        margin: 0;
                        color: #212529;
                        font-size: 20px;
                        font-weight: 600;
                        letter-spacing: -0.025em;
                    ">Modify Outline</h3>
                    <button onclick="document.getElementById('modifyOutlineDialog').remove()" style="
                        background: none;
                        border: none;
                        color: #6c757d;
                        cursor: pointer;
                        font-size: 24px;
                        padding: 4px;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">×</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                    ">Current Outline:</label>
                    <div id="currentOutline" style="
                        background: #f8f9fa;
                        padding: 12px 16px;
                        border-radius: 8px;
                        border: 1px solid #e9ecef;
                        max-height: 200px;
                        overflow-y: auto;
                        white-space: pre-line;
                        font-family: monospace;
                        font-size: 14px;
                        color: #495057;
                        line-height: 1.5;
                    ">${currentOutline}</div>
                </div>
                
                <div style="margin-bottom: 28px;">
                    <label for="modifyFeedback" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                    ">Please enter your modification suggestions:</label>
                    <textarea id="modifyFeedback" 
                        placeholder="For example: Move the second chapter before the first chapter, or add a chapter about practical applications..." 
                        style="
                            width: 100%;
                            min-height: 100px;
                            padding: 12px 16px;
                            border: 1px solid #ced4da;
                            border-radius: 8px;
                            font-size: 14px;
                            font-family: inherit;
                            line-height: 1.5;
                            resize: vertical;
                            box-sizing: border-box;
                            outline: none;
                        "
                    ></textarea>
                </div>
                
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                ">
                    <button 
                        id="cancelModify" 
                        style="
                            padding: 10px 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.backgroundColor='#5a6268'"
                        onmouseout="this.style.backgroundColor='#6c757d'"
                    >Cancel</button>
                    <button 
                        id="confirmModify" 
                        style="
                            padding: 10px 20px;
                            background: #495057;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.backgroundColor='#343a40'"
                        onmouseout="this.style.backgroundColor='#495057'"
                    >Send Modification</button>
                </div>
            </div>
        `;

        // Add custom styles for scrollbar and textarea focus
        if (!document.getElementById('modify-outline-dialog-style')) {
            const style = document.createElement('style');
            style.id = 'modify-outline-dialog-style';
            style.textContent = `
                #modifyFeedback:focus {
                    border-color: #adb5bd !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                
                /* Custom scrollbar styles */
                #modifyOutlineDialog > div,
                #currentOutline {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
                }
                
                #modifyOutlineDialog > div::-webkit-scrollbar,
                #currentOutline::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                #modifyOutlineDialog > div::-webkit-scrollbar-track,
                #currentOutline::-webkit-scrollbar-track {
                    background: transparent;
                    margin: 10px 0;
                }
                
                #modifyOutlineDialog > div::-webkit-scrollbar-thumb,
                #currentOutline::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                    border: 2px solid transparent;
                }
                
                #modifyOutlineDialog > div::-webkit-scrollbar-thumb:hover,
                #currentOutline::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(0, 0, 0, 0.3);
                }
            `;
            document.head.appendChild(style);
        }

        // Add dialog to document
        document.body.appendChild(dialog);

        // Focus text area
        const feedbackTextarea = document.getElementById('modifyFeedback');
        feedbackTextarea.focus();

        // Bind button events
        document.getElementById('cancelModify').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('confirmModify').addEventListener('click', () => {
            const feedback = document.getElementById('modifyFeedback').value.trim();
            if (!feedback) {
                // Use nicer notification instead of default alert
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #f8d7da;
                    color: #721c24;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 14px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    z-index: 3100;
                `;
                notification.textContent = 'Please enter modification suggestions';
                dialog.appendChild(notification);
                
                // Remove after 2 seconds
                setTimeout(() => notification.remove(), 2000);
                return;
            }

            // Call outline modification function
            modifyOutlineWithFeedback(currentOutline, feedback);
            dialog.remove();
        });

        // Ctrl+Enter shortcut to send
        feedbackTextarea.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                const feedback = document.getElementById('modifyFeedback').value.trim();
                if (feedback) {
                    modifyOutlineWithFeedback(currentOutline, feedback);
                    dialog.remove();
                }
            }
        });
    }

    // Get current outline text
    function getCurrentOutlineText() {
        const outlineBlocks = document.querySelectorAll('.outline-block');
        if (outlineBlocks.length === 0) {
            return null;
        }

        const outlineData = Array.from(outlineBlocks).map(block => {
            const level = parseInt(block.dataset.level) || 1;
            const text = block.querySelector('.block-content').textContent;
            return `${'#'.repeat(level)} ${text}`;
        }).join('\n');

        return outlineData;
    }

    // Send outline modification request to backend
    function modifyOutlineWithFeedback(currentOutline, feedback) {
        console.log('Sending outline modification request:', { currentOutline, feedback });

        // Show loading state
        showOutlineLoadingState('Modifying outline, please wait...');
        
        // Create request data
        const requestData = {
            type: 'polish_outline',           
            prompt: currentOutline,
            feedback: feedback,
            title: 'Polished Outline',
            pos: getCurrentPos()  // 使用当前位置
        };

        // Send POST request to backend
        fetch('/api/generate/outlines', {         
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                console.log('Received modified outline:', data);

                // Remove loading state
                hideOutlineLoadingState();

                // Clean the outline data by removing numbering prefixes
                const cleanedData = removeOutlineNumbering(data);
                console.log('Cleaned outline data:', cleanedData);

                // Update sidebar to display modified outline
                displayOutlineInSidebar(cleanedData);

                // Show success message
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Outline modification completed!', 'success');
                } else {
                    showSuccessFeedback('Outline modification completed!');
                }
            })
            .catch(error => {
                console.error('Failed to modify outline:', error);

                // Remove loading state
                hideOutlineLoadingState();

                if (typeof window.showNotification === 'function') {
                    window.showNotification('Failed to modify outline, please try again', 'error');
                } else {
                    alert('Failed to modify outline, please try again');
                }
            });
    }

    // Show success feedback
    function showSuccessFeedback(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
        } else {
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #4CAF50;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                z-index: 2000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            feedback.textContent = message;
            document.body.appendChild(feedback);

            // Show animation
            setTimeout(() => {
                feedback.style.opacity = '1';
            }, 10);

            // Remove after 3 seconds
            setTimeout(() => {
                feedback.style.opacity = '0';
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.parentNode.removeChild(feedback);
                    }
                }, 300);
            }, 3000);
        }
    }

    // Refresh outline numbering for all items
    function refreshOutlineNumbering() {
        const outlineBlocks = document.querySelectorAll('.outline-block');
        const outlineLines = [];
        
        // Convert existing blocks to outline lines format for numbering calculation
        outlineBlocks.forEach(block => {
            const level = parseInt(block.dataset.level);
            const text = block.querySelector('.block-content').textContent;
            const hashmarks = '#'.repeat(level);
            outlineLines.push(`${hashmarks} ${text}`);
        });
        
        // Generate new numbering
        const numbering = generateHierarchicalNumbering(outlineLines);
        
        // Update each block's numbering and check for children
        outlineBlocks.forEach((block, index) => {
            const levelNumberSpan = block.querySelector('.level-number');
            if (levelNumberSpan) {
                levelNumberSpan.textContent = numbering[index];
            }
            
            // Update index attribute
            block.dataset.index = index;
            
            // Check if this item has children and update toggle button
            const currentLevel = parseInt(block.dataset.level);
            const hasChildren = hasChildrenFromBlocks(outlineBlocks, index, currentLevel);
            const toggleBtn = block.querySelector('.toggle-btn');
            
            if (toggleBtn) {
                toggleBtn.dataset.index = index;
                if (hasChildren) {
                    toggleBtn.classList.remove('no-children');
                    if (!toggleBtn.classList.contains('collapsed')) {
                        toggleBtn.textContent = '▼';
                    }
                } else {
                    toggleBtn.classList.add('no-children');
                    toggleBtn.textContent = '';
                }
            }
        });
        
        // Re-initialize toggle functionality for all toggle buttons (including newly added ones)
        initToggleFunctionality();
    }
    
    // Helper function to check if an item has children (for blocks, not lines)
    function hasChildrenFromBlocks(outlineBlocks, currentIndex, currentLevel) {
        for (let i = currentIndex + 1; i < outlineBlocks.length; i++) {
            const level = parseInt(outlineBlocks[i].dataset.level);
            if (level > currentLevel) {
                return true;
            } else if (level <= currentLevel) {
                break;
            }
        }
        return false;
    }

    // Update outline data
    function updateOutlineData() {
        const outlineBlocks = document.querySelectorAll('.outline-block');
        const outlineData = Array.from(outlineBlocks).map(block => {
            const level = parseInt(block.dataset.level) || 1;
            const text = block.querySelector('.block-content').textContent;
            return `${'#'.repeat(level)} ${text}`;
        }).join('\n');

        // Save updated outline data to hidden input
        console.log('Outline updated:', outlineData);
        if (outlineDataInput) {
            outlineDataInput.value = outlineData;
            console.log('Hidden input updated, current value:', outlineDataInput.value);
        } else {
            console.error('outlineDataInput element not found, cannot update outline data');
        }

        // Immediately save to history only when not skipping (avoid double-save after generation)
        if (!window.skipSaveOutlineToHistory) {
            saveOutlineToHistory(outlineData);
        }
    }

    // Save outline to history (using session-based API)
    async function saveOutlineToHistory(outlineData) {
        if (!outlineData || outlineData.trim() === '') {
            console.log('Outline data is empty, skipping save');
            return;
        }

        try {
            const response = await fetch('/api/session/outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    outline_content: outlineData,
                    pos: getCurrentPos()  
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Outline saved to current session position successfully:', result);
            } else {
                console.error('Failed to save outline to session:', response.statusText);
            }
        } catch (error) {
            console.error('Error saving outline to session:', error);
        }
    }

    // Upload preset Excel data to private library
    async function uploadPresetExcelData() {
        try {
            console.log('📄 Loading preset Excel data...');
            
            // Preset Jiangsu Super League Excel data content
            const presetExcelContent = `[Excel File: Jiangsu Super League.xlsx]

JiangSu Super League					
Team	Matches Played	Wins	Losses	Ties	Points
yancheng	5	4	1	0	13
nantong	4	4	0	0	12
xuzhou	5	3	2	0	11
nanjing	5	3	1	1	10
lianyungang	5	2	1	2	7
suzhou	4	1	3	0	6
suqian	5	1	2	2	5
huaian	4	1	1	2	4
wuxi	4	1	1	2	4
yangzhou	4	1	1	2	4
taizhou	5	1	1	3	4
zhenjiang	5	1	0	4	3
changzhou	5	0	0	5	0

`;

            console.log('📝 Preset Excel content length:', presetExcelContent.length);
            console.log('📝 Content preview:', presetExcelContent.substring(0, 200) + '...');
            
            // Prepare data to send to backend
            const processedFile = {
                name: 'Jiangsu Super League.xlsx',
                content: presetExcelContent,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: presetExcelContent.length * 2, // Estimate file size
                extractedLength: presetExcelContent.length,
                originalSize: presetExcelContent.length * 2
            };
            
            // Send to backend (using private_library.js logic)
            await sendExcelToBackend([processedFile]);
            
            console.log('✅ Preset Excel data successfully uploaded to private library');
            
        } catch (error) {
            console.error('❌ Failed to upload preset Excel data:', error);
            throw error;
        }
    }

    // Upload preset oceanographic research data to private library
    async function uploadPresetOceanographicData() {
        try {
            console.log('🌊 Loading preset oceanographic research data...');
            
            // Preset oceanographic research Word document content
            const presetOceanContent = `[Word Document: Marine Shallow Gas Hydrate Accumulation Systems.docx]

Natural gas hydrates (hereinafter referred to as "hydrate") are cage-like ice-crystal structures formed under specific temperature and pressure conditions, consisting of water and small-molecule gases such as methane and ethane. They mainly occur in permafrost and continental slope sediments [1–3]. As a potential clean energy source and an important component of the global carbon cycle, hydrates have attracted significant attention worldwide due to their environmentally friendly characteristics and vast reserves. It is expected that they will soon enter the stage of industrial development [4–5].
Based on their occurrence position and actual state within the seabed or sediment layers, marine hydrates are classified into two major types: those primarily buried in middle to deep-sea sediment layers and those exposed at the seafloor or within shallow sediment layers. The former are generally known as "mid-deep hydrates," while the latter are referred to as "shallow hydrates." Shallow hydrates form under low-temperature, high-pressure, and high-methane flux conditions and are typically distributed either above the seafloor or within 100 meters below it (often exposed at the seafloor). These hydrates are generally controlled by subsurface fluid migration systems and commonly develop near sediment-water interfaces in tectonically active regions. Their upper boundaries often lie in transitional zones between stable and unstable states, making them highly sensitive to tectonic activity, sea-level changes, and even tidal stress. Therefore, this type of hydrate not only represents a potential source of submarine geological hazards but also has significant potential impacts on the global marine environment and climate change.
Currently, compared to the relatively well-studied mid-deep hydrates, shallow hydrates face numerous challenges in exploration, evaluation, extraction, and scientific research. First, research on the formation mechanisms, global distribution, and basic physical properties of shallow hydrates remains insufficient, lacking systematic theoretical support and empirical data. Second, existing exploration technology systems were mainly developed for mid-deep hydrates, resulting in significant shortcomings in identifying, characterizing, and assessing shallow hydrate reservoirs. Thus, specialized technological systems need to be developed. Additionally, extraction technologies for shallow hydrates are still in their infancy, facing technical implementation difficulties and safety concerns, along with inadequate assessment of their potential environmental and ecological impacts. Associated cold seep systems further complicate ecological conservation efforts and impose higher adaptability requirements on exploration and extraction equipment. In terms of comprehensive research, limited interdisciplinary collaboration, deficiencies in data acquisition and monitoring technologies, high economic costs, incomplete policy frameworks, and limited international cooperation and knowledge sharing further constrain the sustainable development and utilization of shallow hydrates. To address these issues, it is urgently necessary to strengthen fundamental research, develop dedicated technologies, improve regulatory policies, promote international cooperation, and enhance environmental protection measures to facilitate effective utilization of shallow natural gas hydrate resources. This paper systematically introduces the characteristics of the accumulation system of marine shallow hydrates, discusses their key role as an important unit in the marine carbon cycle, and highlights their significance in the industrialization process of hydrate exploitation, aiming to raise public awareness and interest.

1 Composition and Characteristics of Accumulation Systems
1.1 Geological Processes
Compared to mid-deep hydrates, shallow hydrates are less common in marine environments and are currently found only in areas with strong methane seepage activities on the seafloor [6–7]. This may be because the concentration of methane in shallow sediments is insufficient; some shallow hydrates are believed to result from dissociated hydrates at deeper levels that generate higher methane fluxes. At the same time, free methane gas, in the absence of stable geological sealing and physical isolation layers, typically cannot remain beneath the seafloor and eventually migrates upward into shallow sediment layers or escapes entirely from the seafloor, forming gas plumes [8]. Therefore, the geological conditions required for the formation of marine shallow hydrates are much more stringent than those for mid-deep hydrates.
Generally, shallow hydrates are controlled by faulting or fractures formed under tectonic forces and fluid overpressure migration pathways [9]. Fault structures provide both migration channels for hydrocarbon-rich fluids and storage space for shallow hydrates [10]. Therefore, shallow hydrates tend to form within vein-like channels and fracture fissures rather than uniformly within pores. Their accumulation on the seafloor can form ore bodies composed entirely of hydrates or mounds containing hydrate components. Hydrate aggregates are more likely to form large-scale blocks and be exposed on the seafloor surface. For example, in the Manila Trench area, fluid upward migration caused by plate compression creates favorable conditions for the formation of shallow hydrates. Deep free gas migrates through imbricate thrust faults into shallow marine layers and crystallizes into hydrates (Fig. 1a). However, the limited distribution of bottom simulating reflectors (BSR) in the northern region indicates insufficient methane supply, leading easily to geological structures like gas chimneys [11]; in contrast, normal faults in the southern region serve as primary fluid migration pathways, with relatively continuous BSR distribution (Fig. 1b). Overall, the accumulation processes of shallow hydrates in both the southern and northern parts of the Manila Trench are influenced by deep-sea geological activities, but differences exist in how normal and thrust faults drive deep fluid migration into shallow layers to form hydrates. These differences might affect and alter the enrichment processes of shallow hydrates, representing an important direction for future research on the geological processes involved in shallow hydrate accumulation.
On the other hand, certain geological processes inhibit the decomposition of surface hydrates and help in the accumulation of shallow hydrates. First, cold seep carbonate rocks formed within the seafloor and shallow sediments can act as effective cap layers for associated gases (free gas), thereby forming shallow hydrates within the gas hydrate stability zone (GHSZ) beneath them. Simultaneously, once solid hydrate layers form, they can enhance gas containment. For instance, in the Gulf of Mexico, thin layers of cold seep carbonate host abundant hydrates precisely because the sealing effect of these carbonates allows deep-sourced methane fluids to nucleate and accumulate there [12]; similarly, in the Nile Deep Sea Fan of the Eastern Mediterranean, methane gas bubbles sourced from depth escape only through cracks in carbonate crusts, allowing more methane to nucleate and accumulate beneath the crusts as hydrates [13]. Without these crusts, methane fluids could freely form hydrates in suitable temperature-pressure bottom waters, but due to their lower density compared to seawater, these hydrates would float upward into the upper water column and re-dissociate, failing to accumulate. In situ observations also confirm this view, showing that methane bubbles escaping from the seafloor carry hydrate crusts [13]. Hence, carbonate crusts play a promoting role in the accumulation of shallow hydrates and serve as an important indicator for exploring shallow hydrates [14].
1.2 Gas Sources
The formation of shallow hydrates is highly dependent on hydrocarbon gases, especially the accumulation of light hydrocarbons such as methane. According to current global research progress, the mechanisms of hydrate formation mainly include the dissolution of methane, maintaining its supersaturated state, and the nucleation and growth of hydrate crystals. In the nucleation and growth process of shallow hydrates, a high flux of gas supply must exist beneath the hydrate to ensure continuous methane input, thereby maintaining its supersaturated state. Only when the dissolved methane concentration reaches supersaturation and its flow rate exceeds the critical threshold of diffusive transport can hydrates stably form under suitable temperature and pressure conditions [15]. In particular, the presence of high-flux gas not only promotes continuous methane supply but also enhances the formation rate and stability of hydrate nuclei, thus maintaining the continuous generation of hydrate reservoirs in dynamic environments. These research advances have deepened our understanding of the hydrate formation process and provided scientific foundations for the development of hydrate resources and the assessment of their potential environmental impacts. Therefore, sufficient and high-flux supply of methane and other hydrocarbon gases, along with a comprehensive understanding of their accumulation mechanisms, are key prerequisites for the formation of shallow hydrates.
Based on current research progress, the gas source characteristics of three basic types of hydrate reservoirs can be briefly described as follows:
(1) In situ microbial origin: Microbial methane is primarily formed through carbon dioxide reduction and acetate fermentation:
CO₂ + 4H₂ → CH₄ + 2H₂O (carbon dioxide reduction)
CH₃COOH + 4H₂ → CH₄ + CO₂ (acetate fermentation)
The amount of methane produced by the former depends on the supply of dissolved H₂, while the latter is limited by the quantity of acetate. Since methane gas is generated from the in situ degradation of organic matter in sediments by microorganisms, the volume of gas production depends on the content of organic matter in the sediment. The hydrates in the Blake Ridge area of the western Atlantic are typical examples of in situ microbial origin. Other typical cases include the Ulleung Basin in South Korea, the offshore areas of northern California, Oregon, the Nankai Trough in Japan, the Sea of Okhotsk, and the Black Sea [16–17].
(2) Deep thermal cracking origin: Methane of this type is formed when kerogen undergoes pyrolysis at temperatures exceeding 120°C. During this process, carbon isotope fractionation is minimal. Therefore, its carbon isotope composition is relatively close to that of organic matter in the sediment. Due to production temperature limitations, pyrolytic methane originates from deeper strata. Investigations have shown that hydrates in the Gulf of Mexico, the Caspian Sea, the Mallik area in Canada, the Joetsu Basin in Japan, and the Barents Sea in the Arctic are predominantly composed of thermally cracked methane [16].
(3) Mantle-derived abiotic origin: Volcanic magmatic eruptions are the main abiotic sources of methane. Near submarine volcanoes, methane hydrate content is usually very high and often occurs in ice-like forms or more commonly cemented with volcanic ash and fine sand, allowing coexistence with volcanic ash or volcanic sand [18]. In the newly formed ultraslow-spreading ocean basins of the Arctic, mantle-derived abiotic methane is produced when ultramafic basement rocks undergo high-temperature (>200°C) serpentinization [19]. Currently, typical mantle-derived abiotic methane hydrates discovered through surveys are mostly located in open ocean areas, such as the Mariana Trench forearc, the Fram Strait in the North Atlantic, and the Lost City hydrothermal field on the Mid-Atlantic Ridge [20–22].
In fact, modern high-precision isotope investigations have revealed that the vast majority of marine hydrates (including shallow hydrates) do not originate from a single gas source but rather represent mixed results of multiple basic gas sources. For example, hydrates in the Gulf of Mexico contain both thermally cracked and microbially derived methane. As research has progressed, the gas sources of hydrates in the Shenhu area of the South China Sea were initially believed to be microbially derived but were later corrected to mixed origins [23].
In summary, the sources of hydrocarbon gases such as methane that form marine hydrates can be summarized into three categories. In nature, the gas sources for hydrate formation are still primarily the first two types, especially their mixture, which typically characterizes the gas sources of shallow hydrates. Additionally, the continuous supply of bottom high-flux methane gas is crucial for hydrate accumulation, further emphasizing the important role of multi-source gas supply in shallow hydrate systems.

1.3 Migration Pathways
The accumulation process of marine shallow hydrates is influenced not only by static factors such as temperature, pressure conditions, sedimentation rates, and organic matter content but also significantly impacted by dynamic factors such as fluid migration. In this dynamic migration process, large-scale structures such as faults, fractures, and diapirs play decisive roles in the accumulation of shallow natural gas hydrates.
Under normal circumstances, methane gas from deep within the Earth forms overpressured fluids under the compaction of sediments or tectonic compression and migrates upward through large-scale structural channels such as faults and fractures. These structural pathways not only provide efficient vertical migration routes for methane gas but also determine the locations where gas accumulates in shallow layers, ultimately forming enriched hydrate reservoirs within the GHSZ.
Gas-bearing fluids from deep hydrocarbon source rocks migrate vertically through features such as diapirs, paleo-uplifts, faults, and fractures, then move laterally along unconformity surfaces, and finally accumulate in local structural traps, forming conventional oil and gas reservoirs [24]. Based on this, deep thermogenic gas continues to migrate vertically through deep conduits, mixing with shallow in situ biogenic gas to form mid-deep hydrates. However, deep fluid seepage and abnormal heat flow values often lead to local imbalances in the GHSZ, causing mid-deep hydrates to decompose. As these hydrates dissociate and release large amounts of methane, pore fluid pressure continuously increases until it breaks through the sealing of overlying rock layers or pre-existing hydrate cap layers, entering the shallow structural conduit system for vertical migration. Eventually, this may result in the formation of shallow hydrates in shallower sediments or on the seafloor surface, simultaneously supporting the development of cold seep systems on the seabed.
Due to the widespread existence of shallow hydrates in accretionary wedges of active continental margins and sedimentary basins of passive continental margins [25], these regions' strong tectonic activities provide unique accommodation space and favorable conditions for shallow hydrate accumulation [10]. These activities can drive deep free gas to migrate toward the seafloor through faults and fractures, filling geological units affected by intense tectonic activity to form hydrate aggregates. Specifically, in the accretionary wedges of active continental margin subduction zones or tectonically active areas, the sediment porosity is relatively high, making them favorable reservoir spaces for shallow hydrates. Therefore, shallow hydrates are often filled near these high-porosity sediments associated with faults or fractures; in contrast, in passive continental margins, under the combined influence of plastic materials within thick sediment layers, overpressured fluids, and volcanic activity, high-flux free gas can rapidly migrate into shallow sediment basins [25]. Thus, the accumulation of shallow hydrates in passive continental margins is comprehensively influenced by multiple factors such as organic matter content, gas production rate, geothermal gradient, and sedimentation rate. At the same time, methane gas migration in passive continental margins is also controlled by structural elements such as faults and fractures, eventually accumulating into reservoirs within structural units like mud volcanoes or diapirs in sedimentary basins (Fig. 2). Overall, whether in active or passive continental margins, faulting, fracturing, or coarse-grained sediments with larger porosities are essential factors for the formation of shallow hydrates.
Currently, in areas with high methane flux, hydrate-forming gases can form superimposed structures of shallow and mid-deep hydrates in space under the joint action of diffusion and leakage mechanisms [26]. We refer to this as the "composite accumulation model" [27]. This composite hydrate reservoir provides new targets and technical challenges for marine hydrate development. However, due to the unclear operational rules of the system, especially the lack of in-depth studies on the role of structural elements such as faults, fractures, and diapirs in guiding fluid migration, revealing the interaction mechanisms between the diffusion and leakage systems will become an important research direction with significant innovative value.
1.4 Reservoir Characteristics
In addition to the generation and migration of hydrocarbon fluids, which have a significant impact on the accumulation of shallow hydrates, the lithological characteristics and geological structural conditions of the GHSZ also play an important role in the enrichment process of shallow hydrates.
As mentioned earlier, the formation of shallow hydrates requires sufficient accommodation space. In sandy sediments, the saturation of hydrates can reach 79%–100%, while in silty sediments it ranges from 15% to 40%, and in clay sediments, it is only 2%–6% [28–29]. Typically, hydrates mainly fill the pores of sandy particles, whereas mud-rich sediments such as silt and clay generally do not contain hydrates or contain them in low amounts. This is because coarse-grained sediments not only increase the pore space for hydrate enrichment but also, when unconsolidated, have better permeability, making them more conducive to gas diffusion and migration. Therefore, shallow hydrates tend to form in loosely packed coarse-grained sediments with high porosity.
Reservoirs near the seafloor or within shallow sediments possess unique characteristics: On one hand, hydrates are mainly distributed in deep-water environments on continental slopes where sediment grain sizes are generally finer. However, these locations often feature turbidite fans, slope fans, contour currents, and channels, which, due to their higher sedimentation rates, coarser grains, and higher organic carbon content, are actually more favorable for the accumulation of shallow hydrates [30]. On the other hand, the sedimentary structures in these environments also positively influence the accumulation of shallow hydrates. The presence of abundant foraminifera in shallow seafloor sediments not only increases inter-particle pore spaces but also provides intra-particle pores, sometimes larger than inter-particle pores, thereby offering more space for hydrate enrichment. Therefore, compared to mid-deep sediments, shallow sediments provide more favorable reservoir conditions.
Moreover, the tectonic framework's control over shallow hydrate reservoirs cannot be ignored. Fault geometry and sealing capacity jointly affect the accumulation of shallow hydrates. Lei et al. [30] suggest that faulting or fractures, mud volcanoes, diapirs, and submarine landslides are closely related to hydrates. Under the influence of fluid potential energy, gases migrate through sediment pores and micro-fracture systems and accumulate at the base of the GHSZ to form hydrate deposits. Previous studies have classified the structures associated with shallow hydrate accumulation into three types based on reservoir characteristics and formation mechanisms [31]: (1) Overpressure-related structures associated with gas and fluid accumulation, migration, and release, such as leakage, pockmarks, and gas chimneys; (2) Diapiric structures resulting from differential plastic deformation of rock layers, such as mud diapirs and salt diapirs; (3) Fractures caused by gravity and tectonic stresses, such as landslides, polygonal faults, and structural faults (Fig. 2). Correspondingly, these different types of geological structures exert important controls on hydrate accumulation at smaller scales. For example, gas chimneys act as pathways for overpressured fluid release, transporting large amounts of gas into the shallow GHSZ to form hydrate deposits. Some escaping gases lead to the formation of cold seep vents, pockmarks, mound-like structures, and carbonate mounds near the seafloor, altering the seabed micro-topography and supporting the development of cold seep biological communities [32]. These shallow biological ecosystems and geological structures collectively influence the accumulation of shallow hydrates, which in turn affect these structures, forming a relatively dynamic equilibrium system of shallow hydrates.
1.5 Global Distribution
Although hydrates have been discovered in almost all major ocean regions globally, more than 90% of them are mid-deep hydrates, with shallow hydrates comprising a small proportion. Currently, known shallow hydrates are mainly distributed in the Gulf of Mexico, the Sea of Japan (Joetsu Basin and Ulleung Basin), the Barents Sea, the Sea of Okhotsk, the northern South China Sea (including the southwestern Taiwan Basin, Dongsha area, and Qiongdongnan area), and the Krishna-Godavari Basin in India. Investigations have shown that the specific formation mechanisms of shallow hydrates in these different regions vary.
For example, in the Gulf of Mexico, faulting, salt diapirs, and minor seepage are important factors for the formation of shallow hydrates. This region features numerous hydrate mounds, with hydrates filling pore fractures in shallow marine sediments in blocky, vein-like, and nodular forms. The bottom water temperature in this region is relatively higher compared to other shallow hydrate areas, and the gas source type is primarily thermogenic gas with secondary microbial gas [12, 33–34]. In contrast, in the Joetsu Basin of the Sea of Japan, the relationship between seafloor mounds, pockmarks, and hydrates is close, with mature hydrate mounds developing. Shallow hydrates fill pore fractures in these mounds in blocky, nodular, and lens-like forms, with a typical thermogenic gas source [35–37]. Different from the Joetsu Basin, the shallow hydrates found in the Ulleung Basin are filled in pore fractures in blocky and dispersed forms, with a microbial gas source [28, 38–40]. The Barents Sea also features typical seafloor mounds, with shallow hydrates occurring as blocky, vein-like, and disseminated crystals in fine-grained sediments, primarily sourced from thermogenic gas [41–44]. Notably, the Håkon Mosby mud volcano in the Barents Sea is currently the most typical example of a mud volcano-type shallow hydrate, with gas migration primarily through mud volcanoes. Shallow hydrates near the seafloor appear as white to grayish-white veins and rounded masses filling fissures, with a mixed gas source of thermogenic and microbial origins [45–46].
In recent years, drilling in the Dongsha area of the South China Sea has revealed all known types of shallow hydrate occurrences [26]; the Qiongdongnan Cold Seep possesses key indicators necessary for shallow hydrate exploration, including pockmarks, gas chimneys, methane plumes, and cold seep carbonates [47]. Although the discovered shallow hydrates in the entire South China Sea generally exhibit unique geological characteristics and accumulation environments, they are still influenced by factors such as gas source composition, migration pathways, and reservoir conditions, which are common in mid-deep hydrates and even oil and gas systems. Different regions of shallow hydrates may share similar tectonic environments and depositional processes. Therefore, conducting multidisciplinary, multi-domain, and systematic research on the accumulation of shallow hydrates in the South China Sea will help further understand the general accumulation rules of this type of hydrate.

`;

            console.log('🌊 Preset ocean content length:', presetOceanContent.length);
            console.log('🌊 Content preview:', presetOceanContent.substring(0, 200) + '...');
            
            // Prepare data to send to backend
            const processedFile = {
                name: 'xenophyophore.docx',
                content: presetOceanContent,
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: presetOceanContent.length * 2, // Estimate file size
                extractedLength: presetOceanContent.length,
                originalSize: presetOceanContent.length * 2
            };
            
            // Send to backend (using private_library.js logic)
            await sendExcelToBackend([processedFile]);
            
            console.log('✅ Preset oceanographic data successfully uploaded to private library');
            
        } catch (error) {
            console.error('❌ Failed to upload preset oceanographic data:', error);
            throw error;
        }
    }
    
    
    // Send Excel data to backend (based on private_library.js logic)
    async function sendExcelToBackend(processedFiles) {
        const payload = {
            type: 'private_information',
            files: processedFiles,
            timestamp: new Date().toISOString()
        };
        
        try {
            const response = await fetch('/api/upload_private_files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error('Network request failed: ' + response.status);
            }
            
            const result = await response.json();
            console.log('Files uploaded successfully:', result);
            
            return result;
            
        } catch (error) {
            console.error('Failed to send files to backend:', error);
            throw error;
        }
        }

    // Upload preset industrial PDF data to private library
    async function uploadPresetIndustrialData() {
        try {
            console.log('🏭 Loading preset industrial report data...');
            
            // Preset industrial report PDF document content
            const presetIndustrialContent = `[PDF Document: kimia_farma.pdf]
STRATEGI HULU-HILIR KIMIA FARMA 
Pendahuluan 
PT Kimia Farma Tbk (KAEF) sebagai produsen obat milik pemerintah 
merupakan salah satu produsen obat yang paling serius dalam menyongsong era 
sistem jaminan sosial nasional (SJSN) yang diusung oleh Badan Penyelenggara 
Jaminan Sosial (BPJS). Dalam persiapannya menyonsong era SJSN-BPJS, PT 
Kimia Farma banyak melakukan pergerakan untuk meningkatkan daya saing 
perusahan agar dapat memenangkan persaingan dari produsen obat lainnya.  
PT Kimia Farma banyak berbenah diri untuk melakukan inovasi dan 
termasuk transformasi bisnis agar tidak kalah bersaing. Oleh karena itu, Kimia 
Farma bertekad mengembangkan bisnisnya dari hulu sampai hilir. Artinya, lini 
bisnis Kimia Farma tidak hanya sebatas memproduksi obat semata tetapi 
berkaitan dengan distribusi dan pelayanan kesehatan dan obat-obatan. 
Dalam strategi hulu-hilirnya untuk menghadapi BPJS, Kimia Farma telah 
mengembangkan beberapa anak perusahan. Kimia Farma melakukan peningkatan 
produksi obat generik dalam usahanya untuk menghadapi era SJSN-BPJS yang 
diperkirakan akan meningkatkan kebutuhan terhadap obat generik hingga tiga kali 
lipat. Hal inilah yang menyebabkan banyak produsen obat dalam negeri maupun 
asing ramai-ramai memproduksi dan meningkatkan kapasitas produksi obat 
generik, termasuk Kimia Farma. 
Era SJSN-BPJS tidak hanya berbicara bagaimana kebutuhan obat dapat 
dipenuhi oleh produsen obat, tetapi juga berbicara bagaimana pemerataan obat
obatan itu dapat dilakukan hingga pelosok negeri. Hal ini menjadi peluang untuk 
anak perusahaan Kimia Farma, yaitu PT Kimia Farma Trading and Distribution 
untuk melakukan pemerataan distribusi obat yang akan memasarkan obat-obatan, 
baik produk dari Kimia Farma maupun produk dari pihak prinsipal. Dengan 
begitu luasnya wilayah Indonesia, akan menjadi tantangan sekaligus peluang PT 
Kimia Farma Trading and Distribution untuk meningkatkan pendapatan 
perusahaan. 
ANGGI PRAMITA 
1 
Profil Perusahaan 
Kimia Farma adalah perusahaan industri farmasi pertama di Indonesia yang 
didirikan oleh Pemerintah Hindia Belanda tahun 1817. Nama perusahaan ini pada 
awalnya adalah NV Chemicalien Handle Rathkamp & Co. Berdasarkan 
kebijaksanaan nasionalisasi atas bekas perusahaan Belanda di masa awal 
kemerdekaan, pada tahun 1958, Pemerintah Republik Indonesia melakukan 
peleburan sejumlah perusahaan farmasi menjadi PNF (Perusahaan Negara 
Farmasi) Bhinneka Kimia Farma. Kemudian pada tanggal 16 Agustus 1971, 
bentuk badan hukum PNF diubah menjadi Perseroan Terbatas, sehingga nama 
perusahaan berubah menjadi PT Kimia Farma (Persero). 
Pada tanggal 4 Juli 2001, PT Kimia Farma (Persero) kembali mengubah 
statusnya menjadi perusahaan publik, PT Kimia Farma (Persero) Tbk, dalam 
penulisan berikutnya disebut Perseroan. Bersamaan dengan perubahan tersebut, 
Perseroan telah dicatatkan pada Bursa Efek Jakarta dan Bursa Efek Surabaya 
(sekarang kedua bursa telah merger dan kini bernama Bursa Efek Indonesia). 
Berbekal pengalaman selama puluhan tahun, Perseroan telah berkembang menjadi 
perusahaan dengan pelayanan kesehatan terintegrasi di Indonesia. Perseroan kian 
diperhitungkan kiprahnya dalam pengembangan dan pembangunan bangsa, 
khususnya pembangunan kesehatan masyarakat Indonesia.  
Visi dari perusahaan ini adalah menjadi korporasi bidang kesehatan 
terintegrasi dan mampu menghasilkan pertumbuhan nilai yang berkesinambungan 
melalui konfigurasi dan koordinasi bisnis yang sinergis. Hal ini dituangkan dalam 
misi perusahaan antara lain: menghasilkan pertumbuhan nilai korporasi melalui 
usaha di bidang-bidang industri kimia dan farmasi dengan basis penelitian dan 
pengembangan produk yang inovatif, perdagangan dan jaringan distribusi, 
pelayanan kesehatan yang berbasis jaringan ritel farmasi dan jaringan pelayanan 
kesehatan lainnya, pengelolaan aset-aset yang dikaitkan dengan pengembangan 
usaha perusahaan. 
PT Kimia Farma (Persero) Tbk merupakan salah satu Industri Farmasi 
pemerintah yang berstatus sebagai BUMN. PT Kimia Farma mempunyai 3 anak 
perusahan, yaitu: 
1. PT Kimia Farma Trading and Distribution 
2 
ANGGI PRAMITA 
Sebelum menjadi entitas tersendiri, PT. Kimia Farma Trading and 
Distribution, merupakan divisi Pedagang Besar Farmasi (PBF) dari PT 
Kimia Farma (Persero) Tbk. Berbekal kemampuan serta pengalaman 
menangani pendistribusian produk-produk Kimia Farma, maka pada 
tanggal 4 Januari 2003, divisi PBF berkembang menjadi anak perusahaan 
dengan nama PT Kimia Farma Trading and Distribution. Perusahaan yang 
dikenal dengan nama KFTD ini, memiliki wilayah layanan yang luas 
mencakup 33 Propinsi dan 466 Kabupaten atau Kota. KFTD 
mendistribusikan aneka produk dari perusahaan induk, produk dari 
prinsipal 
lainnya 
serta 
produk-produk 
non 
prinsipal. 
KFTD 
mendistribusikan produk-produk tersebut melalui penjualan reguler ke 
Apotek (Apotek Kimia Farma dan Apotek selain Kimia Farma), Rumah 
Sakit, Toko Obat, Supermarket dan lain sebaginya. Di bidang Jasa 
Perdagangan atau Trading, KFTD melayani dan membantu program
program Pemerintah untuk memenuhi kebutuhan obat-obatan bagi 
masyarakat di seluruh Indonesia. 
2. PT Kimia Farma Apotek 
PT Kimia Farma Apotek adalah anak perusahaan PT Kimia Farma 
(Persero) Tbk yang didirikan berdasarkan akta pendirian No. 6 tanggal 4 
Januari 2003. Pada tahun 2011, PT Kimia Farma Apotek memulai 
program transformasi dan mengubah visi dari jaringan layanan ritel 
farmasi menjadi jaringan layanan kesehatan yang terkemuka dan mampu 
memberikan solusi kesehatan masyarakat di Indonesia. Penambahan 
jumlah apotek merupakan bagian dari strategi perusahaan dalam 
memanfaatkan momentum pasar bebas AFTA, dimana pihak yang 
memiliki jaringan luas seperti Kimia Farma akan diuntungkan. 
3. PT Sinkona Indonesia Lestari 
PT Sinkona Indonesia Lestari (SIL) berdiri di kawasan hijau perkebunan 
teh milik PTPN VIII di Ciater, Kabupaten Subang, Jawa Barat. Saham PT 
SIL saat ini dimiliki oleh tiga pemegang saham yaitu PT Kimia Farma 
ANGGI PRAMITA 
3 
(Persero) Tbk, PTP Nusantara VIII dan Yayasan Kartika Eka Paksi 
dimana PT Kimia Farma (Persero) Tbk merupakan pemegang saham 
mayoritas dengan 56% saham. Pemasaran produk hampir 100% ke luar 
negeri, sehingga untuk tetap dapat bersaing di pasar global. 
Strategi Vertical Integration 
Menurut Collis and Montgomery (2005), strategi integrasi vertikal (vertical 
integration strategies) merupakan strategi yang menghendaki perusahaan 
melakukan penguasaan yang lebih atas distributor (integrasi ke depan), pemasok 
(integrasi ke belakang) dan atau para pesaing (integrasi horizontal) baik melalui 
merjer, akuisisi, atau membuat perusahaan sendiri di saat industry dalam kondisi 
bagus. Strategi integrasi vertikal merupakan suatu usaha perusahaan untuk 
memperoleh kendali terhadap inputnya (backward), terhadap outputnya (forward), 
atau keduanya. Strategi integrasi vertikal dianggap strategi pertumbuhan karena 
strategi ini memperluas operasi perusahaan. Strategi integrasi vertikal terdiri atas 
strategi integrasi kedepan (forward integration) dan strategi integrasi kebelakang 
(backward integration). 
Strategi integrasi kedepan menghendaki agar perusahaan mempunyai 
kemampuan yang besar terhadap pengendalian para distributor atau pengecer 
mereka, bila perlu dengan memiliki. Hal ini dapat dilakukan jika perusahaan 
mendapatkan banyak masalah dengan pendistribusian barang/jasa sehingga 
menganggu produksi yang stabil. Padahal perusahaan mampu untuk mengelola 
pendistribusian dimaksud dengan sumber daya yang dimiliki, alasan lain, bisnis di 
sektor distribusi yang dimaksud ternyata memiliki prospek yang baik untuk 
dimasuki. 
Strategi integrasi kebelakang merupakan suatu strategi perusahaan dengan 
meningkatkan pengawasan terhadap bahan baku apalagi pemasok dinilai tidak 
lagi menguntungkan perusahaan, seperti terlambat pengadaan bahan, kualitas 
bahan yang menurun, biaya meningkat sehingga tak dapat lagi dihandalkan. 
Konsumen kini mulai lebih menghargai produk yang ramah lingkungan, sehingga 
mereka menyukai produk yang dapat didaur ulang.  
Beberapa perusahaan menggunakan backward integration untuk 
4 
ANGGI PRAMITA 
memperoleh pengawasan terhadap para pemasok barang agar produk-produk yang 
dapat didaur ulang itu bahan bakunya aman dipasok. Tujuan strategi ini untuk 
mendapatkan kepemilikan atau meningkatkan pengendalian bagi para pemasok. 
Hal ini dapat dilakukan jika jumlah pemasok sedikit padahal pesaing banyak, 
pasokan selama ini berjalan lancar, harga produk stabil dan pemasok memiliki 
margin keuntungan yang tinggi serta perusahaan mempunyai modal dan sumber 
daya yang berkualitas. 
Analisis TOWS Kimia Farma 
Menurut Porter (1998) analisis TOWS adalah sebuah bentuk analisis situasi dan 
kondisi yang bersifat deskriptif (memberi gambaran). Analisis ini menempatkan 
situasi dan kondisi sebagai sebagai faktor masukan, yang kemudian 
dikelompokkan menurut kontribusinya masing-masing.  
1. Threat 
Adanya kompetisi internal yang cukup keras. Adanya krisis ekonomi telah 
membuat daya beli obat rakyat Indonesia menurun sehingga mengancam 
kelangsungan hidup industri farmasi nasional terutama untuk pasar lokal. 
Legal sistem belum dapat menanggulangi obat palsu secara efektif 
sehingga harga obat menjadi lebih sulit dikontrol. Semakin luasnya pasar 
yang ingin dicapai, yaitu menembus pasar internasional akan semakin 
meningkat pula pesaing-pesaing bisnis farmasi. 
2. Opportunity 
Besarnya penduduk Indonesia dan masih rendahnya konsumsi obat 
perkapita menyebabkan pasar potensial yang bisa dikembangkan. 
Kecenderungan berkembangnya sistem penanganan kesehatan yang wajar 
yang dapat menyalurkan tenaga dokter termasuk dokter spesialis yang 
dibutuhkan. 
3. Strength 
Kimia Farma merupakan perusahaan yang mengeluarkan produk-produk 
kesehatan untuk masyarakat. Banyak produk-produk kimia farma yang 
ANGGI PRAMITA 
5 
menjadi inovator dengan mengembangkan obat-obatan serta rumusan 
kimia baru baik dengan kemampuan sendiri ataupun melalui aliansi 
strategis dengan mitra internasional. Serta banyak menghasilkan produk
produk baru yang berbasis teknologi tinggi. 
Obat generik merupakan salah satu produk farmasi yang kompetitif 
karena memiliki keunggulan harga lebih murah 2 – 8 kali harga obat 
paten/merek dagang pertamanya dan memiliki kualitas yang sama dengan 
obat merek dagang pertamanya. Kebijakan memasyarakatkan dan 
memasarkan obat generik yang dilakukan oleh perusahaan juga sejalan 
dengan meningkatnya jumlah permintaan konsumen akan obat secara 
keseluruhan yang mencapai 9,93% per kapita, serta 92% potensi pasar 
bisnis industri farmasi di Indonesia masih belum terpenuhi.  
Hal tersebut menjadi peluang bisnis yang kompetitif bagi 200 
industri farmasi yang ada di Indonesia termasuk PT. Kimia Farma Tbk. 
untuk lebih mengembangkan obat generik sehingga mampu memiliki daya 
saing strategis dan dapat meningkatkan kemampu labaan. Guna 
mengantisipasi persaingan bisnis yang kompetitif di pasar industri farmasi 
khususnya dalam memasarkan maka pihak manajemen PT. Kimia Farma 
Tbk. harus mengupayakan untuk menerapkan strategi bersaing. 
Faktor-faktor lain yang perlu dipertimbangkan oleh PT. Kimia 
Farma Tbk. dalam menghadapi persaingan bisnis obat generik meliputi; 
pengetahuan dan persepsi masyarakat terhadap kualitas obat generik, 
faktor peluang dan ancaman yang dihadapi perusahaan serta faktor 
kekuatan dan kelemahan yang dimiliki oleh perusahaan, merupakan 
keseluruhan faktor yang menjadi dasar pertimbangan dalam memasarkan 
obat generik. 
4. Weakness 
Kinerja atribut/variabel obat generik sebagai berikut ; kinerja atribut 
kemasan dan variasi (keragaman) obat generik memiliki penilaian yang 
negatif, sehingga pihak manajemen perusahaan perlu menetapkan 
upaya/tindakan untuk lebih meningkatkan kemasan produk agar lebih 
6 
ANGGI PRAMITA 
baru 
menarik perhatian dan meyakinkan konsumen serta menambah varian
varian 
agar 
konsumen memiliki pilihan alternatif dalam 
mengkonsumsi obat generik. 
Strategi Bisnis Hulu-hilir Kimia Farma 
Kimia Farma memilih strategi bisnis hulu-hilir, dimana perusahaan ini bergerak 
dalam bidang pelayanan kesehatan yang terintegrasi, yaitu: industri, marketing, 
distribusi, ritel, laboratorium klinik, dan klinik kesehatan. Kimia Farma terus 
melakukan transformasi bisnis dengan mengembangkan berbagai layanan sektor 
kesehatan untuk memberikan kemudahan bagi masyarakat mendapatkan akses 
layanan pemeriksanaan kesehatannya. Perluasan jaringan layanan merupakan 
bagian untuk memenangkan persaingan dalam merebut pasar farmasi nasioanal 
seiring dengan berlakunya Sistem Jaminan Sosial Nasional (SJSN) melalui Badan 
Penyelenggara Jaminan Sosial (BPJS) pada tahun 2014 nanti. 
Salah satu cara perluasan jaringan yang dilakukan oleh PT Kimia Farma 
(Persero) Tbk adalah melalui PT Kimia Farma Apotek (KFA) yang mendekatkan 
dan memberikan layanan terbaik kepada masyarakat. Sepanjang 2012 sebanyak 
30 apotek dan 100 klinik baru telah dibuka di berbagai kota di Indonesia. Langkah 
ini, sebagai bagian dari upaya Kimia Farma untuk memenuhi kebutuhan 
masyarakat Indonesia yang menginginkan pelayanan yang praktis, efisien, dan 
efektif dalam berbagai aktivitasnya, termasuk dalam mendapatkan pelayanan 
kesehatan. Konsep One Stop Healthcare Solution (OSHS) merupakan salah satu 
layanan dengan konsep modern yang diberikan oleh  Kimia Farma.   
Dengan konsep OSHcS masyarakat  mendapatkan layanan kesehatan yang 
tidak perlu repot harus bolak balik ke dokter, laboratorium, dan menebus apotek 
di lain tempat. Karena di dalam konsep Apotek Kimia Farma OSHS, seluruh 
layanan kesehatan secara terpadu dalam satu atap, mulai dari pemeriksaan dokter 
di klinik kesehatan, pemeriksaan laboratorium klinik, konsultasi obat oleh 
Apoteker, layanan optik, pelayanan resep dokter dan juga swalayan farmasi yang 
berada dalam satu tempat di Apotek Kimia Farma. 
Bisnis apotek dapat dibandingkan dengan skala ritel umum atau franchise 
mart yang marak mengepung masyarakat. Secara teknis bisnis, apotek 
ANGGI PRAMITA 
7 
membutuhkan manajemen khusus karena diferensiasi serta spesifikasi produk 
yang kuat pada produknya, produk kesehatan, khususnya obat. Berikut merupakan 
data yang diperoleh dari IMS Health mengenai perkembangan pasar apotek di 
Indonesia: 
8 
ANGGI PRAMITA 
Dengan konsep ini, Kimia Farma akan melirik kerja sama dengan BPJS 
menjadi klinik BPJS. Klinik BPJS merupakan cara dari pemerintah untuk 
menjalankan SJSN. Dengan adanya klinik BPJS itu, masyarakat bisa berobat 
secara cuma-cuma, sebab mereka sudah ditanggung asuransi yang preminya 
dibayar pemerintah. Setiap klinik BPJS akan memperoleh uang pertanggungan 
dengan nilai sesuai jumlah masyarakat yang mereka jangkau. Dengan berlakunya 
BPJS di 2014 nanti, Kimia Farma akan cukup menguasai pelayanan kesehatan 
dan akan bersaing ketat dengan klinik franchise yang saat ini banyak berkembang 
di Indonesia. 
Selain strategi di atas, Kimia Farma juga melakukan beberapa pergerakan lain 
dalam mengantisipasi era SJSN-BPJS, antara lain: 
1. Akusisi Saham Indofarma 
Akusisi Kimia Farma terhadap Indofarma akan diarahkan untuk sinergis 
dan karena itu, pasca akuisisi tersebut tidak akan mengubah rencana bisnis 
Kimia Farma dan sebaliknya akan memperkuat penjualan Kimia Farma. 
Kimia Farma telah memasukkan dokumen rencana "right issue" dan 
akuisisi saham publik milik Indofarma kepada DPR.  
Nantinya, Kimia Farma akan menerbitkan saham baru sekitar 20% 
dengan dana yang diperoleh sekitar Rp 700 miliar. Pengambilalihan saham 
ANGGI PRAMITA 
9 
publik milik Indofarma ini dilakukan menyusul rencana penggabungan ke 
dua perusahaan farmasi tersebut. Saat ini, pemegang saham publik 
Indofarma sebanyak 19,32%, sedangkan pemerintah menguasai 80,66%. 
2. Membangun Kimia Farma Tianjin King Yonk 
Untuk mendongkrak penjualan, Kimia Farma giat melakukan ekspansi 
bisnis dan termasuk kerjasama dengan BUMN farmasi asal Cina yaitu 
Tianjin Pharmaceutical Group Co Ltd untuk membentuk perusahaan baru 
bernama Kimia Farma Tianjin King Yonk. Kerja sama ini untuk 
meningkatkan kapasitas produksi Kimia Farma dan untuk menjadikan 
Kimia Farma sebagai leader market perusahaan farmasi di Indonesia.  
Dalam kerjasama tersebut akan memproduksi alat-alat kesehatan 
rumah sakit berupa ampul dengan kapasitas produksi diawal sebanyak 30 
juta pertahun, vial sebanyak 10 juta pertahun dan infus 20 juta pertahun. 
Rencananya pabrik ini akan beroperasi sebelum akhir tahun 2014 dan 
pembangunan pabrik perusahaan kerjasama ini akan dibangun di kawasan 
Lippo Cikarang dengan luas lahan 3 hektar dan menelan investasi sebesar 
Rp 250 miliar. Kemudian sebagai pemegang saham, Kimia Farma 
sebanyak 49%, PT Tigaka Distrindo Perkasa 5% dan Tianjin 
Pharmaceutical Group co. Ltd sebanyak 46%. 
3. Membangun Rumah Sakit  Liver 
Kimia Farma akan membangun sebuah rumah sakit untuk penanganan 
penyakit liver dengan investasi Rp 280 miliar dan menggandeng PT 
Prakarsa Transforma Indonesia.  Pendirian rumah sakit ini seiring dengan 
berkembangnya pasar kesehatan, selain juga ditunjang fakta bahwa hampir 
20 juta masyarakat Indonesia menderita penyakit hepatitis.  
Rumah sakit liver dengan 14 tingkat ini akan berlokasi di Jalan 
DR. Sahardjo, Jakarta Selatan, dan didirikan di lahan seluas 14.000 meter 
persegi. Setelah pembangunan RS liver di Jakarta Selatan ini, Kimia 
Farma akan membangun lima rumah sakit lainnya, antara lain di Medan, 
Bandung, Makassar serta Semarang.  Pembangunan rumah sakit ini 
10 
ANGGI PRAMITA 
nantinya dapat memanfaatkan lahan yang dimiliki perseroan di beberapa 
kota tersebut. Setelah berhasil membangun lima rumah sakit, diharapkan 
kontribusi dari rumah sakit tersebut sepuluh persen ke perusahaan. 
Kesimpulan 
Dalam menghadapi perubahan dalam lingkungan bisnis dan usahanya untuk 
mengantisipasi era SJSN-BPJS, Kimia Farma menerapkan strategi hulu-hilir yang 
merupakan bagian dari strategi integrasi vertikal. Dengan mengembangkan 
beberapa anak usaha, Kimia Farma berusaha untuk bertahan dalam industri 
farmasi dengan mengambil peran dalam marketing, distribusi, ritel, laboratorium 
klinik, dan klinik kesehatan. 
ANGGI PRAMITA 
11 
REFERENCE 
Collis, David J., and Cynthia A. Montgomery. Corporate strategy: a resource
based approach. 2nd ed. Boston, Mass.: McGraw-Hill/Irwin, 2005. 
"Indonesia Pharmaceuticals and Healthcare Report Q2  7539537." 
MarketResearch.com: Market Research Reports and Industry Analysis. 
http://www.marketresearch.com/Business-Monitor-International
v304/Indonesia-Pharmaceuticals-Healthcare-Q2-7539537/ (accessed July 
10, 2013). 
"Kimia Farma Mengadu Keberuntungan Garap Bisnis Rumah Sakit | 
Neraca.co.id." Neraca - Berita Ekonomi, Investasi, Bursa Saham dan 
Keuangan. 
http://www.neraca.co.id/harian/article/11548/Kimia.Farma.Mengadu.Keb
 eruntungan.Garap.Bisnis.Rumah.Sakit (accessed July 10, 2013). 
"Kimia Farma | BUMN Farmasi Terbesar di Indonesia." Kimia Farma | BUMN 
Farmasi Terbesar di Indonesia. http://kimiafarma.co/detail_full.php?a=10 
(accessed July 10, 2013). 
Porter, MichaeÌˆl E.. Competitive strategy. New York: Free Press, 1998. 
"Strategi Hulu Hilir PT Kimia Farma Tbk Dalam Menyongsong Era SJSN-BPJS | 
pharmabright." pharmabright | Pharmacy, More Than You Imagine. 
http://pharmabright.wordpress.com/2013/04/07/strategi-hulu-hilir-pt-kimia-farma
tbk-dalam-menyongsong-era-sjsn-bpjs/ (accessed July 10, 2013). 
12 
ANGGI PRAMITA 
`;

            console.log('🏭 Preset industrial content length:', presetIndustrialContent.length);
            console.log('🏭 Content preview:', presetIndustrialContent.substring(0, 200) + '...');
            
            // Prepare data to send to backend
            const processedFile = {
                name: 'industrial_manufacturing_report.pdf',
                content: presetIndustrialContent,
                type: 'application/pdf',
                size: presetIndustrialContent.length * 2, // Estimate file size
                extractedLength: presetIndustrialContent.length,
                originalSize: presetIndustrialContent.length * 2
            };
            
            // Send to backend (using private_library.js logic)
            await sendExcelToBackend([processedFile]);
            
            console.log('✅ Preset industrial data successfully uploaded to private library');
            
        } catch (error) {
            console.error('❌ Failed to upload preset industrial data:', error);
            throw error;
        }
    }
    
    // Excel report demo function
    async function generateExcelReportDemo() {
        console.log('🎯 Excel Report Demo: Starting automatic generation...');
        
        // Show loading state – phase 1: load private library
        showOutlineLoadingState('Loading private library...');
        
        // Check if configuration is loaded
        if (typeof DEMO_CONFIG === 'undefined') {
            console.error('❌ Demo configuration not loaded');
            hideOutlineLoadingState();
            return;
        }

        try {
            // 1. First automatically upload Excel file to private library
            console.log('📁 Auto-uploading Excel file to private library...');
            
            await uploadPresetExcelData();
            
            // Phase 2: generating outline
            updateLoadingMessage('Generating outline...');
            
            // 2. Get preset data from configuration file
            const presetOutline = DEMO_CONFIG.outline;
            const presetArticleContent = DEMO_CONFIG.articles;
            
            // 3. Call the backend API to save the preset outline into the history record
            console.log('📋 Saving preset outline to history via API...');
            
            // Create request data
            const requestData = {
                outline: presetOutline,
                topic: "Jiangsu Provincial City Football League", 
                type: 'demo_outline'
            };
            
            // Send POST request to the new backend route
            const response = await fetch('/api/generate/demooutline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`Demo outline API error: ${response.status}`);
            }
            
            const outlineData = await response.text();
            
            // Refresh the global position manager to get the new record
            await initializeGlobalPosManager();
            
            // Set flag to skip saving the outline in displayOutlineInSidebar
            window.skipSaveOutlineToHistory = true;
            
            // Display the outline
            displayOutlineInSidebar(outlineData);

            // Auto expand the sidebar on small screens
            if (window.autoExpandSidebar) {
                window.autoExpandSidebar();
            }

            // Hide loading overlay after outline is shown
            hideOutlineLoadingState();
            
            // 4. Short delay then automatically start displaying preset article
            setTimeout(async () => {
                console.log('📝 Starting preset article display...');
                await generatePresetArticle(presetArticleContent);
            }, DEMO_CONFIG.settings.generateDelay); // Read delay time from configuration
            
            // Show success message
            
            
                } catch (error) {
            console.error('❌ Demo failed:', error);
            hideOutlineLoadingState();
        }
    }

    // Oceanographic research demo function
    async function generateOceanographicResearchDemo() {
        console.log('🌊 Oceanographic Research Demo: Starting automatic generation...');
        
        // Show loading state – phase 1: load private library
        showOutlineLoadingState('Loading private library...');
        
        // Check if oceanographic configuration is loaded
        if (typeof OCEANOGRAPHIC_DEMO_CONFIG === 'undefined') {
            console.error('❌ Oceanographic demo configuration not loaded');
            hideOutlineLoadingState();
            return;
        }

        try {
            // 1. First automatically upload oceanographic research data to private library
            console.log('🌊 Auto-uploading oceanographic research data to private library...');
            
            await uploadPresetOceanographicData();
            
            // Phase 2: generating outline
            updateLoadingMessage('Generating outline...');
            
            // 2. Get preset data from oceanographic configuration
            const presetOutline = OCEANOGRAPHIC_DEMO_CONFIG.outline;
            const presetArticleContent = OCEANOGRAPHIC_DEMO_CONFIG.articles;
            
            // 3. Call the backend API to save the preset outline into the history record
            console.log('📋 Saving preset oceanographic outline to history via API...');
            
            // Create request data
            const requestData = {
                outline: presetOutline,
                topic: "Marine Shallow Gas Hydrate Accumulations", 
                type: 'demo_outline'
            };
            
            // Send POST request to the new backend route
            const response = await fetch('/api/generate/demooutline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`Demo outline API error: ${response.status}`);
            }
            
            const outlineData = await response.text();
            
            // Refresh the global position manager to get the new record
            await initializeGlobalPosManager();
            
            // Set flag to skip saving the outline in displayOutlineInSidebar
            window.skipSaveOutlineToHistory = true;
            
            // Display the outline
            displayOutlineInSidebar(outlineData);

            // Auto expand the sidebar on small screens
            if (window.autoExpandSidebar) {
                window.autoExpandSidebar();
            }

            // Hide loading overlay after outline is shown
            hideOutlineLoadingState();
            
            // 4. Short delay then automatically start displaying preset article
            setTimeout(async () => {
                console.log('📝 Starting preset oceanographic article display...');
                await generatePresetOceanographicArticle(presetArticleContent);
            }, OCEANOGRAPHIC_DEMO_CONFIG.settings.generateDelay);
            
        } catch (error) {
            console.error('❌ Oceanographic demo failed:', error);
            hideOutlineLoadingState();
        }
    }

    // Industrial report demo function
    async function generateIndustrialReportDemo() {
        console.log('🏭 Industrial Report Demo: Starting automatic generation...');
        
        // Show loading state – phase 1: load private library
        showOutlineLoadingState('Loading private library...');
        
        // Check if industrial configuration is loaded
        if (typeof INDUSTRIAL_DEMO_CONFIG === 'undefined') {
            console.error('❌ Industrial demo configuration not loaded');
            hideOutlineLoadingState();
            return;
        }

        try {
            // 1. First automatically upload industrial report data to private library
            console.log('🏭 Auto-uploading industrial report data to private library...');
            
            await uploadPresetIndustrialData();
            
            // Phase 2: generating outline
            updateLoadingMessage('Generating outline...');
            
            // 2. Get preset data from industrial configuration
            const presetOutline = INDUSTRIAL_DEMO_CONFIG.outline;
            const presetArticleContent = INDUSTRIAL_DEMO_CONFIG.articles;
            
            // 3. Call the backend API to save the preset outline into the history record
            console.log('📋 Saving preset industrial outline to history via API...');
            
            // Create request data
            const requestData = {
                outline: presetOutline,
                topic: "Industrial Manufacturing Report", 
                type: 'demo_outline'
            };
            
            // 发送POST请求到新的后端路由
            const response = await fetch('/api/generate/demooutline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`Demo outline API error: ${response.status}`);
            }
            
            const outlineData = await response.text();
            
            // Refresh the global position manager to get the new record
            await initializeGlobalPosManager();
            
            // Set flag to skip saving the outline in displayOutlineInSidebar
            window.skipSaveOutlineToHistory = true;
            
            // Display the outline
            displayOutlineInSidebar(outlineData);

            // Auto expand the sidebar on small screens
            if (window.autoExpandSidebar) {
                window.autoExpandSidebar();
            }

            // Hide loading overlay after outline is shown
            hideOutlineLoadingState();
            
            // 4. Short delay then automatically start displaying preset article
            setTimeout(async () => {
                console.log('📝 Starting preset industrial article display...');
                await generatePresetIndustrialArticle(presetArticleContent);
            }, INDUSTRIAL_DEMO_CONFIG.settings.generateDelay);
            
        } catch (error) {
            console.error('❌ Industrial demo failed:', error);
            hideOutlineLoadingState();
        }
    }

    // Generate preset article content
    async function generatePresetArticle(presetContent) {
        try {
            // Show loading state – generating article; auto hide after 1.5s
            showOutlineLoadingState('Generating article...', 1500);
            
            // Use functions from generate-article.js to initialize container
            window.initializeArticleContainer();
            
            // Update container title
            updateArticleTitle(DEMO_CONFIG.settings.articleTitle);
            
            // Set global variables (for compatibility with existing logic)
            window.totalChapters = presetContent.length;
            window.currentChapterIndex = 0;
            window.completedChaptersCount = 0;
            
            // Display chapters one by one, simulating generation process
            for (let i = 0; i < presetContent.length; i++) {
                const chapter = presetContent[i];
                
                const container = document.getElementById('article-display-container');
                
                // Create generating indicator using article_utils.js
                const generatingElement = window.createGeneratingChapterElement(i, chapter.title);
                container.appendChild(generatingElement);
                
                // Wait for a period to simulate generation process (using time range from configuration)
                const [minDelay, maxDelay] = DEMO_CONFIG.settings.chapterDelay;
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Remove generating indicator
                generatingElement.remove();
                
                // Create chapter element using article_utils.js
                const chapterElement = window.createChapterElement({
                    type: 'chapter',
                    index: i,
                    title: chapter.title,
                    content: chapter.content,
                    references: chapter.references || {},
                    status: 'completed'
                }, i, 'generation');
                
                container.appendChild(chapterElement);
            }
            
            // Show completion message
            setTimeout(() => {
                // Update title to completion status
                updateArticleTitle('Finished!', '#4caf50');
                
                // Use completion interface function from generate-article.js
                window.displayArticleComplete([]);
                window.saveCompleteArticleToHistory();
                
                // Reset send button state
                if (typeof window.setSendButtonCompleted === 'function') {
                    window.setSendButtonCompleted();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error generating preset article:', error);
        }
    }

    // Generate preset oceanographic article content
    async function generatePresetOceanographicArticle(presetContent) {
        try {
            // Show loading state – generating article; auto hide after 1.5s
            showOutlineLoadingState('Generating article...', 1500);
            
            // Use functions from generate-article.js to initialize container
            window.initializeArticleContainer();
            
            // Update container title
            updateArticleTitle(OCEANOGRAPHIC_DEMO_CONFIG.settings.articleTitle);
            
            // Set global variables (for compatibility with existing logic)
            window.totalChapters = presetContent.length;
            window.currentChapterIndex = 0;
            window.completedChaptersCount = 0;
            
            // Display chapters one by one, simulating generation process
            for (let i = 0; i < presetContent.length; i++) {
                const chapter = presetContent[i];
                
                const container = document.getElementById('article-display-container');
                
                // Create generating indicator using article_utils.js
                const generatingElement = window.createGeneratingChapterElement(i, chapter.title);
                container.appendChild(generatingElement);
                
                // Wait for a period to simulate generation process (using time range from configuration)
                const [minDelay, maxDelay] = OCEANOGRAPHIC_DEMO_CONFIG.settings.chapterDelay;
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Remove generating indicator
                generatingElement.remove();
                
                // Create chapter element using article_utils.js
                const chapterElement = window.createChapterElement({
                    type: 'chapter',
                    index: i,
                    title: chapter.title,
                    content: chapter.content,
                    references: chapter.references || {},
                    status: 'completed'
                }, i, 'generation');
                
                container.appendChild(chapterElement);
            }
            
            // Show completion message
            setTimeout(() => {
                // Update title to completion status
                updateArticleTitle('Finished!', '#4caf50');
                
                // Use completion interface function from generate-article.js
                window.displayArticleComplete([]);
                window.saveCompleteArticleToHistory();
                
                if (typeof window.setSendButtonCompleted === 'function') {
                    window.setSendButtonCompleted();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error generating preset oceanographic article:', error);
        }
    }

    // Generate preset industrial article content
    async function generatePresetIndustrialArticle(presetContent) {
        try {
            // Show loading state – generating article; auto hide after 1.5s
            showOutlineLoadingState('Generating article...', 1500);
            
            // Use functions from generate-article.js to initialize container
            window.initializeArticleContainer();
            
            // Update container title
            updateArticleTitle(INDUSTRIAL_DEMO_CONFIG.settings.articleTitle);
            
            // Set global variables (for compatibility with existing logic)
            window.totalChapters = presetContent.length;
            window.currentChapterIndex = 0;
            window.completedChaptersCount = 0;
            
            // Display chapters one by one, simulating generation process
            for (let i = 0; i < presetContent.length; i++) {
                const chapter = presetContent[i];
                
                const container = document.getElementById('article-display-container');
                
                // Create generating indicator using article_utils.js
                const generatingElement = window.createGeneratingChapterElement(i, chapter.title);
                container.appendChild(generatingElement);
                
                // Wait for a period to simulate generation process (using time range from configuration)
                const [minDelay, maxDelay] = INDUSTRIAL_DEMO_CONFIG.settings.chapterDelay;
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Remove generating indicator
                generatingElement.remove();
                
                // Create chapter element using article_utils.js
                const chapterElement = window.createChapterElement({
                    type: 'chapter',
                    index: i,
                    title: chapter.title,
                    content: chapter.content,
                    references: chapter.references || {},
                    status: 'completed'
                }, i, 'generation');
                
                container.appendChild(chapterElement);
            }
            
            // Show completion message
            setTimeout(() => {
                // Update title to completion status
                updateArticleTitle('Finished!', '#4caf50');
                
                // Use completion interface function from generate-article.js
                window.displayArticleComplete([]);
                window.saveCompleteArticleToHistory();
                
                // Reset send button state
                if (typeof window.setSendButtonCompleted === 'function') {
                    window.setSendButtonCompleted();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error generating preset industrial article:', error);
        }
    }

    // Update article title
    function updateArticleTitle(title, color = '#333') {
        const container = document.getElementById('article-display-container');
        if (container) {
            const titleElement = container.querySelector('h1');
            if (titleElement) {
                titleElement.textContent = title;
                titleElement.style.color = color;
            }
        }
    }

          // Expose new functions as global functions
      window.generateExcelReportDemo = generateExcelReportDemo;
      window.generatePresetArticle = generatePresetArticle;
      window.generateOceanographicResearchDemo = generateOceanographicResearchDemo;
      window.generatePresetOceanographicArticle = generatePresetOceanographicArticle;
      window.generateIndustrialReportDemo = generateIndustrialReportDemo;
      window.generatePresetIndustrialArticle = generatePresetIndustrialArticle;
      
      // Expose updateOutlineData function as global function
    window.updateOutlineData = updateOutlineData;

    // Button state management function
    function updateSendButtonState() {
        const inputValue = chatInput.value.trim();
        
        // Remove all status classes
        sendButton.classList.remove('empty', 'with-input', 'completed');
        
        if (inputValue.length > 0) {
            // When there is input content
            sendButton.classList.add('with-input');
        } else {
            // When the input box is empty
            sendButton.classList.add('empty');
        }
    }
    
    // Reset button state to completed after article generation
    function setSendButtonCompleted() {
        sendButton.classList.remove('empty', 'with-input');
        sendButton.classList.add('completed');
    }
    
    // Expose function to global
    window.setSendButtonCompleted = setSendButtonCompleted;
    
    // Expose outline-related functions to global, for other files to reuse
    window.showEditDialog = showEditDialog;
    window.showModifyOutlineDialog = showModifyOutlineDialog;
    window.modifyOutlineWithFeedback = modifyOutlineWithFeedback;
    window.refreshOutlineNumbering = refreshOutlineNumbering;
    window.generateHierarchicalNumbering = generateHierarchicalNumbering;
    window.showSuccessFeedback = showSuccessFeedback;
    window.removeOutlineNumbering = removeOutlineNumbering;
    window.isIntroductoryStatement = isIntroductoryStatement;
    window.removeBoldWrapper = removeBoldWrapper;
    
    // Listen for input box content changes
    chatInput.addEventListener('input', updateSendButtonState);
    
    // Initialize button state
    updateSendButtonState();

    // Add click event listener for send button
    sendButton.addEventListener('click', sendTopicToBackend);

    // Add Enter key event listener for text input
    chatInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); 
            sendTopicToBackend();
        }
    });

    // After showOutlineLoadingState definition, before hideOutlineLoadingState
    // Update text of existing loading overlay
    function updateLoadingMessage(message) {
        const loadingIndicator = document.querySelector('.outline-loading');
        if (loadingIndicator) {
            const msgP = loadingIndicator.querySelector('.loading-content p');
            if (msgP) {
                msgP.textContent = message;
            }
        }
    }
});

