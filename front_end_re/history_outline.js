/**
 * History outline management JavaScript file
 */

class HistoryOutlineManager {
    constructor() {
        this.selectedOutlineUuid = null;
        this.selectedPos = null;
        this.currentPos = -1;
        this.sessionUuid = null;
        this.records = [];
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            const historyBtn = document.querySelector('.history-btn');
            if (historyBtn) {
                historyBtn.addEventListener('click', () => {
                    this.showHistoryDialog();
                });
            }
        });
    }

    /**
     * Show history outline dialog
     */
    async showHistoryDialog() {
        const dialogHtml = `
            <div class="history-overlay" id="history-overlay" style="
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
            ">
                <div class="history-dialog" style="
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 28px;
                    max-width: 550px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e9ecef;
                    animation: slideIn 0.3s ease;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
                ">
                    <div class="history-header" style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid #f1f3f4;
                        background: transparent;
                    ">
                        <h3 style="
                            margin: 0;
                            color: #212529;
                            font-size: 20px;
                            font-weight: 600;
                            letter-spacing: -0.025em;
                            background: transparent;
                        ">History Outlines</h3>
                        <button class="close-history" onclick="historyManager.closeHistoryDialog()" style="
                            background: none;
                            border: none;
                            color: #6c757d;
                            cursor: pointer;
                            font-size: 24px;
                            padding: 4px;
                            border-radius: 6px;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" 
                           onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">×</button>
                    </div>
                    <div class="history-body" id="history-body" style="margin-bottom: 20px;">
                        <div class="history-loading" style="text-align: center; padding: 40px 0;">
                            <div class="loading-spinner" style="
                                width: 40px;
                                height: 40px;
                                border: 4px solid #f3f3f3;
                                border-top: 4px solid #495057;
                                border-radius: 50%;
                                margin: 0 auto 15px;
                                animation: spin 1s linear infinite;
                            "></div>
                            <p style="color: #6c757d; margin: 0;">Loading history outlines...</p>
                        </div>
                    </div>
                    <div class="history-footer" style="
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    ">
                        <button class="history-cancel-btn" onclick="historyManager.closeHistoryDialog()" style="
                            padding: 10px 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#5a6268'"
                           onmouseout="this.style.backgroundColor='#6c757d'">Cancel</button>
                        <button class="history-load-btn" id="history-load-btn" onclick="historyManager.loadSelectedOutline()" disabled style="
                            padding: 10px 20px;
                            background: #495057;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                            opacity: 0.65;
                        " onmouseover="if(!this.disabled) this.style.backgroundColor='#343a40'"
                           onmouseout="if(!this.disabled) this.style.backgroundColor='#495057'">Load Outline</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        this.addDialogStyles();

        await this.loadHistoryOutlines();
    }

    /**
     * Add dialog styles
     */
    addDialogStyles() {
        if (document.getElementById('history-dialog-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'history-dialog-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .history-dialog::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            .history-dialog::-webkit-scrollbar-track {
                background: transparent;
                margin: 12px 0;
            }
            
            .history-dialog::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                border: 2px solid transparent;
            }
            
            .history-dialog::-webkit-scrollbar-thumb:hover {
                background-color: rgba(0, 0, 0, 0.3);
            }
            
            .history-item {
                display: flex;
                flex-direction: column;
                padding: 15px;
                background-color: transparent;
                border-radius: 8px;
                margin-bottom: 12px;
                border: 1px solid #e9ecef;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .history-item:hover {
                background-color: #f8f9fa;
                border-color: #adb5bd;
            }
            
            .history-item.selected {
                background-color: #f8f9fa;
                border-color: #495057;
                box-shadow: 0 2px 4px rgba(73, 80, 87, 0.1);
            }
            
            .history-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .history-item-uuid {
                display: flex;
                align-items: center;
                font-size: 14px;
                color: #495057;
            }
            
            .history-item-time {
                font-size: 12px;
                color: #6c757d;
            }
            
            .history-item-preview {
                font-size: 13px;
                color: #6c757d;
                line-height: 1.4;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .history-empty {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }
            
            .history-empty h4 {
                margin: 10px 0;
                color: #495057;
            }
            
            .history-empty p {
                margin: 5px 0;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Close history outline dialog
     */
    closeHistoryDialog() {
        const overlay = document.getElementById('history-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.selectedOutlineUuid = null;
        this.outlines = [];
    }

    /**
     * Load history records from backend (using new session-based API)
     */
    async loadHistoryOutlines() {
        try {
            console.log('Loading session history records...');
            
            await this.loadCurrentPos();
            
            const response = await fetch('/api/session/records', { credentials: 'include' });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Session history data:', data);

            const historyBody = document.getElementById('history-body');
            
            if (data.status === 'success' && data.records && data.records.length > 0) {
                this.records = data.records;
                this.sessionUuid = data.session_uuid;
                this.currentPos = data.current_pos;
                this.renderHistoryRecords(data.records);
                console.log(`Successfully loaded ${data.records.length} history records`);
            } else {
                historyBody.innerHTML = `
                    <div class="history-empty">
                        <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                        <h4>No History Records</h4>
                        <p>Generate some outlines and they will appear here</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load history records:', error);
            const historyBody = document.getElementById('history-body');
            historyBody.innerHTML = `
                <div class="history-empty">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h4>Load Failed</h4>
                    <p>Error message: ${error.message}</p>
                    <button onclick="historyManager.loadHistoryOutlines()" 
                            style="margin-top: 15px; padding: 10px 20px; background: #495057; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease;"
                            onmouseover="this.style.backgroundColor='#343a40'"
                            onmouseout="this.style.backgroundColor='#495057'">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load current position information
     */
   async loadCurrentPos() {
        try {
            const response = await fetch('/api/session/current_pos', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.currentPos = data.current_pos;
                    this.sessionUuid = data.session_uuid;
                    console.log(`Current position: ${this.currentPos}, Session: ${this.sessionUuid}`);
                }
            }
        } catch (error) {
            console.warn('Failed to load current position:', error);
        }
    }

    /**
     * Render history records list
     */
    renderHistoryRecords(records) {
        const historyBody = document.getElementById('history-body');
        
        const recordsHtml = records.map((record, index) => {
            const date = new Date(record.timestamp);
            const formattedDate = date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const cleanPreview = record.outline_preview
                ? record.outline_preview
                    .replace(/^#+\s*/gm, '')
                    .replace(/\n+/g, ' ')
                    .trim()
                : 'No outline content';

            const isCurrentRecord = record.pos === this.currentPos;
            const currentBadge = isCurrentRecord ? '<span style="background: #495057; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 10px;">CURRENT</span>' : '';

            return `
                <div class="history-item" data-pos="${record.pos}" onclick="historyManager.selectRecord(${record.pos})">
                    <div class="history-item-header">
                        <div class="history-item-uuid">
                            <span style="font-weight: 500;">Position #${record.pos}</span>
                            ${currentBadge}
                            <span style="margin-left: 10px; color: #6c757d;">
                                ${record.has_outline ? '📄' : ''} ${record.has_article ? '📰' : ''}
                            </span>
                        </div>
                        <div class="history-item-time">${formattedDate}</div>
                    </div>
                    <div class="history-item-preview">${cleanPreview}</div>
                </div>
            `;
        }).join('');

        historyBody.innerHTML = recordsHtml;
    }

    /**
     * Select record
     */
    selectRecord(pos) {
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = document.querySelector(`[data-pos="${pos}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            this.selectedPos = pos;
            
            const loadBtn = document.getElementById('history-load-btn');
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.style.opacity = '1';
                loadBtn.textContent = `Load Position #${pos}`;
            }
            
            console.log(`Selected record at position ${pos}`);
        }
    }

    /**
     * Load selected record to sidebar
     */
    async loadSelectedOutline() {
        if (this.selectedPos === null || this.selectedPos === undefined) {
            window.showNotification ? window.showNotification('Please select a record first', 'error') : this.showErrorFeedback('Please select a record first');
            return;
        }

        const loadBtn = document.getElementById('history-load-btn');
        const originalText = loadBtn.textContent;

        try {
            if (loadBtn) {
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 5px;"></span>Loading...';
            }

            console.log(`Starting to load record at position: ${this.selectedPos}`);

            if (typeof window.clearArticleContainer === 'function') {
                const cleared = window.clearArticleContainer();
                if (cleared) {
                    console.log('Cleared previous article container');
                }
            }

            const response = await fetch(`/api/session/records/${this.selectedPos}`, { credentials: 'include' });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Retrieved record data:', data);

            if (data.status === 'success' && data.record) {
                const record = data.record;
                
                if (record.topic && record.topic.trim()) {
                    window.currentTopic = record.topic;
                    console.log(`Updated window.currentTopic to: ${record.topic}`);
                }
                
                if (record.outline) {
                    this.displayOutlineInSidebar(record.outline);
                    
                    const setSuccess = await this.setCurrentPos(this.selectedPos);
                    
                    if (setSuccess) {
                        window.currentPos = this.selectedPos;
                        this.currentPos = this.selectedPos;
                        console.log(`Set global currentPos to ${this.selectedPos}`);
                        
                        await this.loadCurrentPos();
                    }
                }
                
                console.log(`Record at position ${this.selectedPos} has article:`, record.article);
                if (record.article) {
                    let articleContent;
                    if (Array.isArray(record.article)) {
                        articleContent = record.article.join('\n\n');
                    } else if (typeof record.article === 'string') {
                        articleContent = record.article;
                    } else {
                        console.warn('Unexpected article content type:', typeof record.article);
                        articleContent = '';
                    }
                    console.log(`Loaded article content for position ${this.selectedPos}:`, articleContent);
                    if (articleContent && articleContent.trim()) {
                        
                        this.displayArticleContent(articleContent);
                        
                        await this.loadArticleReferences(this.selectedPos);
                    }
                } else {
                    console.log(`Record at position ${this.selectedPos} has no article content, ensuring article container is cleared`);
                    if (typeof window.clearArticleContainer === 'function') {
                        window.clearArticleContainer();
                    }
                }
                
                this.closeHistoryDialog();
                
                window.showNotification ? window.showNotification(`History record #${this.selectedPos} successfully loaded to sidebar`, 'success') : this.showSuccessFeedback(`History record #${this.selectedPos} successfully loaded to sidebar`);
                window.showNotification ? window.showNotification(`History record #${this.selectedPos} successfully loaded to sidebar`, 'success') : this.showSuccessFeedback(`History record #${this.selectedPos} successfully loaded to sidebar`);
                
                console.log('Record loaded successfully');
            } else {
                throw new Error(data.message || 'Failed to get record content');
            }
        } catch (error) {
            console.error('Failed to load record:', error);
            window.showNotification ? window.showNotification(`Failed to load record: ${error.message}`, 'error') : this.showErrorFeedback(`Failed to load record: ${error.message}`);
            
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.textContent = originalText;
            }
        }
    }

    /**
     * Set current position
     */
    async setCurrentPos(pos) {
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
                    this.currentPos = pos;
                    console.log(`Successfully set current position to ${pos}`);
                    return true;
                }
            }
            throw new Error('Failed to set current position');
        } catch (error) {
            console.warn('Error setting current position:', error);
            return false;
        }
    }

    /**
     * Load corresponding article content
     */
    async loadCorrespondingArticle(uuid) {
        try {
            console.log(`Attempting to load article for UUID: ${uuid}`);
            
            const response = await fetch(`/api/get_article/${uuid}`, { credentials: 'include' });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Retrieved article data:', data);
                
                if (data.status === 'success' && data.article_content) {
                    this.displayArticleContent(data.article_content);
                    console.log('Article content loaded and displayed');
                } else {
                    console.log('No article content found for this outline');
                }
            } else if (response.status === 404) {
                console.log('No article found for this outline UUID');
            } else {
                console.warn(`Failed to load article: HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('Error loading article content:', error);
        }
    }

    /**
     * Display article content in main container
     */
    displayArticleContent(articleContent) {
        if (typeof articleContent !== 'string') {
            console.error('displayArticleContent: articleContent is not a string:', typeof articleContent, articleContent);
            return;
        }
        
        const articleContainer = window.createArticleContainer('Historical Article', '#4caf50');

        this.parseAndDisplayArticleContent(articleContent, articleContainer);

        const exampleBlocksContainer = document.querySelector('.example-blocks-container');
        
        if (exampleBlocksContainer) {
            exampleBlocksContainer.insertAdjacentElement('afterend', articleContainer);
        } else {
            const fallbackContainer = document.getElementById('main-content') || document.body;
            fallbackContainer.appendChild(articleContainer);
        }
        
        window.displayArticleComplete([], {
            updateTitle: false,
            title: 'Historical Article'
        });

        articleContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Parse and display article content (improved version, better handling of regenerated chapters)
     */
    parseAndDisplayArticleContent(articleContent, container) {
        if (typeof articleContent !== 'string') {
            console.error('parseAndDisplayArticleContent: articleContent is not a string:', typeof articleContent, articleContent);
            return;
        }
        
        console.log('Parsing article content:', articleContent.substring(0, 200) + '...');
        
        const chapterPattern = /^## (.+)$/gm;
        const chapters = [];
        let lastIndex = 0;
        let match;
        
        while ((match = chapterPattern.exec(articleContent)) !== null) {
            if (chapters.length > 0) {
                const previousChapter = chapters[chapters.length - 1];
                const content = articleContent.substring(lastIndex, match.index).trim();
                previousChapter.content = this.parseChapterContent(content);
            }
            
            chapters.push({
                title: match[1].trim(),
                content: []
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        if (chapters.length > 0) {
            const lastChapter = chapters[chapters.length - 1];
            const content = articleContent.substring(lastIndex).trim();
            lastChapter.content = this.parseChapterContent(content);
        }
        
        console.log(`Parsed ${chapters.length} chapters`);
        
        chapters.forEach((chapter, index) => {
            this.createHistoryChapter(chapter, index, container);
        });
    }
    
    /**
     * Parse chapter content, handle possible HTML format and special characters
     * @param {string} content Chapter content
     * @returns {Array} Content lines array
     */
    parseChapterContent(content) {
        if (!content) return [];
        
        let lines = content.split('\n');
        
        lines = lines.map(line => {
            line = line.trim();
            if (!line) return line;
            
            if (line.includes('<') && line.includes('>')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = line;
                line = tempDiv.textContent || tempDiv.innerText || '';
            }
            
            return line;
        });
        
        return lines.filter(line => line.trim());
    }

    /**
     * Generate hierarchical numbering
     * @param {Array} outlineLines Outline lines array
     * @returns {Array} Numbering array
     */
    generateHierarchicalNumbering(outlineLines) {
        const numbering = [];
        const counters = [0, 0, 0, 0, 0, 0];
        
        outlineLines.forEach(line => {
            const match = line.match(/^(#+)\s*(.+)$/);
            if (match) {
                const level = match[1].length;
                
                for (let i = level; i < counters.length; i++) {
                    if (i > level) counters[i] = 0;
                }
                
                counters[level - 1]++;
                
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
    
    /**
     * Check if item has children
     * @param {Array} outlineLines Outline lines array
     * @param {number} currentIndex Current index
     * @param {number} currentLevel Current level
     * @returns {boolean} Whether has children
     */
    hasChildrenItems(outlineLines, currentIndex, currentLevel) {
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
    
    /**
     * Initialize collapse/expand functionality
     */
    initToggleFunctionality() {
        const toggleButtons = document.querySelectorAll('.toggle-btn:not(.no-children)');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const index = parseInt(button.dataset.index);
                const outlineBlocks = document.querySelectorAll('.outline-block');
                const currentBlock = outlineBlocks[index];
                const currentLevel = parseInt(currentBlock.dataset.level);
                
                const isCollapsed = button.classList.contains('collapsed');
                
                if (isCollapsed) {
                    button.textContent = '▼';
                    button.classList.remove('collapsed');
                    this.showChildren(outlineBlocks, index, currentLevel);
                } else {
                    button.textContent = '▶';
                    button.classList.add('collapsed');
                    this.hideChildren(outlineBlocks, index, currentLevel);
                }
            });
        });
    }
    
    /**
     * Hide children items
     * @param {NodeList} outlineBlocks Outline blocks list
     * @param {number} parentIndex Parent index
     * @param {number} parentLevel Parent level
     */
    hideChildren(outlineBlocks, parentIndex, parentLevel) {
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
    
    /**
     * Show children items
     * @param {NodeList} outlineBlocks Outline blocks list
     * @param {number} parentIndex Parent index
     * @param {number} parentLevel Parent level
     */
    showChildren(outlineBlocks, parentIndex, parentLevel) {
        for (let i = parentIndex + 1; i < outlineBlocks.length; i++) {
            const block = outlineBlocks[i];
            const level = parseInt(block.dataset.level);
            
            if (level > parentLevel) {
                if (level === parentLevel + 1) {
                    block.classList.remove('collapsed');
                } else {
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

    /**
     * Display outline in sidebar
     * @param {string} outlineContent Outline content
     */
    displayOutlineInSidebar(outlineContent) {
        console.log('displayOutlineInSidebar called with content length:', outlineContent?.length);
        
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) {
            console.error('Sidebar navigation element not found');
            window.showNotification ? window.showNotification('Error: Sidebar navigation element not found', 'error') : this.showErrorFeedback('Error: Sidebar navigation element not found');
            return;
        }

        while (sidebarNav.children.length > 4) {
            sidebarNav.removeChild(sidebarNav.lastChild);
        }

        const outlineLines = outlineContent.split('\n').filter(line => /^#+\s/.test(line));

        if (outlineLines.length === 0) {
            const item = document.createElement('li');
            item.textContent = outlineContent.substring(0, 100) + (outlineContent.length > 100 ? '...' : '');
            sidebarNav.appendChild(item);
            return;
        }

        let existingToolbar = document.querySelector('.outline-toolbar');
        if (existingToolbar) {
            existingToolbar.remove();
        }

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

        sidebarNav.insertBefore(outlineToolbar, sidebarNav.children[4]);

        const outlineContainer = document.createElement('ul');
        outlineContainer.className = 'outline-container';
        sidebarNav.appendChild(outlineContainer);

        const addButton = outlineToolbar.querySelector('.add-block-btn');
        const sortButton = outlineToolbar.querySelector('.sort-outline-btn');
        const modifyButton = outlineToolbar.querySelector('.modify-outline-btn');

        if (addButton && window.showEditDialog) {
            addButton.addEventListener('click', () => {
                window.showEditDialog('', 1, async (text, level) => {
                    const outlineContainer = document.querySelector('.outline-container');
                    
                    const currentOutlineBlocks = document.querySelectorAll('.outline-block');
                    const outlineLines = [];
                    
                    currentOutlineBlocks.forEach(block => {
                        const blockLevel = parseInt(block.dataset.level);
                        const blockText = block.querySelector('.block-content').textContent;
                        const hashmarks = '#'.repeat(blockLevel);
                        outlineLines.push(`${hashmarks} ${blockText}`);
                    });
                    
                    const hashmarks = '#'.repeat(level);
                    outlineLines.push(`${hashmarks} ${text}`);
                    
                    const numbering = window.generateHierarchicalNumbering ?
                        window.generateHierarchicalNumbering(outlineLines) :
                        this.generateHierarchicalNumbering(outlineLines);
                    const newItemNumber = numbering[numbering.length - 1];
                    
                    const outlineBlock = document.createElement('li');
                    outlineBlock.className = 'outline-block';
                    outlineBlock.dataset.level = level;
                    outlineBlock.dataset.index = currentOutlineBlocks.length;
                    outlineBlock.style.paddingLeft = ((level - 1) * 10) + 'px';

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

                    if (window.refreshOutlineNumbering) {
                        window.refreshOutlineNumbering();
                    }

                    this.updateOutlineData(false);
                    await this.saveHistoryOutlineChanges();
                    
                    this.initHistoryOutlineInteractions(outlineContainer);
                });
            });
        }

        if (sortButton) {
            this.initHistorySortFunctionality(sortButton, outlineContainer);
        }

        if (modifyButton && window.showModifyOutlineDialog) {
            modifyButton.addEventListener('click', () => {
                window.showModifyOutlineDialog();
            });
        }

        const numbering = window.generateHierarchicalNumbering ? 
            window.generateHierarchicalNumbering(outlineLines) :
            this.generateHierarchicalNumbering(outlineLines);
        
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

                const hasChildren = this.hasChildrenItems(outlineLines, index, level);
                
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

                outlineBlock.addEventListener('click', function (event) {
                    if (event.target.classList.contains('edit-btn') ||
                        event.target.classList.contains('delete-btn') ||
                        event.target.classList.contains('toggle-btn')) {
                        return;
                    }

                    if (window.scrollToArticleTitle) {
                        const titleText = this.querySelector('.block-content').textContent;
                        window.scrollToArticleTitle(titleText);
                    }
                });

                outlineContainer.appendChild(outlineBlock);
            }
        });
        
        this.initToggleFunctionality();

        if (window.initOutlineInteractions) {
            window.initOutlineInteractions();
        } else {
            this.initHistoryOutlineInteractions(outlineContainer);
        }

        console.log('History outline displayed in sidebar successfully');
    }
    
    /**
     * Initialize history outline sorting functionality (reference send_topic.js)
     * @param {HTMLElement} sortButton Sort button element
     * @param {HTMLElement} outlineContainer Outline container element
     */
    initHistorySortFunctionality(sortButton, outlineContainer) {
        let sortingEnabled = false;

        // Add button click event
        sortButton.addEventListener('click', async () => {
            sortingEnabled = !sortingEnabled;

            if (sortingEnabled) {
                sortButton.textContent = 'STOP';
                sortButton.style.backgroundColor = '#f39c12';
                outlineContainer.classList.add('sortable-mode');

                outlineContainer.setAttribute('draggable', true);
                const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');

                outlineBlocks.forEach(block => {
                    block.setAttribute('draggable', true);

                    block.addEventListener('dragstart', function (e) {
                        e.dataTransfer.setData('text/plain', '');
                        this.classList.add('dragging');
                    });

                    block.addEventListener('dragend', function (e) {
                        this.classList.remove('dragging');
                    });

                    block.addEventListener('dragover', function (e) {
                        e.preventDefault();
                        const draggingElement = outlineContainer.querySelector('.dragging');
                        const afterElement = this.getDragAfterElement(outlineContainer, e.clientY);

                        if (afterElement == null) {
                            outlineContainer.appendChild(draggingElement);
                        } else {
                            outlineContainer.insertBefore(draggingElement, afterElement);
                        }
                    }.bind(this));
                });

                this.showSortingFeedback('Drag sorting enabled - drag items to reorder', true);

            } else {
                sortButton.textContent = 'SORT';
                sortButton.style.backgroundColor = '';
                outlineContainer.classList.remove('sortable-mode');

                const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');
                outlineBlocks.forEach(block => {
                    block.removeAttribute('draggable');
                    block.classList.remove('dragging');
                });

                this.showSortingFeedback('Drag sorting disabled', false);

                if (window.refreshOutlineNumbering) {
                    window.refreshOutlineNumbering();
                }

                this.updateOutlineData(false);
                await this.saveHistoryOutlineChanges();
            }
        });
    }

    /**
     * Get the position where drag element should be inserted (reference send_topic.js)
     * @param {HTMLElement} container Container element
     * @param {number} y Mouse Y coordinate
     * @returns {HTMLElement|null} Target element
     */
    getDragAfterElement(container, y) {
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

    /**
     * Show sorting feedback information (reference send_topic.js)
     * @param {string} message Prompt message
     * @param {boolean} isEnabled Whether enabled
     */
    showSortingFeedback(message, isEnabled) {
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

        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Initialize history outline interaction functionality
     * @param {HTMLElement} outlineContainer Outline container element
     */
    initHistoryOutlineInteractions(outlineContainer) {
        outlineContainer.removeEventListener('click', this.handleOutlineContainerClick);
        
        if (!this.handleOutlineContainerClick) {
            this.handleOutlineContainerClick = (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    e.stopPropagation();
                    const outlineBlock = e.target.closest('.outline-block');
                    const contentSpan = outlineBlock.querySelector('.block-content');
                    const currentText = contentSpan.textContent;
                    const currentLevel = parseInt(outlineBlock.dataset.level);
                    
                    if (window.showEditDialog) {
                        window.showEditDialog(currentText, currentLevel, (newText, newLevel) => {
                            contentSpan.textContent = newText;
                            outlineBlock.dataset.level = newLevel;
                            outlineBlock.style.paddingLeft = ((newLevel - 1) * 10) + 'px';
                            
                            this.updateOutlineData(false);
                            this.saveHistoryOutlineChanges();
                            
                            if (window.refreshOutlineNumbering) {
                                window.refreshOutlineNumbering();
                            }
                        });
                    } else {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = currentText;
                        input.className = 'outline-edit-input';
                        input.style.width = '100%';
                        
                        contentSpan.textContent = '';
                        contentSpan.appendChild(input);
                        input.focus();
                        
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                contentSpan.textContent = input.value;
                                this.updateOutlineData(false);
                                this.saveHistoryOutlineChanges();
                            } else if (e.key === 'Escape') {
                                contentSpan.textContent = currentText;
                            }
                        });
                        
                        input.addEventListener('blur', () => {
                            contentSpan.textContent = input.value;
                            this.updateOutlineData(false);
                            this.saveHistoryOutlineChanges();
                        });
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    e.stopPropagation();
                    const outlineBlock = e.target.closest('.outline-block');
                    outlineBlock.remove();
                    
                    this.updateOutlineData(false);
                    this.saveHistoryOutlineChanges();
                    
                    if (window.refreshOutlineNumbering) {
                        window.refreshOutlineNumbering();
                    }                 
                }
            };
        }
        
        outlineContainer.addEventListener('click', this.handleOutlineContainerClick);
    }

    /**
     * Update outline data (history outline specific version, only save when user actively edits)
     * @param {boolean} saveToHistory Whether to save to history, default false
     */
    updateOutlineData(saveToHistory = false) {
        if (saveToHistory && window.updateOutlineData) {
            window.updateOutlineData();
            return;
        }
        
        const outlineContainer = document.querySelector('.outline-container');
        if (!outlineContainer) {
            console.warn('Outline container not found');
            return;
        }

        const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');
        if (!outlineBlocks || outlineBlocks.length === 0) {
            console.warn('No outline blocks found');
            return;
        }

        let outlineText = '';
        outlineBlocks.forEach(block => {
            const level = block.dataset.level || '1';
            const content = block.querySelector('.block-content').textContent || '';
            outlineText += '#'.repeat(parseInt(level)) + ' ' + content + '\n';
        });

        const outlineDataInput = document.getElementById('outlineData');
        if (outlineDataInput) {
            outlineDataInput.value = outlineText;
        }

        console.log('Outline data updated', saveToHistory ? '(saved to history)' : '(local only)');
    }

    /**
     * Save history outline changes to correct position
     */
    async saveHistoryOutlineChanges() {
        const outlineContainer = document.querySelector('.outline-container');
        if (!outlineContainer) {
            console.warn('Outline container not found');
            return;
        }

        const outlineBlocks = outlineContainer.querySelectorAll('.outline-block');
        if (!outlineBlocks || outlineBlocks.length === 0) {
            console.warn('No outline blocks found');
            return;
        }

        let outlineText = '';
        outlineBlocks.forEach(block => {
            const level = block.dataset.level || '1';
            const content = block.querySelector('.block-content').textContent || '';
            outlineText += '#'.repeat(parseInt(level)) + ' ' + content + '\n';
        });

        try {
            const targetPos = this.selectedPos !== null ? this.selectedPos : window.currentPos;
            
            const response = await fetch('/api/session/outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    outline_content: outlineText,
                    pos: targetPos
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`History outline changes saved to position ${targetPos}:`, result);
                return true;
            } else {
                console.error('Failed to save history outline changes:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error saving history outline changes:', error);
            return false;
        }
    }

    /**
     * Create history article chapter display
     * @param {Object} chapterData Object containing chapter title and content
     * @param {number} index Chapter index
     * @param {HTMLElement} container Container element
     */
    createHistoryChapter(chapterData, index, container) {
        const content = chapterData.content.join('\n').trim();
        const formattedChapterData = {
            title: chapterData.title,
            content: content
        };
        
        if (window.saveChapterData) {
            window.saveChapterData({
                index: index,
                title: chapterData.title,
                originalContent: content
            });
        }
        
        const chapterElement = window.createChapterElement(formattedChapterData, index, 'history');
        
        chapterElement.classList.add('history-chapter');
        chapterElement.style.cssText += `
            border: 0.06vw solid #e0e0e0;
            margin: 1.74vh 0;
            transition: all 0.3s ease;
            box-shadow: 0 0.46vh 0.93vh rgba(0,0,0,0.1);
        `;

        chapterElement.setAttribute('data-index', index);

        container.appendChild(chapterElement);
    }

    /**
     * Load article reference data
     * @param {number} pos History record position
     */
    async loadArticleReferences(pos) {
        try {
            console.log(`Loading references for article at position ${pos}`);
            const chapters = document.querySelectorAll('.chapter-item');
            if (!chapters || chapters.length === 0) {
                console.warn('No chapters found in article');
                return;
            }
            
            for (let i = 0; i < chapters.length; i++) {
                const chapterElement = chapters[i];
                const chapterIndex = chapterElement.getAttribute('data-index');
                
                if (chapterIndex === null) {
                    console.warn(`Chapter ${i} has no index attribute`);
                    continue;
                }
                
                const response = await fetch(`/api/session/chapter_references?pos=${pos}&chapter_index=${chapterIndex}`, { credentials: 'include' });
                
                if (!response.ok) {
                    console.warn(`Failed to load references for chapter ${chapterIndex}: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (data.status === 'success' && data.references) {
                    console.log(`Loaded ${Object.keys(data.references).length} references for chapter ${chapterIndex}`);
                    
                    chapterElement.setAttribute('data-references', JSON.stringify(data.references));
                    
                    const existingData = window.chapterDataStore[parseInt(chapterIndex)] || {};
                    window.saveChapterData({
                        ...existingData,
                        index: parseInt(chapterIndex),
                        references: data.references
                    });
                    
                    const contentElement = chapterElement.querySelector('.chapter-content');
                    if (contentElement) {
                        this.processChapterReferences(contentElement, data.references);
                    }
                }
            }
            
            if (!document.getElementById('reference-tooltip-styles')) {
                if (typeof addReferenceStyles === 'function') {
                    addReferenceStyles();
                }
            }
            
            if (typeof initReferenceTooltips === 'function') {
                initReferenceTooltips();
            }
        } catch (error) {
            console.error('Error loading article references:', error);
        }
    }

    /**
     * Process reference markers in chapters
     * @param {HTMLElement} contentElement Chapter content element
     * @param {Object} references Reference data
     */
    processChapterReferences(contentElement, references) {
        let contentHtml = contentElement.innerHTML;
        
        Object.keys(references).forEach(refId => {
            const refMarker = `[${refId}]`;
            contentHtml = contentHtml.replace(
                new RegExp(`\\[${refId}\\]`, 'g'),
                `<span class="reference-marker" data-ref-id="${refId}">${refMarker}</span>`
            );
        });
        
        contentElement.innerHTML = contentHtml;
    }
    
    /**
     * Get currently displayed article content (improved version)
     * @returns {string} Currently displayed article content
     */
    getCurrentDisplayedArticleContent() {
        return window.getCurrentArticleContent ? window.getCurrentArticleContent() : '';
    }

    /**
     * Update and save history article
     */
    async updateAndSaveHistoryArticle() {
        const articleContent = this.getCurrentDisplayedArticleContent();
        
        await window.saveArticleToCloud(articleContent, 'update-save-article-btn', true);
    }



    /**
     * Show success feedback
     * @param {string} message Prompt message
     */
    showSuccessFeedback(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }

    /**
     * Show error feedback
     * @param {string} message Error message
     */
    showErrorFeedback(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }
}

