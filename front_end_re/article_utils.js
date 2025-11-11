 /*
 * article_utils.js - Common article and outline processing utility functions
 * 
 * This file contains shared utility functions between history_outline.js and generate_article.js
 * to reduce code duplication and improve maintainability.
 */

function ensureMarkdownStyles() {
    if (!document.getElementById('markdown-styles')) {
        const style = document.createElement('style');
        style.id = 'markdown-styles';
        style.textContent = `
            .content-display h1, .content-display h2, .content-display h3, .content-display h4, .content-display h5, .content-display h6 {
                margin: 1.5em 0 0.8em 0;
                font-weight: bold;
                line-height: 1.3;
                border-bottom: 1px solid #eee;
                padding-bottom: 0.3em;
            }
            .content-display h1 { 
                font-size: 1.8em; 
                color: #2c3e50; 
                border-bottom: 2px solid #3498db;
            }
            .content-display h2 { 
                font-size: 1.6em; 
                color: #34495e; 
                border-bottom: 1px solid #bdc3c7;
            }
            .content-display h3 { 
                font-size: 1.4em; 
                color: #34495e; 
                border-bottom: 1px solid #ecf0f1;
            }
            .content-display h4 { 
                font-size: 1.2em; 
                color: #34495e; 
                border-bottom: none;
            }
            .content-display h5 { 
                font-size: 1.1em; 
                color: #34495e; 
                border-bottom: none;
            }
            .content-display h6 { 
                font-size: 1.05em; 
                color: #34495e; 
                border-bottom: none;
            }
            
            .content-display strong { font-weight: bold; color: #2c3e50; }
            .content-display em { font-style: italic; color: #555; }
            
            .content-display code {
                background: #f4f4f4;
                border: 1px solid #ddd;
                border-radius: 3px;
                padding: 2px 5px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 0.9em;
                color: #c7254e;
            }
            
            .content-display pre {
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 12px;
                margin: 1em 0;
                overflow-x: auto;
            }
            
            .content-display pre code {
                background: none;
                border: none;
                padding: 0;
                color: #333;
            }
            
            .content-display ul, .content-display ol {
                margin: 1em 0;
                padding-left: 2em;
            }
            
            .content-display ul {
                list-style-type: disc;
            }
            
            .content-display ol {
                list-style-type: decimal;
            }
            
            .content-display li {
                margin: 0.5em 0;
                line-height: 1.6;
                padding-left: 0.3em;
            }
            
            .content-display ul li::marker {
                color: #3498db;
            }
            
            .content-display ol li::marker {
                color: #e74c3c;
                font-weight: bold;
            }
            
            .content-display a {
                color: #007bff;
                text-decoration: none;
                border-bottom: 1px solid transparent;
                transition: border-bottom-color 0.2s;
            }
            
            .content-display a:hover {
                border-bottom-color: #007bff;
            }
            
            .content-display p {
                margin: 1em 0;
                line-height: 1.6;
            }
            
            .content-display blockquote {
                border-left: 4px solid #ddd;
                margin: 1em 0;
                padding-left: 1em;
                color: #666;
                font-style: italic;
            }
            
            .content-display table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
                font-size: 14px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .content-display th,
            .content-display td {
                border: 1px solid #ddd;
                text-align: left;
                padding: 12px 8px;
                vertical-align: top;
            }
            
            .content-display th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #495057;
                border-bottom: 2px solid #dee2e6;
            }
            
            .content-display tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            
            .content-display tr:hover {
                background-color: #e9ecef;
            }
            
            .content-display hr {
                border: none;
                border-top: 2px solid #e9ecef;
                margin: 2em 0;
                background: none;
                height: 0;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Process Markdown tables
 * @param {string} text Text containing tables
 * @returns {string} Processed HTML
 */
function processMarkdownTables(text) {
    const tableRegex = /(?:^|\n)((?:\|.*\|[ \t]*(?:\n|$))+)/gm;
    
    return text.replace(tableRegex, (match, tableContent) => {
        const lines = tableContent.trim().split('\n');
        if (lines.length < 2) return match;
        
        const separatorLine = lines[1];
        if (!/^\|?[\s\-:|\|]+\|?$/.test(separatorLine.trim())) {
            return match;
        }
        
        const headerCells = parseTableRow(lines[0]);
        if (headerCells.length === 0) return match;
        
        const dataRows = [];
        for (let i = 2; i < lines.length; i++) {
            const cells = parseTableRow(lines[i]);
            if (cells.length > 0) {
                dataRows.push(cells);
            }
        }
        
        let tableHtml = '<table>\n<thead>\n<tr>';
        headerCells.forEach(cell => {
            tableHtml += `<th>${cell}</th>`;
        });
        tableHtml += '</tr>\n</thead>\n';
        
        if (dataRows.length > 0) {
            tableHtml += '<tbody>\n';
            dataRows.forEach(row => {
                tableHtml += '<tr>';
                row.forEach((cell, index) => {
                    if (index < headerCells.length) {
                        tableHtml += `<td>${cell}</td>`;
                    }
                });
                for (let j = row.length; j < headerCells.length; j++) {
                    tableHtml += '<td></td>';
                }
                tableHtml += '</tr>\n';
            });
            tableHtml += '</tbody>\n';
        }
        
        tableHtml += '</table>';
        return '\n' + tableHtml + '\n';
    });
}

/**
 * Parse table row, split cells
 * @param {string} row Table row text
 * @returns {Array<string>} Cell array
 */
function parseTableRow(row) {
    if (!row) return [];
    
    const cleanRow = row.trim().replace(/^\||\|$/g, '');
    if (!cleanRow) return [];
    
    const cells = cleanRow.split(/(?<!\\)\|/);
    
    return cells.map(cell => {
        return cell.trim().replace(/\\\|/g, '|');
    }).filter(cell => cell !== undefined);
}

/**
 * Simple markdown rendering function
 * @param {string} text Markdown text to render
 * @returns {string} Rendered HTML
 */
function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/^[\s]*(-{3,}|\*{3,}|_{3,})[\s]*$/gm, '<hr>');
    
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    html = html.replace(/\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_\n]+(?:_(?!_)[^_\n]*)*)__/g, '<strong>$1</strong>');
    
    html = html.replace(/\*([^*\n<]+)\*/g, function(match, content) {
        if (content.includes('<strong>') || content.includes('</strong>')) {
            return match;
        }
        return `<em>${content}</em>`;
    });
    html = html.replace(/_([^_\n<]+)_/g, function(match, content) {
        if (content.includes('<strong>') || content.includes('</strong>')) {
            return match;
        }
        return `<em>${content}</em>`;
    });
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    html = processMarkdownTables(html);
    
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    let listType = null;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        const isUnorderedListItem = /^[\s]*[-\*\+][\s]+(.+)$/.test(line);
        const isOrderedListItem = /^[\s]*\d+\.[\s]+(.+)$/.test(line);
        const isListItem = isUnorderedListItem || isOrderedListItem;
        
        if (isListItem) {
            const listContent = isUnorderedListItem 
                ? line.replace(/^[\s]*[-\*\+][\s]+/, '')
                : line.replace(/^[\s]*\d+\.[\s]+/, '');
            
            if (!inList) {
                inList = true;
                listType = isOrderedListItem ? 'ol' : 'ul';
                listItems = [];
            } else if ((isOrderedListItem && listType === 'ul') || 
                      (isUnorderedListItem && listType === 'ol')) {
                processedLines.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
                listType = isOrderedListItem ? 'ol' : 'ul';
                listItems = [];
            }
            
            listItems.push(listContent);
        } else {
            if (inList) {
                processedLines.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
                inList = false;
                listType = null;
                listItems = [];
            }
            
            if (trimmedLine) {
                processedLines.push(line);
            } else {
                processedLines.push(''); 
            }
        }
    }
    
    if (inList && listItems.length > 0) {
        processedLines.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
    }
    
    html = processedLines.join('\n');
    
    const paragraphs = html.split(/\n\s*\n/);
    
    html = paragraphs.map(paragraph => {
        paragraph = paragraph.trim();
        if (!paragraph) return '';
        
        if (/^<(h[1-6]|ul|ol|pre|blockquote|div|table|hr)(\s|>)/i.test(paragraph) ||
            /^<\/(h[1-6]|ul|ol|pre|blockquote|div|table|hr)>$/i.test(paragraph)) {
            return paragraph.replace(/\n/g, '<br>');
        }
        
        const processedParagraph = paragraph.replace(/\n/g, '<br>');
        return `<p>${processedParagraph}</p>`;
    }).filter(p => p).join('\n');
    
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<br\s*\/?>\s*<\/p>/g, '</p>');
    html = html.replace(/<p>\s*<br\s*\/?>/g, '<p>');
    
    return html;
}

/**
 * Format chapter content, support markdown rendering and reference processing
 * @param {string} content Chapter content
 * @param {Object} references Reference data for tooltip display {id: {content: string, title: string, url: string}}
 * @returns {string} Formatted HTML content
 */
function formatChapterContent(content, references) {
    ensureMarkdownStyles();
    
    if (!content || content.trim() === '') {
        return '<p style="color: #999; font-style: italic;">No content</p>';
    }
    
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('## ');
    });
    
    if (filteredLines.length === 0) {
        return '<p style="color: #999; font-style: italic;">No content</p>';
    }
    
    const filteredContent = filteredLines.join('\n');
    
    let htmlContent = renderMarkdown(filteredContent);
    
    if (references) {
        htmlContent = htmlContent.replace(/\[(\d+)\]/g, (match, refNum) => {
            const refData = references[refNum];
            if (refData && refData.content) {
                return `<span class="reference-marker" data-ref-id="${refNum}">${match}</span>`;
            }
            return match;
        });
    }
    
    return htmlContent || '<p style="color: #999; font-style: italic;">No content after formatting</p>';
}

/**
 * Convert HTML table to Markdown format
 * @param {HTMLElement} tableElement Table DOM element
 * @returns {string} Markdown format table
 */
function convertTableToMarkdown(tableElement) {
    if (!tableElement || tableElement.tagName.toLowerCase() !== 'table') {
        return '';
    }
    
    let markdown = '';
    const rows = tableElement.querySelectorAll('tr');
    
    if (rows.length === 0) return '';
    
    const headerRow = rows[0];
    const headerCells = headerRow.querySelectorAll('th, td');
    
    if (headerCells.length > 0) {
        const headerTexts = Array.from(headerCells).map(cell => {
            return cell.textContent.trim().replace(/\|/g, '\\|');
        });
        markdown += '| ' + headerTexts.join(' | ') + ' |\n';
        
        const separators = headerTexts.map(() => '---');
        markdown += '| ' + separators.join(' | ') + ' |\n';
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td, th');
            const cellTexts = Array.from(cells).map(cell => {
                return cell.textContent.trim().replace(/\|/g, '\\|');
            });
            
            while (cellTexts.length < headerTexts.length) {
                cellTexts.push('');
            }
            
            markdown += '| ' + cellTexts.slice(0, headerTexts.length).join(' | ') + ' |\n';
        }
    }
    
    return markdown;
}

/**
 * Convert HTML element back to Markdown format
 * @param {HTMLElement} element HTML element to convert
 * @returns {string} Markdown format text
 */
function htmlToMarkdown(element) {
    if (!element) return '';
    
    let markdown = '';
    
    for (let node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            markdown += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            switch (tagName) {
                case 'h1':
                    markdown += `# ${node.textContent.trim()}\n\n`;
                    break;
                case 'h2':
                    markdown += `## ${node.textContent.trim()}\n\n`;
                    break;
                case 'h3':
                    markdown += `### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h4':
                    markdown += `#### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h5':
                    markdown += `##### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h6':
                    markdown += `###### ${node.textContent.trim()}\n\n`;
                    break;
                case 'p':
                    const pContent = htmlToMarkdown(node);
                    if (pContent.trim()) {
                        markdown += `${pContent.trim()}\n\n`;
                    }
                    break;
                case 'strong':
                case 'b':
                    markdown += `**${htmlToMarkdown(node)}**`;
                    break;
                case 'em':
                case 'i':
                    markdown += `*${htmlToMarkdown(node)}*`;
                    break;
                case 'code':
                    if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') {
                        markdown += htmlToMarkdown(node);
                    } else {
                        markdown += `\`${node.textContent}\``;
                    }
                    break;
                case 'pre':
                    const codeElement = node.querySelector('code');
                    if (codeElement) {
                        markdown += `\`\`\`\n${codeElement.textContent}\n\`\`\`\n\n`;
                    } else {
                        markdown += `\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
                    }
                    break;
                case 'ul':
                    const ulItems = node.querySelectorAll('li');
                    ulItems.forEach(li => {
                        markdown += `- ${htmlToMarkdown(li).trim()}\n`;
                    });
                    markdown += '\n';
                    break;
                case 'ol':
                    const olItems = node.querySelectorAll('li');
                    olItems.forEach((li, index) => {
                        markdown += `${index + 1}. ${htmlToMarkdown(li).trim()}\n`;
                    });
                    markdown += '\n';
                    break;
                case 'li':
                    markdown += htmlToMarkdown(node);
                    break;
                case 'a':
                    const href = node.getAttribute('href');
                    const linkText = htmlToMarkdown(node);
                    if (href) {
                        markdown += `[${linkText}](${href})`;
                    } else {
                        markdown += linkText;
                    }
                    break;
                case 'blockquote':
                    const quoteContent = htmlToMarkdown(node).trim();
                    const quoteLines = quoteContent.split('\n');
                    quoteLines.forEach(line => {
                        markdown += `> ${line}\n`;
                    });
                    markdown += '\n';
                    break;
                case 'br':
                    markdown += '\n';
                    break;
                case 'hr':
                    markdown += '\n---\n\n';
                    break;
                case 'table':
                    markdown += convertTableToMarkdown(node) + '\n\n';
                    break;
                case 'thead':
                case 'tbody':
                case 'tr':
                case 'th':
                case 'td':
                    break;
                case 'span':
                    if (node.classList.contains('reference-marker')) {
                        markdown += node.textContent;
                    } else {
                        markdown += htmlToMarkdown(node);
                    }
                    break;
                default:
                    markdown += htmlToMarkdown(node);
                    break;
            }
        }
    }
    
    return markdown;
}

/**
 * Get current complete article content (markdown format)
 * @param {string} containerId Article container ID, default 'article-display-container'
 * @returns {string} Article content in markdown format
 */
function getCurrentArticleContent(containerId = 'article-display-container') {
    console.log('getCurrentArticleContent: Starting to get article content');
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('getCurrentArticleContent: Container not found');
        return '';
    }

    const chapterElements = container.querySelectorAll('.chapter-item');
    let articleContent = '';
    console.log('getCurrentArticleContent: Found chapter elements count:', chapterElements.length);

    chapterElements.forEach((chapterElement, index) => {
        const titleElement = chapterElement.querySelector('h3');
        const contentElement = chapterElement.querySelector('.content-display') || 
                              chapterElement.querySelector('.chapter-content');

        if (titleElement && contentElement) {
            const chapterTitle = titleElement.textContent.trim();
            
            const contentClone = contentElement.cloneNode(true);
            
            const tooltips = contentClone.querySelectorAll('.reference-tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
            
            const chapterContentMarkdown = htmlToMarkdown(contentClone);
            
            const cleanedContent = chapterContentMarkdown
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .trim();

            articleContent += `## ${chapterTitle}\n${cleanedContent}\n\n`;
        }
    });

    const titleElement = container.querySelector('h1');
    console.log('getCurrentArticleContent: Found container, title element:', titleElement);
    

    console.log('getCurrentArticleContent: Final article content length:', articleContent.length);
    console.log('getCurrentArticleContent: Article content preview:', articleContent.substring(0, 200));
    
    return articleContent.trim();
}




