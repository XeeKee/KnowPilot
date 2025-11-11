/**
 * @file Debug status display component for CollabThink development.
 * 
 * This module provides a comprehensive debugging interface that displays
 * real-time session information, current position tracking, and backend
 * synchronization status. It's designed for developers to monitor the
 * application state during development and troubleshooting.
 */

/**
 * Manages the debug status display and monitoring system.
 * 
 * This class provides a floating debug panel that shows real-time
 * information about the current session, position tracking, and
 * backend synchronization. It can be toggled with Ctrl+Shift+D
 * and updates automatically every 2 seconds when visible.
 */
class DebugStatusManager {
    /**
     * Initialize the debug status manager.
     * 
     * Sets up the debug status element, keyboard shortcuts, and
     * automatic status updates. The debug panel is hidden by
     * default and can be toggled with the keyboard shortcut.
     */
    constructor() {
        this.statusElement = null;
        this.isVisible = false;
        this.init();
    }

    /**
     * Initialize the debug status system.
     * 
     * Creates the status display element, sets up keyboard shortcuts
     * for toggling visibility, and starts the automatic update timer.
     * The system responds to Ctrl+Shift+D for toggling the debug panel.
     */
    init() {
        this.createStatusElement();
        
        // Set up keyboard shortcut for toggling debug panel
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });

        // Update status every 2 seconds when visible for real-time monitoring
        setInterval(() => {
            if (this.isVisible) {
                this.updateStatus();
            }
        }, 2000);
    }

    /**
     * Create the debug status display element.
     * 
     * Creates a floating div element positioned in the top-right corner
     * with professional styling and high z-index to ensure visibility.
     * The element is initially hidden and styled for optimal readability.
     */
    createStatusElement() {
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'debug-status';
        this.statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(this.statusElement);
    }

    /**
     * Toggle the visibility of the debug status panel.
     * 
     * Switches between showing and hiding the debug panel. When
     * making the panel visible, it immediately updates the status
     * to show current information.
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.statusElement.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            this.updateStatus();
        }
    }

    /**
     * Update the debug status information from backend APIs.
     * 
     * Fetches current session position and records information from
     * the backend APIs to provide real-time synchronization status.
     * This function handles API errors gracefully and displays them
     * in the debug panel.
     * 
     * @returns {Promise<void>} Resolves when status update is complete
     */
    async updateStatus() {
        try {
            // Fetch current position from backend session API
            const posResponse = await fetch('/api/session/current_pos');
            let posData = null;
            if (posResponse.ok) {
                posData = await posResponse.json();
            }

            // Fetch session records from backend records API
            const recordsResponse = await fetch('/api/session/records');
            let recordsData = null;
            if (recordsResponse.ok) {
                recordsData = await response.json();
            }

            // Compile comprehensive status information for display
            const status = {
                timestamp: new Date().toLocaleTimeString(),
                currentPos: window.currentPos,
                sessionUuid: window.sessionUuid,
                backendCurrentPos: posData?.current_pos ?? 'N/A',
                backendSessionUuid: posData?.session_uuid ?? 'N/A',
                totalRecords: recordsData?.total ?? 0,
                records: recordsData?.records ?? []
            };

            this.renderStatus(status);
        } catch (error) {
            // Display error information in debug panel for troubleshooting
            this.statusElement.innerHTML = `
                <div style="color: #ff6b6b;">
                    <strong>🔴 调试状态</strong><br/>
                    错误: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Render the debug status information in the display panel.
     * 
     * Formats and displays comprehensive debug information including
     * frontend/backend synchronization status, session details, and
     * historical records with visual indicators for quick assessment.
     * 
     * @param {Object} status - Status object containing all debug information
     */
    renderStatus(status) {
        // Generate visual representation of records with status indicators
        const recordsList = status.records.map((record, index) => {
            const isCurrent = record.pos === status.backendCurrentPos;
            const hasOutline = record.has_outline ? '📄' : '⚪';
            const hasArticle = record.has_article ? '📰' : '⚪';
            const currentBadge = isCurrent ? ' 🎯' : '';
            
            return `
                <div style="margin: 2px 0; padding: 2px; background: ${isCurrent ? 'rgba(74, 110, 224, 0.3)' : 'transparent'}; border-radius: 2px;">
                    #${record.pos}: ${hasOutline}${hasArticle}${currentBadge}
                </div>
            `;
        }).join('');

        // Render comprehensive debug information with organized sections
        this.statusElement.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>🐛 调试状态</strong> <span style="opacity: 0.7;">${status.timestamp}</span>
            </div>
            
            <div style="margin-bottom: 6px;">
                <strong>前端状态:</strong><br/>
                位置: <span style="color: #4a6ee0;">${status.currentPos}</span><br/>
                会话: <span style="color: #4a6ee0;">${status.sessionUuid?.substring(0, 8) || 'N/A'}...</span>
            </div>
            
            <div style="margin-bottom: 6px;">
                <strong>后端状态:</strong><br/>
                位置: <span style="color: #f39c12;">${status.backendCurrentPos}</span><br/>
                会话: <span style="color: #f39c12;">${status.backendSessionUuid?.substring(0, 8) || 'N/A'}...</span>
            </div>
            
            <div style="margin-bottom: 6px;">
                <strong>历史记录 (${status.totalRecords}):</strong><br/>
                <div style="max-height: 120px; overflow-y: auto; border: 1px solid #333; padding: 2px; margin-top: 2px;">
                    ${recordsList || '<div style="opacity: 0.5;">无记录</div>'}
                </div>
            </div>
            
            <div style="opacity: 0.6; font-size: 10px; margin-top: 6px;">
                Ctrl+Shift+D 切换显示<br/>
                📄=大纲 📰=文章 🎯=当前
            </div>
        `;
    }
}

// Create global debug status manager instance for development access
const debugStatus = new DebugStatusManager();

// Expose debug status manager globally for console access during development
window.debugStatus = debugStatus; 