window.updateAndSaveHistoryArticle = async function() {
    await historyManager.updateAndSaveHistoryArticle();
};

/**
 * Note: This file has been modified to reuse functions from send_topic.js to avoid code duplication:
 * 
 * Reused global functions include:
 * - window.showEditDialog: Show edit outline item dialog
 * - window.showModifyOutlineDialog: Show modify outline dialog  
 * - window.getCurrentOutlineText: Get current outline text
 * - window.modifyOutlineWithFeedback: Modify outline with feedback
 * - window.refreshOutlineNumbering: Refresh outline numbering
 * - window.generateHierarchicalNumbering: Generate hierarchical numbering
 * - window.showSuccessFeedback: Show success feedback
 * - window.updateOutlineData: Update outline data
 * 
 * These functions are defined in send_topic.js and exposed as global functions,
 * history_outline.js prioritizes using these global functions, falling back to local implementation if unavailable.
 */



const historyManager = new HistoryOutlineManager();

window.historyManager = historyManager;
window.updateAndSaveHistoryArticle = () => historyManager.updateAndSaveHistoryArticle();

document.addEventListener('regenerate-chapter-feedback', (event) => {
    const { chapterIndex, chapterTitle, currentContent, feedback } = event.detail;
    window.regenerateChapterWithFeedback(
        chapterIndex, 
        chapterTitle, 
        currentContent, 
        feedback, 
        window.saveModifiedArticleToHistory
    );
});