/**
 * Show global notification
 * @param {string} message Notification message
 * @param {string} type Notification type: 'info', 'success', 'error'
 */
function showNotification(message, type = 'info') {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.innerHTML = `@keyframes slideIn {from {right: -320px;} to {right: 20px;}}`;
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        max-width: 300px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Get current outline text
 * @returns {string} Outline text
 */
function getCurrentOutlineText() {
    const hiddenInput = document.getElementById('outlineData');
    if (hiddenInput && hiddenInput.value) {
        return hiddenInput.value;
    }
    
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return '';
    
    const outlineBlocks = sidebarNav.querySelectorAll('.outline-block .block-content');
    let outlineText = '';
    
    outlineBlocks.forEach(block => {
        const level = parseInt(block.parentElement.getAttribute('data-level') || '1');
        const prefix = '#'.repeat(level) + ' ';
        outlineText += prefix + block.textContent.trim() + '\n';
    });
    
    return outlineText.trim();
}


/**
 * Show regeneration dialog
 * @param {string} chapterTitle Chapter title
 * @param {string} currentContent Current chapter content
 * @param {Function} callback Callback function with user feedback as parameter
 */
function showRegenerateDialog(chapterTitle, currentContent, callback) {
    const existingDialog = document.getElementById('regenerateDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = 'regenerateDialog';
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
            padding: 32px;
            max-width: 580px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
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
                ">Regenerate</h3>
                <button onclick="document.getElementById('regenerateDialog').remove()" style="
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
                ">Chapter</label>
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    color: #495057;
                    font-size: 14px;
                    line-height: 1.4;
                ">${chapterTitle}</div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #495057;
                    font-size: 14px;
                ">Current Content</label>
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    max-height: 120px;
                    overflow-y: auto;
                    color: #6c757d;
                    font-size: 13px;
                    line-height: 1.5;
                ">${currentContent.substring(0, 500)}${currentContent.length > 500 ? '...' : ''}</div>
            </div>
            
            <div style="margin-bottom: 28px;">
                <label for="regenerateFeedback" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #495057;
                    font-size: 14px;
                ">Regeneration Instructions <span style="color: #dc3545;">*</span></label>
                <textarea 
                    id="regenerateFeedback" 
                    placeholder="Describe the changes you want to make to this chapter..."
                    style="
                        width: 100%;
                        height: 120px;
                        padding: 12px 16px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 14px;
                        font-family: inherit;
                        line-height: 1.5;
                        resize: vertical;
                        box-sizing: border-box;
                        /* 移除聚焦时的边框和阴影 */
                        outline: none;
                        transition: none;
                    " 
                    maxlength="1000"
                ></textarea>
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    align-items: flex-end;
                    margin-top: 2px;
                    font-size: 12px;
                    color: #6c757d;
                    height: 18px;
                ">
                    <span style="line-height: 1;"> <span id="charCount">0</span>/1000</span>
                </div>
            </div>
            
            <div style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            ">
                <button 
                    id="cancelRegenerate" 
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
                    id="confirmRegenerate" 
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
                >Regenerate</button>
            </div>
        </div>
    `;

    if (!document.getElementById('regenerate-textarea-style')) {
        const style = document.createElement('style');
        style.id = 'regenerate-textarea-style';
        style.textContent = `
            #regenerateFeedback:focus {
                border-color: #ced4da !important;
                box-shadow: none !important;
                outline: none !important;
            }
            
            #regenerateDialog > div {
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
            }
            
            #regenerateDialog > div::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            #regenerateDialog > div::-webkit-scrollbar-track {
                background: transparent;
                margin: 10px 0;
            }
            
            #regenerateDialog > div::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                border: 2px solid transparent;
            }
            
            #regenerateDialog > div::-webkit-scrollbar-thumb:hover {
                background-color: rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(dialog);

    const feedbackTextarea = document.getElementById('regenerateFeedback');
    const charCount = document.getElementById('charCount');
    const cancelBtn = document.getElementById('cancelRegenerate');
    const confirmBtn = document.getElementById('confirmRegenerate');

    feedbackTextarea.addEventListener('input', () => {
        const count = feedbackTextarea.value.length;
        charCount.textContent = count;
    });

    feedbackTextarea.focus();

    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    confirmBtn.addEventListener('click', () => {
        const feedback = feedbackTextarea.value.trim();
        if (!feedback) {
            showNotification('Please enter your modification suggestions.', 'error');
            return;
        }
        dialog.remove();
        callback(feedback);
    });

    feedbackTextarea.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const feedback = feedbackTextarea.value.trim();
            if (!feedback) {
                showNotification('Please enter your modification suggestions.', 'error');
                return;
            }
            dialog.remove();
            callback(feedback);
        }
    });
}


/**
 * Unified article save functionality
 * @param {string} articleContent Article content to save
 * @param {string} buttonId Save button ID
 * @param {boolean} isUpdate Whether it's an update operation (otherwise create new article)
 * @param {Object} references Reference data object {id: {content, title, url}}
 * @returns {Promise<boolean>} Returns true on successful save, false otherwise
 */
async function saveArticleToCloud(articleContent, buttonId, isUpdate = false, references = null) {
    if (!articleContent || articleContent === '# Generated Article') {
        showNotification('No article content to save', 'error');
        return false;
    }
    
    const saveBtn = document.getElementById(buttonId);
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    
    if (!document.getElementById('spin-animation-style')) {
        const style = document.createElement('style');
        style.id = 'spin-animation-style';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 5px;"></span>' + (isUpdate ? 'Updating...' : 'Saving...');
        }
        
        console.log(`${isUpdate ? 'Updating' : 'Saving'} article to cloud...`);
        console.log('Article content length:', articleContent.length);
        
        
        let referencesToSave = {};
        
        if (window.chapterDataStore && Object.keys(window.chapterDataStore).length > 0) {
            console.log('Found chapterDataStore in saveArticleToCloud:',
                        Object.keys(window.chapterDataStore).length, 'chapters');
            
            for (const [chapterIndex, chapterData] of Object.entries(window.chapterDataStore)) {
                if (chapterData && chapterData.references) {
                    const numericIndex = parseInt(chapterIndex, 10);
                    
                    console.log(`Processing references for chapter ${numericIndex}: ${chapterData.title || 'untitled'}`);
                    console.log(`Chapter ${numericIndex} has ${Object.keys(chapterData.references).length} references`);
                    
                    if (Object.keys(chapterData.references).length > 0) {
                        referencesToSave[numericIndex] = {};
                        
                        for (const [refId, refData] of Object.entries(chapterData.references)) {
                            referencesToSave[numericIndex][refId] = {
                                content: refData.content,
                                title: refData.title,
                                url: refData.url
                            };
                        }
                    }
                }
            }
            
            console.log(`Organized references by chapter:`, Object.keys(referencesToSave).length, 'chapters');
            console.log('References structure:', referencesToSave);
        }
        else if (references && Object.keys(references).length > 0) {
            console.log('Using passed references parameter');
            
            for (const [refId, refData] of Object.entries(references)) {
                if (refData && typeof refData.index === 'number') {
                    const chapterIndex = refData.index;
                    if (!referencesToSave[chapterIndex]) {
                        referencesToSave[chapterIndex] = {};
                    }
                    referencesToSave[chapterIndex][refId] = {
                        content: refData.content,
                        title: refData.title,
                        url: refData.url
                    };
                }
            }
        }
        
        console.log('Saving references for', Object.keys(referencesToSave).length, 'chapters');
        console.log('References to save:', referencesToSave);
        console.log('Article content preview:', articleContent);
        const response = await fetch('/api/session/article', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                article_content: articleContent,
                references: referencesToSave,
                pos: window.getCurrentPos ? window.getCurrentPos() : 0,
                mode: 'replace'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`Article ${isUpdate ? 'updated' : 'saved'} successfully:`, result);
        
        if (saveBtn) {
            saveBtn.innerHTML = isUpdate ? '✅ Updated & Saved!' : '✅ Saved!';
            saveBtn.style.background = '#28a745';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                saveBtn.style.background = '#28a745';
            }, 2000);
        }
        
        showNotification(`📄 Article ${isUpdate ? 'updated and saved to cloud' : 'saved'} successfully!`, 'success');
        return true;
        
    } catch (error) {
        console.error(`Error ${isUpdate ? 'updating' : 'saving'} article:`, error);
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '#28a745';
        }
        
        showNotification(`Failed to ${isUpdate ? 'update' : 'save'} article: ${error.message}`, 'error');
        return false;
    }
}


/**
 * Save modified article to history
 * @param {Function} getArticleContentFn Function to get article content, default is window.getCurrentArticleContent
 * @returns {Promise<boolean>} Returns true on successful save, false otherwise
 */
async function saveModifiedArticleToHistory(getArticleContentFn = null) {
    try {
        let articleContent;
        
        if (typeof getArticleContentFn === 'function') {
            articleContent = getArticleContentFn();
        } else if (typeof historyManager !== 'undefined' && 
                   typeof historyManager.getCurrentDisplayedArticleContent === 'function') {
            articleContent = historyManager.getCurrentDisplayedArticleContent();
        } else {
            articleContent = window.getCurrentArticleContent();
        }
        
        if (!articleContent) {
            console.warn('Unable to get article content, skipping save');
            return false;
        }

        const refsToSave = window.articleReferences || {};
        
        const response = await fetch('/api/session/article', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                article_content: articleContent,
                references: refsToSave,
                pos: window.getCurrentPos ? window.getCurrentPos() : 0,
                mode: 'replace'
            })
        });

        if (response.ok) {
            console.log('Modified article saved to current session position');
            return true;
        } else {
            console.error('Failed to save article to session');
            return false;
        }
    } catch (error) {
        console.error('Error saving article to history:', error);
        return false;
    }
}

window.saveModifiedArticleToHistory = saveModifiedArticleToHistory;

/**
 * Toggle chapter expand/collapse
 * @param {number} chapterIndex Chapter index
 */
function toggleChapter(chapterIndex) {
    const chapterElement = document.getElementById(`chapter-${chapterIndex}`);
    if (!chapterElement) return;
    
    const contentDiv = chapterElement.querySelector('.chapter-content');
    const toggleIcon = chapterElement.querySelector('.chapter-toggle');
    const header = chapterElement.querySelector('.chapter-header');
    
            if (contentDiv.style.display === 'none') {
            contentDiv.style.display = 'block';
            toggleIcon.textContent = '▼';
            toggleIcon.style.transform = 'rotate(0deg)';
            header.style.borderBottom = '1px solid #f0f0f0';
        } else {
            contentDiv.style.display = 'none';
            toggleIcon.textContent = '▶';
            toggleIcon.style.transform = 'rotate(0deg)';
            header.style.borderBottom = 'none';
        }
}

/**
 * Expand/collapse all chapters
 * @param {boolean} expand Whether to expand
 */
function toggleAllChapters(expand) {
    const chapterElements = document.querySelectorAll('.chapter-item');
    
    chapterElements.forEach((element, index) => {
        const contentDiv = element.querySelector('.chapter-content');
        const toggleIcon = element.querySelector('.chapter-toggle');
        const header = element.querySelector('.chapter-header');
        
        if (expand) {
            contentDiv.style.display = 'block';
            toggleIcon.textContent = '▼';
            header.style.borderBottom = '1px solid #f0f0f0';
        } else {
            contentDiv.style.display = 'none';
            toggleIcon.textContent = '▶';
            header.style.borderBottom = 'none';
        }
    });
}


/**
 * Display chapter network error with retry button
 * @param {Object} errorData Error data containing index, title, error, error_type
 */
function displayChapterNetworkError(errorData) {
    const container = document.getElementById('article-display-container');
    
    const errorElement = document.createElement('div');
    errorElement.id = `chapter-error-${errorData.index}`;
    errorElement.className = 'chapter-error network-error';
    errorElement.dataset.index = errorData.index;
    errorElement.style.cssText = `
        border: 1px solid #ffcdd2;
        border-radius: 8px;
        margin: 15px 0;
        padding: 20px;
        background: #ffebee;
        color: #d32f2f;
        position: relative;
    `;
    
    errorElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #d32f2f;">⚠️ ${errorData.title || `Chapter ${errorData.index + 1}`} - Network Error</h3>
            <div>
                <button onclick="retryChapterGeneration(${errorData.index})" class="retry-btn" style="
                    background: #ff9800; 
                    color: white; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-weight: bold;
                    transition: all 0.3s ease;
                ">🔄 Retry</button>
            </div>
        </div>
        <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Error Type:</strong> Network/Connection Error</p>
            <p style="margin: 5px 0;"><strong>Error Details:</strong> ${errorData.error}</p>
            <p style="margin: 5px 0; color: #666; font-style: italic;">This error is usually caused by network connectivity issues or server timeouts. Click the Retry button to attempt generation again.</p>
        </div>
        <div class="retry-status" style="display: none; padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;">
            <span class="retry-message">Retrying...</span>
        </div>
    `;
    
    const retryBtn = errorElement.querySelector('.retry-btn');
    
    if (retryBtn) {
        retryBtn.addEventListener('mouseenter', () => retryBtn.style.background = '#f57c00');
        retryBtn.addEventListener('mouseleave', () => retryBtn.style.background = '#ff9800');
    }
    
    const existingElements = container.querySelectorAll('.chapter-item, .chapter-error');
    let insertPosition = null;
    
    for (let i = 0; i < existingElements.length; i++) {
        const element = existingElements[i];
        const elementIndex = parseInt(element.dataset.index || element.id?.match(/\d+/)?.[0] || '0');
        if (elementIndex > errorData.index) {
            insertPosition = element;
            break;
        }
    }
    
    if (insertPosition) {
        container.insertBefore(errorElement, insertPosition);
    } else {
        container.appendChild(errorElement);
    }
    
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Display article generation completion interface
 */
/**
 * Display article generation completion interface
 * @param {Array} chapters Chapter data array
 * @param {Object} options Optional configuration
 * @param {boolean} options.updateTitle Whether to update title, default is true
 * @param {string} options.title Custom title, default is 'Finished!'
 */
function displayArticleComplete(chapters, options = {}) {
    const container = document.getElementById('article-display-container');
    
    if (!container) {
        console.error('article-display-container not found, cannot display article complete section');
        return;
    }
    
    const existingIndicators = container.querySelectorAll('.generating-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    const defaultOptions = {
        updateTitle: true,
        title: 'Finished!'
    };
    
    const finalOptions = {...defaultOptions, ...options};
    
    if (finalOptions.updateTitle) {
        const titleElement = container.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = finalOptions.title;
            titleElement.style.color = '#4caf50';
        }
    }
    
    if (typeof window.setSendButtonCompleted === 'function') {
        window.setSendButtonCompleted();
    }
    
    const completeElement = document.createElement('div');
    completeElement.style.cssText = `
        text-align: center;
        padding: 20px;
        margin: 20px 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
    `;
    
    completeElement.innerHTML = `
        <h3>🎉 All chapters generated successfully!</h3>
        <div style="margin-top: 15px;">
            <button onclick="toggleAllChapters(true)" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; margin: 0 5px; border-radius: 6px; cursor: pointer;">Expand All</button>
            <button onclick="toggleAllChapters(false)" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; margin: 0 5px; border-radius: 6px; cursor: pointer;">Collapse All</button>
        </div>
        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
            <h4 style="margin: 0 0 10px 0; font-size: 16px;">Save to Cloud:</h4>
            <button id="save-article-btn" onclick="saveCompleteArticle()" style="background: #28a745; color: white; border: none; padding: 10px 20px; margin: 0 5px; border-radius: 6px; cursor: pointer; font-weight: bold;">💾 Save Article to Cloud</button>
        </div>
        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
            <h4 style="margin: 0 0 10px 0; font-size: 16px;">Export Options:</h4>
            <button onclick="exportChaptersPDF()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 6px; cursor: pointer;">📄 PDF</button>
            <button onclick="exportChaptersWord()" style="background: #0d6efd; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 6px; cursor: pointer;">📝 Word</button>
            <button onclick="exportArticle()" style="background: #198754; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 6px; cursor: pointer;">📄 TXT</button>
        </div>
    `;
    
    container.appendChild(completeElement);
}

/**
 * Clear existing article container
 * @returns {boolean} Returns true if container was cleared, false otherwise
 */
function clearArticleContainer() {
    console.log('clearArticleContainer: 开始检查是否有需要清空的文章容器');
    const existingContainer = document.getElementById('article-display-container');
    if (existingContainer) {
        console.log('clearArticleContainer: 找到已存在的文章容器，准备删除');
        console.log('clearArticleContainer: 容器内容预览:', existingContainer.textContent.substring(0, 100));
        existingContainer.remove();
        console.log('clearArticleContainer: 文章容器已成功删除');
        return true;
    } else {
        console.log('clearArticleContainer: 没有找到需要清空的文章容器');
    }
    return false;
}

/**
 * Create and initialize article display container
 * @param {string} title Article title, default is "Generated Article"
 * @param {string} titleColor Title color, default is "#4caf50"
 * @returns {HTMLElement} Created article container element
 */
function createArticleContainer(title = "Generated Article", titleColor = "#4caf50") {
    let existingContainer = document.getElementById('article-display-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const articleContainer = document.createElement('div');
    articleContainer.id = 'article-display-container';
    articleContainer.className = 'article-display-container';
    articleContainer.style.cssText = `
        width: 68%;
        max-width: 70vw;
        margin: 4.6vh auto 2.3vh auto;
        padding: 1.3vw;
        background: #fff;
        border-radius: 0.53vw;
        box-shadow: 0 0.46vh 1.74vh rgba(0,0,0,0.1);
        position: relative;
        z-index: 1;
    `;

    const titleElement = document.createElement('h1');
    titleElement.textContent = title;
    titleElement.style.cssText = `
        text-align: center;
        color: ${titleColor};
        margin-bottom: 30px;
        font-size: 26.7px;
    `;
    articleContainer.appendChild(titleElement);

    return articleContainer;
}


window.createArticleContainer = createArticleContainer;
window.formatChapterContent = formatChapterContent;
window.getCurrentArticleContent = getCurrentArticleContent;
window.showNotification = showNotification;
window.getCurrentOutlineText = getCurrentOutlineText;
window.showRegenerateDialog = showRegenerateDialog;
window.toggleChapter = toggleChapter;
/**
 * Save complete article to cloud (for save button in completion interface)
 */
async function saveCompleteArticle() {
    try {
        const articleContent = getCurrentArticleContent();
        if (!articleContent || articleContent.trim() === '' || articleContent === '# Generated Article') {
            showNotification('No article content to save', 'error');
            return;
        }
        await saveArticleToCloud(articleContent, 'save-article-btn', false);
    } catch (error) {
        console.error('Error in saveCompleteArticle:', error);
        showNotification(`Failed to save article: ${error.message}`, 'error');
    }
}


/**
 * Save complete article to history (for auto-save)
 */
async function saveCompleteArticleToHistory() {
    try {
        const articleContent = getCurrentArticleContent();
        if (!articleContent || articleContent.trim() === '' || articleContent === '# Generated Article') {
            console.log('No article content to save to history');
            return false;
        }
        console.log('Saving complete article to history...');
        const result = await saveArticleToCloud(articleContent, null, false);
        return result;
    } catch (error) {
        console.error('Error in saveCompleteArticleToHistory:', error);
        return false;
    }
}

window.toggleAllChapters = toggleAllChapters;
window.displayChapterNetworkError = displayChapterNetworkError;
window.displayArticleComplete = displayArticleComplete;
window.saveArticleToCloud = saveArticleToCloud;
window.saveCompleteArticle = saveCompleteArticle;
window.saveCompleteArticleToHistory = saveCompleteArticleToHistory;
window.clearArticleContainer = clearArticleContainer;
window.retryChapterGeneration = retryChapterGeneration;


/**
 * Create standard chapter DOM element
 * @param {Object} chapterData Chapter data containing title and content
 * @param {number} index Chapter index
 * @param {string} mode Mode, optional values: 'generation' (generation mode), 'history' (history mode)
 * @returns {HTMLElement} Created chapter DOM element
 */
function createChapterElement(chapterData, index, mode = 'generation') {
    const chapterElement = document.createElement('div');
    chapterElement.id = `chapter-${index}`;
    chapterElement.className = 'chapter-item';
    chapterElement.dataset.index = index;
    
    const content = chapterData.content || '';
    const references = chapterData.references || {};
    const formattedContent = formatChapterContent(content, references);
    console.log(`chapterData.content: ${chapterData.content}`);

    const isHistory = mode === 'history';
    const statusText = isHistory ? 'Historical' : 'Completed';
    const statusColor = isHistory ? '#6c757d' : '#28a745';
    
    if (window.saveChapterData && references && Object.keys(references).length > 0) {
        window.saveChapterData({
            index: index,
            references: references,
            title: chapterData.title || `Chapter ${index + 1}`,
            originalContent: content
        });
        
        chapterElement.setAttribute('data-references', JSON.stringify(references));
    }
    
    chapterElement.innerHTML = `
        <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: #f9f9f9; border-radius: 8px 8px 0 0; border-bottom: 1px solid #f0f0f0;">
            <div style="display: flex; align-items: center; flex: 1;">
                <span class="chapter-toggle" style="cursor: pointer; margin-right: 10px; transition: transform 0.3s; display: inline-block; width: 20px; text-align: center;">▼</span>
                <h3 style="margin: 0; padding: 0; font-size: 18px; color: #333;">${chapterData.title || `Chapter ${index + 1}`}</h3>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="chapter-status" style="padding: 3px 8px; border-radius: 12px; background: ${statusColor}; color: white; font-size: 12px; margin-right: 15px;">${statusText}</span>
                <button onclick="editChapter(${index})" class="edit-btn" style="background: #0d6efd; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">Edit</button>
                <button onclick="regenerateChapter(${index})" class="regenerate-btn" style="background: #6610f2; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Regenerate</button>
            </div>
        </div>
        <div class="chapter-content" style="padding: 15px; background: white; border-radius: 0 0 8px 8px; border: 1px solid #f0f0f0; border-top: none;">
            <div class="content-display">${formattedContent}</div>
        </div>
    `;
    
    const toggleBtn = chapterElement.querySelector('.chapter-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => toggleChapter(index));
    }
    
    return chapterElement;
}

/**
 * Edit chapter
 * @param {number} chapterIndex Chapter index
 */
function editChapter(chapterIndex) {
    const chapterElement = document.getElementById(`chapter-${chapterIndex}`);
    if (!chapterElement) return;
    
    const titleElement = chapterElement.querySelector('h3');
    const chapterTitle = titleElement ? titleElement.textContent.trim() : `Chapter ${chapterIndex + 1}`;
    
    const displayDiv = chapterElement.querySelector('.content-display');
    let currentContent = '';
    
    const chapterData = window.getChapterData?.(chapterIndex) || {};
    if (chapterData.originalContent) {
        currentContent = chapterData.originalContent;
    } else if (displayDiv) {
        currentContent = displayDiv.innerText.replace(/\[\d+\][\s\S]*?(?=\[\d+\]|$)/g, match => {
            const refMark = match.match(/\[\d+\]/);
            return refMark ? refMark[0] : '';
        });
    }
    
    showChapterEditDialog(chapterIndex, chapterTitle, currentContent);
}

/**
 * Show chapter edit dialog
 * @param {number} chapterIndex Chapter index
 * @param {string} chapterTitle Chapter title
 * @param {string} currentContent Current chapter content
 */
function showChapterEditDialog(chapterIndex, chapterTitle, currentContent) {
    const existingDialog = document.getElementById('chapterEditDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = 'chapterEditDialog';
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
            padding: 32px;
            max-width: 580px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1);
            border: 1px solid #e9ecef;
            scrollbar-width: thin;
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
                ">Edit</h3>
                <button onclick="document.getElementById('chapterEditDialog').remove()" style="
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
                ">Chapter</label>
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    color: #495057;
                    font-size: 14px;
                    line-height: 1.4;
                ">${chapterTitle}</div>
            </div>
            
            <div style="margin-bottom: 28px;">
                <label for="editContent" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #495057;
                    font-size: 14px;
                ">Content</label>
                <textarea 
                    id="editContent" 
                    placeholder="Edit your chapter content..."
                    style="
                        width: 100%;
                        height: 300px;
                        padding: 12px 16px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 14px;
                        font-family: inherit;
                        line-height: 1.5;
                        resize: vertical;
                        box-sizing: border-box;
                        /* 移除聚焦时的边框和阴影 */
                        outline: none;
                        transition: none;
                    " 
                >${currentContent}</textarea>
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    align-items: flex-end;
                    margin-top: 2px;
                    font-size: 12px;
                    color: #6c757d;
                    height: 18px;
                ">
                    <span style="line-height: 1;"><span id="editCharCount">${currentContent.length}</span> characters</span>
                </div>
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
                >Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    if (!document.getElementById('edit-dialog-style')) {
        const style = document.createElement('style');
        style.id = 'edit-dialog-style';
        style.textContent = `
            #editContent:focus {
                border-color: #ced4da !important;
                box-shadow: none !important;
                outline: none !important;
            }
            
            #chapterEditDialog > div {
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
            }
            
            #chapterEditDialog > div::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            #chapterEditDialog > div::-webkit-scrollbar-track {
                background: transparent;
                margin: 10px 0;
            }
            
            #chapterEditDialog > div::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                border: 2px solid transparent;
            }
            
            #chapterEditDialog > div::-webkit-scrollbar-thumb:hover {
                background-color: rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    const editTextarea = document.getElementById('editContent');
    const charCount = document.getElementById('editCharCount');
    const cancelBtn = document.getElementById('cancelEdit');
    const confirmBtn = document.getElementById('confirmEdit');

    editTextarea.addEventListener('input', () => {
        const count = editTextarea.value.length;
        charCount.textContent = count;
    });

    editTextarea.focus();

    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    confirmBtn.addEventListener('click', () => {
        const newContent = editTextarea.value.trim();
        dialog.remove();
        
        saveEditedChapterContent(chapterIndex, newContent);
    });

    editTextarea.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const newContent = editTextarea.value.trim();
            dialog.remove();
            saveEditedChapterContent(chapterIndex, newContent);
        }
    });
}

/**
 * Save edited chapter content
 * @param {number} chapterIndex Chapter index
 * @param {string} newContent New chapter content
 */
function saveEditedChapterContent(chapterIndex, newContent) {
    const chapterElement = document.getElementById(`chapter-${chapterIndex}`);
    if (!chapterElement) return;
    
    const displayDiv = chapterElement.querySelector('.content-display');
    if (!displayDiv) return;
    
    const chapterData = window.getChapterData?.(chapterIndex) || {};
    const references = chapterData.references || {};
    
    displayDiv.innerHTML = formatChapterContent(newContent, references);
    
    if (window.saveChapterData) {
        window.saveChapterData({
            ...chapterData,
            index: chapterIndex,
            originalContent: newContent
        });
    }
    
    saveModifiedArticleToHistory();
    
    showNotification('Chapter content saved successfully', 'success');
}

window.createChapterElement = createChapterElement;
window.editChapter = editChapter;
window.showChapterEditDialog = showChapterEditDialog;
window.saveEditedChapterContent = saveEditedChapterContent;


/**
 * Create chapter generation indicator
 * @param {number} chapterIndex Chapter index
 * @param {string} chapterTitle Chapter title
 * @returns {HTMLElement} Created chapter generation indicator element
 */
function createGeneratingChapterElement(chapterIndex, chapterTitle) {
    const chapterElement = document.createElement('div');
    chapterElement.id = `chapter-${chapterIndex}`;
    chapterElement.className = 'chapter-item generating';
    chapterElement.dataset.index = chapterIndex;
    
    chapterElement.innerHTML = `
        <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: #f9f9f9; border-radius: 8px 8px 0 0; border-bottom: 1px solid #f0f0f0;">
            <div style="display: flex; align-items: center; flex: 1;">
                <span class="chapter-toggle" style="cursor: pointer; margin-right: 10px; transition: transform 0.3s; display: inline-block; width: 20px; text-align: center;">▼</span>
                <h3 style="margin: 0; padding: 0; font-size: 18px; color: #333;">${chapterTitle || `Chapter ${chapterIndex + 1}`}</h3>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="generating-indicator" style="padding: 3px 8px; border-radius: 12px; background: #fd7e14; color: white; font-size: 12px; margin-right: 15px; display: flex; align-items: center;">
                    <span class="spinner" style="display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; margin-right: 5px; animation: spin 1s linear infinite;"></span>
                    Generating...
                </span>
            </div>
        </div>
        <div class="chapter-content" style="padding: 15px; background: white; border-radius: 0 0 8px 8px; border: 1px solid #f0f0f0; border-top: none;">
            <div class="content-display">
                <div style="text-align: center; padding: 20px; color: #666;">
                    <div class="wave-loader" style="margin-bottom: 15px;">
                        <span style="display: inline-block; width: 5px; height: 30px; background: #ddd; margin: 0 3px; border-radius: 3px; animation: wave 1s ease-in-out infinite; animation-delay: 0s;"></span>
                        <span style="display: inline-block; width: 5px; height: 30px; background: #ddd; margin: 0 3px; border-radius: 3px; animation: wave 1s ease-in-out infinite; animation-delay: 0.1s;"></span>
                        <span style="display: inline-block; width: 5px; height: 30px; background: #ddd; margin: 0 3px; border-radius: 3px; animation: wave 1s ease-in-out infinite; animation-delay: 0.2s;"></span>
                        <span style="display: inline-block; width: 5px; height: 30px; background: #ddd; margin: 0 3px; border-radius: 3px; animation: wave 1s ease-in-out infinite; animation-delay: 0.3s;"></span>
                        <span style="display: inline-block; width: 5px; height: 30px; background: #ddd; margin: 0 3px; border-radius: 3px; animation: wave 1s ease-in-out infinite; animation-delay: 0.4s;"></span>
                    </div>
                    <div style="font-size: 16px;">Generating content for this chapter...</div>
                    <div style="font-size: 14px; color: #888; margin-top: 10px;">This may take up to 1-2 minutes</div>
                </div>
            </div>
        </div>
    `;
    
    if (!document.getElementById('wave-animation')) {
        const style = document.createElement('style');
        style.id = 'wave-animation';
        style.textContent = `
            @keyframes wave {
                0%, 40%, 100% {
                    transform: scaleY(0.5);
                }
                20% {
                    transform: scaleY(1);
                }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    return chapterElement;
}

window.createGeneratingChapterElement = createGeneratingChapterElement;

/**
 * Unified chapter regeneration handler function
 * @param {number} chapterIndex Chapter index
 * @returns {void}
 */
function regenerateChapter(chapterIndex) {
    const chapterElement = document.getElementById(`chapter-${chapterIndex}`);
    if (!chapterElement) {
        showNotification('Chapter not found', 'error');
        return;
    }

    console.log('Chapter element found:', chapterElement);

    let chapterTitleElement = chapterElement.querySelector('h3');
    if (!chapterTitleElement) {
        chapterTitleElement = chapterElement.querySelector('.chapter-title');
    }
    if (!chapterTitleElement) {
        chapterTitleElement = chapterElement.querySelector('[class*="title"]');
    }

    let chapterContentElement = chapterElement.querySelector('.content-display');
    if (!chapterContentElement) {
        chapterContentElement = chapterElement.querySelector('.chapter-content');
    }
    if (!chapterContentElement) {
        chapterContentElement = chapterElement.querySelector('[class*="content"]');
    }

    console.log('Title element:', chapterTitleElement);
    console.log('Content element:', chapterContentElement);
    
    if (!chapterTitleElement || !chapterContentElement) {
        console.error('Available elements in chapter:', {
            allElements: chapterElement.querySelectorAll('*'),
            h3Elements: chapterElement.querySelectorAll('h3'),
            contentElements: chapterElement.querySelectorAll('[class*="content"]'),
            titleElements: chapterElement.querySelectorAll('[class*="title"]')
        });
        showNotification('Chapter title or content not found. Check console for details.', 'error');
        return;
    }

    const chapterTitle = chapterTitleElement.textContent.trim();
    const currentContent = chapterContentElement.textContent.trim();

    console.log('Chapter title:', chapterTitle);
    console.log('Current content length:', currentContent.length);

    showRegenerateDialog(chapterTitle, currentContent, (feedback) => {
        const event = new CustomEvent('regenerate-chapter-feedback', { 
            detail: { 
                chapterIndex,
                chapterTitle,
                currentContent,
                feedback 
            }
        });
        document.dispatchEvent(event);
    });
}

window.regenerateChapter = regenerateChapter;

/**
 * Regenerate chapter based on user feedback
 * @param {number} chapterIndex Chapter index
 * @param {string} chapterTitle Chapter title
 * @param {string} currentContent Current chapter content
 * @param {string} feedback User modification feedback
 * @param {Function} saveCallback Optional save callback function for custom save logic
 * @returns {Promise<void>}
 */
async function regenerateChapterWithFeedback(chapterIndex, chapterTitle, currentContent, feedback, saveCallback = null) {
    console.log('Regenerating chapter:', { chapterIndex, chapterTitle, feedback });

    const chapterElement = document.getElementById(`chapter-${chapterIndex}`);
    const contentElement = chapterElement?.querySelector('.content-display');
    
    if (!chapterElement || !contentElement) {
        showNotification('Unable to find chapter element', 'error');
        return;
    }

    const originalContent = contentElement.innerHTML;
    
    contentElement.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 18px; margin-bottom: 10px;">Modifying chapter content based on your suggestions...</div>
            <div style="font-size: 14px; opacity: 0.8;">Please wait</div>
        </div>
    `;

    try {
        const requestData = {
            type: 'polish_section',
            section_title: chapterTitle,
            section_content: currentContent,
            feedback: feedback,
            chapter_index: chapterIndex,
            title: 'Modified Chapter',
            pos: window.getCurrentPos ? window.getCurrentPos() : 0
        };

        const response = await fetch('/api/generate/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Network request failed: ${response.status}`);
        }

        const data = await response.json();
        let modifiedContent = '';
        let references = {};

        if (data && typeof data === 'object') {
            if (data.result && typeof data.result === 'object') {
                modifiedContent = data.result.content || '';
                references = data.result.references || {};
            } else if (data.result && typeof data.result === 'string') {
                modifiedContent = data.result;
            } else if (data.content) {
                modifiedContent = data.content;
                references = data.references || {};
            }
        } else {
            modifiedContent = await response.text();
        }

        if (modifiedContent.trim()) {
            contentElement.innerHTML = formatChapterContent(modifiedContent, references);
            
            const chapterData = {
                index: parseInt(chapterIndex),
                originalContent: modifiedContent,
                references: references
            };
            
            if (window.saveChapterData) {
                window.saveChapterData(chapterData);
            }
            
            if (Object.keys(references).length > 0) {
                chapterElement.setAttribute('data-references', JSON.stringify(references));
            }
            
            showNotification('Chapter modification completed!', 'success');
            
            if (typeof saveCallback === 'function') {
                await saveCallback();
            }
        } else {
            throw new Error('Modified content is empty');
        }

    } catch (error) {
        console.error('Chapter modification failed:', error);
        
        contentElement.innerHTML = originalContent;
        
        showNotification(`Chapter modification failed: ${error.message}`, 'error');
    }
}

window.regenerateChapterWithFeedback = regenerateChapterWithFeedback;

/**
 * Retry chapter generation
 * @param {number} chapterIndex Chapter index
 */
async function retryChapterGeneration(chapterIndex) {
    console.log(`重试生成章节 ${chapterIndex + 1}`);
    
    const errorElement = document.getElementById(`chapter-error-${chapterIndex}`);
    if (!errorElement) return;
    
    const retryStatus = errorElement.querySelector('.retry-status');
    const retryBtn = errorElement.querySelector('.retry-btn');

    if (retryStatus && retryBtn) {
        retryStatus.style.display = 'block';
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.5';
        
        const skipBtn = errorElement.querySelector('.skip-btn');
        const continueBtn = errorElement.querySelector('.continue-btn');
        if (skipBtn) {
            skipBtn.disabled = true;
            skipBtn.style.opacity = '0.5';
        }
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
        }
        
        retryStatus.innerHTML = `
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #1976d2; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></span>
            Retrying chapter generation...
        `;
    }
    
    try {
        const outlineData = window.getCurrentOutlineText();
        
        const response = await fetch('/api/generate/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'generate_single_chapter',
                outline: outlineData,
                chapter_index: chapterIndex,
                topic: window.currentTopic || "",
                pos: window.getCurrentPos ? window.getCurrentPos() : 0
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result && !result.error && result.content) {
            errorElement.remove();
            
            const chapterData = {
                index: chapterIndex,
                title: result.title || `Chapter ${chapterIndex + 1}`,
                content: result.content,
                references: result.references || {}
            };
            
            if (window.saveChapterData && chapterData.references) {
                window.saveChapterData(chapterData);
            }
            
            const chapterElement = createChapterElement(chapterData, chapterIndex);
            
            const container = document.getElementById('article-display-container');
            const existingElements = container.querySelectorAll('.chapter-item, .chapter-error');
            let insertPosition = null;
            
            for (let i = 0; i < existingElements.length; i++) {
                const element = existingElements[i];
                const elementIndex = parseInt(element.dataset.index || element.id?.match(/\d+/)?.[0] || '0');
                if (elementIndex > chapterIndex) {
                    insertPosition = element;
                    break;
                }
            }
            
            if (insertPosition) {
                container.insertBefore(chapterElement, insertPosition);
            } else {
                container.appendChild(chapterElement);
            }
            
            showNotification(`Chapter ${chapterIndex + 1} generated successfully!`, 'success');
            
            const chapters = outlineData.split('\n').filter(line => line.trim().startsWith('#'));
            const hasRemainingChapters = chapterIndex + 1 < chapters.length;
            
            if (hasRemainingChapters) {
                if (typeof window.totalChapters === 'undefined') {
                    window.totalChapters = chapters.length;
                }
                if (typeof window.completedChaptersCount === 'undefined') {
                    window.completedChaptersCount = chapterIndex + 1;
                }
                
                showNotification(`Continuing with remaining chapters...`, 'info');
                setTimeout(() => {
                    if (window.continueGenerationFromChapter) {
                        window.continueGenerationFromChapter(chapterIndex + 1);
                    }
                }, 1000);
            } else {
                if (window.displayArticleComplete) {
                    showNotification('All chapters generated successfully!', 'success');
                    window.displayArticleComplete([]);
                }
            }
            
        } else if (result && result.error) {
            if (result.error_type === 'network') {
                if (retryStatus && retryBtn) {
                    retryStatus.style.display = 'none';
                    retryBtn.disabled = false;
                    retryBtn.style.opacity = '1';
                    
                    const skipBtn = errorElement.querySelector('.skip-btn');
                    const continueBtn = errorElement.querySelector('.continue-btn');
                    if (skipBtn) {
                        skipBtn.disabled = false;
                        skipBtn.style.opacity = '1';
                    }
                    if (continueBtn) {
                        continueBtn.disabled = false;
                        continueBtn.style.opacity = '1';
                    }
                }
                
                showNotification(`Chapter ${chapterIndex + 1} retry failed. Try "Continue from here" to generate all remaining chapters.`, 'warning');
            } else {
                throw new Error(result.error_message || 'Retry failed');
            }
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error(`重试章节 ${chapterIndex + 1} 失败:`, error);
        
        if (retryStatus && retryBtn) {
            retryStatus.style.display = 'none';
            retryBtn.disabled = false;
            retryBtn.style.opacity = '1';
            
            const skipBtn = errorElement.querySelector('.skip-btn');
            const continueBtn = errorElement.querySelector('.continue-btn');
            if (skipBtn) {
                skipBtn.disabled = false;
                skipBtn.style.opacity = '1';
            }
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.style.opacity = '1';
            }
        }
        
        const errorMessage = error.message;
        const isStillNetworkError = ['timeout', 'connection', 'network', 'http'].some(
            indicator => errorMessage.toLowerCase().includes(indicator)
        );
        
        if (isStillNetworkError) {
            showNotification(`Chapter ${chapterIndex + 1} retry failed due to network issues. Please try again later.`, 'error');
        } else {
            showNotification(`Chapter ${chapterIndex + 1} retry failed: ${errorMessage}`, 'error');
        }
    }
}

/**
 * Skip chapter generation
 * @param {number} chapterIndex Chapter index
 */
function skipChapter(chapterIndex) {
    console.log(`跳过章节 ${chapterIndex + 1}`);
    
    const errorElement = document.getElementById(`chapter-error-${chapterIndex}`);
    if (!errorElement) return;
    
    if (confirm(`Are you sure you want to skip Chapter ${chapterIndex + 1}? You can always generate it later.`)) {
        const container = document.getElementById('article-display-container');
        
        const skippedElement = document.createElement('div');
        skippedElement.id = `chapter-${chapterIndex}`;
        skippedElement.className = 'chapter-item skipped';
        skippedElement.dataset.index = chapterIndex;
        skippedElement.style.cssText = `
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin: 15px 0;
            opacity: 0.7;
        `;
        
        const chapterTitle = errorElement.querySelector('h3').textContent.split(' - ')[0].replace('⚠️ ', '');
        
        skippedElement.innerHTML = `
            <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: #f5f5f5; border-radius: 8px 8px 0 0;">
                <div style="display: flex; align-items: center; flex: 1;">
                    <span style="margin-right: 10px;">⏭️</span>
                    <h3 style="margin: 0; color: #666;">${chapterTitle}</h3>
                </div>
                <div style="display: flex; align-items: center;">
                    <span style="padding: 3px 8px; border-radius: 12px; background: #6c757d; color: white; font-size: 12px; margin-right: 15px;">Skipped</span>
                    <button onclick="retryChapterGeneration(${chapterIndex})" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Generate Now</button>
                </div>
            </div>
            <div class="chapter-content" style="padding: 15px; background: #fafafa; border-radius: 0 0 8px 8px; text-align: center; color: #666;">
                <p style="margin: 0; font-style: italic;">This chapter was skipped due to generation issues. Click "Generate Now" to try again.</p>
            </div>
        `;
        
        errorElement.replaceWith(skippedElement);
        
        showNotification(`Chapter ${chapterIndex + 1} skipped. You can generate it later.`, 'info');
    }
}

/**
 * Continue article generation from specified chapter
 * @param {number} startChapterIndex Starting chapter index
 */
async function continueGenerationFromChapter(startChapterIndex) {
    console.log(`从章节 ${startChapterIndex + 1} 开始继续生成文章`);
    
    try {
        const outlineData = window.getCurrentOutlineText();
        
        const chapters = outlineData.split('\n').filter(line => line.trim().startsWith('#'));
    const remainingChapters = chapters.length - startChapterIndex;
    
    if (typeof window.totalChapters === 'undefined') {
        window.totalChapters = chapters.length;
    }
    if (typeof window.completedChaptersCount === 'undefined') {
        window.completedChaptersCount = startChapterIndex;
    } else {
        window.completedChaptersCount = startChapterIndex;
    }
    
    console.log(`需要生成剩余 ${remainingChapters} 个章节 (${startChapterIndex + 1}-${chapters.length})`);
    console.log(`当前进度: ${window.completedChaptersCount}/${window.totalChapters}`);
    
    if (remainingChapters <= 0) {
        console.log('没有剩余章节需要生成');
        showNotification('All chapters have been generated!', 'success');
        
        if (window.displayArticleComplete) {
            window.displayArticleComplete([]);
        }
        return;
    }
    
    let progressElement = document.getElementById('overall-progress');
    if (!progressElement) {
        const container = document.getElementById('article-display-container');
        if (container) {
            progressElement = document.createElement('div');
            progressElement.id = 'overall-progress';
            progressElement.style.cssText = `
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #e9ecef;
            `;
            
            progressElement.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">📝 Continuing Article Generation</h3>
                <div style="background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                    <div id="progress-bar" style="width: ${(startChapterIndex / chapters.length) * 100}%; height: 20px; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.5s ease; border-radius: 10px;"></div>
                </div>
                <p id="progress-text" style="margin: 10px 0 0 0; color: #666;">Continuing generation... (${startChapterIndex}/${chapters.length} chapters completed)</p>
            `;
            
            const firstChapter = container.querySelector('.chapter-item, .chapter-error');
            if (firstChapter) {
                container.insertBefore(progressElement, firstChapter);
            } else {
                container.appendChild(progressElement);
            }
        }
    } else {
        const progressTitle = progressElement.querySelector('h3');
        const progressBar = progressElement.querySelector('#progress-bar');
        const progressText = progressElement.querySelector('#progress-text');
        
        if (progressTitle) {
            progressTitle.textContent = '📝 Continuing Article Generation';
        }
        if (progressBar) {
            progressBar.style.width = `${(startChapterIndex / chapters.length) * 100}%`;
        }
        if (progressText) {
            progressText.textContent = `Continuing generation... (${startChapterIndex}/${chapters.length} chapters completed)`;
        }
    }
    
    showNotification(`Continuing generation from chapter ${startChapterIndex + 1}...`, 'info');
    
    const response = await fetch('/api/generate/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'continue_generation',
                outline: outlineData,
                start_chapter_index: startChapterIndex,
                topic: window.currentTopic || "",
                pos: window.getCurrentPos ? window.getCurrentPos() : 0
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim() && window.handleStreamLine) {
                    await window.handleStreamLine(line.trim());
                }
            }
        }
        
        if (buffer.trim() && window.handleStreamLine) {
            await window.handleStreamLine(buffer.trim());
        }

    } catch (error) {
        console.error('继续生成文章失败:', error);
        showNotification(`Continue generation failed: ${error.message}`, 'error');
        
        if (window.cleanupLoadingStates) {
            window.cleanupLoadingStates();
        }
    }
}


window.continueGenerationFromChapter = continueGenerationFromChapter;

window.htmlToMarkdown = htmlToMarkdown;

