/**
 * @file Navigation bar functionality and dialog management for CollabThink.
 * 
 * This module handles the main navigation bar interactions including contact forms,
 * bug reporting, and help documentation. It provides a comprehensive dialog system
 * for user interactions with professional styling and responsive design.
 */

/**
 * Initialize navigation bar functionality when the DOM is loaded.
 * 
 * Sets up event listeners for navigation menu items and prepares
 * the dialog system for user interactions.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize navigation bar functions
    initNavbarFunctions();
});

/**
 * Set up navigation bar menu item event listeners.
 * 
 * Attaches click handlers to navigation menu items for Contact Us,
 * Bug Report, and Help functionality. Each menu item triggers
 * a specific dialog when clicked.
 */
function initNavbarFunctions() {
    // Get navigation bar menu items - specifically menu items under regular-menu class
    const navbarMenu = document.querySelector('.regular-menu');
    if (!navbarMenu) return;

    const menuItems = navbarMenu.querySelectorAll('li a');
    
    // Attach click handlers to each menu item
    menuItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();
            const text = this.textContent.trim();
            
            // Route to appropriate dialog based on menu item text
            switch(text) {
                case 'Contact Us':
                    showContactDialog();
                    break;
                case 'Bug Report':
                    showBugReportDialog();
                    break;
                case 'Help':
                    showHelpDialog();
                    break;
            }
        });
    });
}

/**
 * Display the Contact Us dialog with contact information and form.
 * 
 * Creates and shows a professional contact dialog that includes
 * contact details, a contact form, and social media links. The
 * dialog is styled with modern design principles and responsive layout.
 */
function showContactDialog() {
    const dialog = createDialog('Contact Us', 'contact-dialog');
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
                ">Contact Us</h3>
                <button onclick="closeNavbarDialog('contact-dialog')" style="
                    background: none;
                    border: none;
                    color: #6c757d;
                    cursor: pointer;
                    font-size: 24px;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">&times;</button>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                ">Get in Touch</h4>
                <p style="
                    margin: 0 0 20px 0;
                    color: #6c757d;
                    font-size: 14px;
                    line-height: 1.5;
                ">We'd love to hear from you! Whether you have questions, suggestions, or just want to say hello, feel free to reach out to us.</p>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <div style="
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                        margin-bottom: 8px;
                    ">Email Address:</div>
                    <div onclick="copyEmail('ziy.jiang@outlook.com')" style="
                        color: #495057;
                        font-size: 14px;
                        cursor: pointer;
                        padding: 8px 12px;
                        background: #ffffff;
                        border: 1px solid #ced4da;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 8px;
                    " onmouseover="this.style.backgroundColor='#e9ecef'" onmouseout="this.style.backgroundColor='#ffffff'">
                        ziy.jiang@outlook.com
                    </div>
                    <div style="
                        font-size: 12px;
                        color: #6c757d;
                    ">Click to copy email address</div>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    color: #495057;
                    font-size: 14px;
                ">
                    <strong>Response Time:</strong> We typically respond within 24-48 hours.
                </div>
            </div>
            
            <div style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            ">
                <button onclick="closeNavbarDialog('contact-dialog')" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                " onmouseover="this.style.backgroundColor='#5a6268'" onmouseout="this.style.backgroundColor='#6c757d'">Close</button>
            </div>
        </div>
    `;
    showDialog(dialog);
}

/**
 * Display the Bug Report dialog for users to report technical issues.
 * 
 * Creates and shows a dialog that guides users on how to report bugs,
 * including details to include and where to send them. The dialog
 * is styled with a professional look and includes a copy-to-clipboard
 * feature for the bug report email.
 */
function showBugReportDialog() {
    const dialog = createDialog('Bug Report', 'bug-report-dialog');
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
                ">Bug Report</h3>
                <button onclick="closeNavbarDialog('bug-report-dialog')" style="
                    background: none;
                    border: none;
                    color: #6c757d;
                    cursor: pointer;
                    font-size: 24px;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">&times;</button>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                ">Found a Bug?</h4>
                <p style="
                    margin: 0 0 20px 0;
                    color: #6c757d;
                    font-size: 14px;
                    line-height: 1.5;
                ">Help us improve by reporting any issues you encounter. Your feedback is valuable in making our platform better!</p>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <h5 style="
                        margin: 0 0 12px 0;
                        color: #495057;
                        font-size: 14px;
                        font-weight: 500;
                    ">When reporting a bug, please include:</h5>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        color: #6c757d;
                        font-size: 14px;
                        line-height: 1.5;
                    ">
                        <li>Detailed description of the issue</li>
                        <li>Steps to reproduce the problem</li>
                        <li>Your browser and operating system</li>
                        <li>Screenshots if applicable</li>
                        <li>Expected vs. actual behavior</li>
                    </ul>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <div style="
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                        margin-bottom: 8px;
                    ">Report bugs to:</div>
                    <div onclick="copyEmail('ziy.jiang@outlook.com')" style="
                        color: #495057;
                        font-size: 14px;
                        cursor: pointer;
                        padding: 8px 12px;
                        background: #ffffff;
                        border: 1px solid #ced4da;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 8px;
                    " onmouseover="this.style.backgroundColor='#e9ecef'" onmouseout="this.style.backgroundColor='#ffffff'">
                        ziy.jiang@outlook.com
                    </div>
                    <div style="
                        font-size: 12px;
                        color: #6c757d;
                    ">Click to copy email address</div>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    color: #495057;
                    font-size: 14px;
                ">
                    <strong>Priority:</strong> Critical bugs are addressed immediately, while minor issues are typically resolved within 1-3 business days.
                </div>
            </div>
            
            <div style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            ">
                <button onclick="closeNavbarDialog('bug-report-dialog')" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                " onmouseover="this.style.backgroundColor='#5a6268'" onmouseout="this.style.backgroundColor='#6c757d'">Close</button>
            </div>
        </div>
    `;
    showDialog(dialog);
}

/**
 * Display the Help & Support dialog for users to get assistance.
 * 
 * Creates and shows a dialog that provides general help and
 * technical support information, including quick tips and
 * contact details. The dialog is styled with a professional
 * look and includes a copy-to-clipboard feature for the support email.
 */
function showHelpDialog() {
    const dialog = createDialog('Help', 'help-dialog');
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
                ">Help & Support</h3>
                <button onclick="closeNavbarDialog('help-dialog')" style="
                    background: none;
                    border: none;
                    color: #6c757d;
                    cursor: pointer;
                    font-size: 24px;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                " onmouseover="this.style.color='#495057'; this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.color='#6c757d'; this.style.backgroundColor='transparent'">&times;</button>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 500;
                ">Need Help?</h4>
                <p style="
                    margin: 0 0 20px 0;
                    color: #6c757d;
                    font-size: 14px;
                    line-height: 1.5;
                ">We're here to assist you! Whether you need guidance on using our features or have technical questions, don't hesitate to reach out.</p>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <h5 style="
                        margin: 0 0 12px 0;
                        color: #495057;
                        font-size: 14px;
                        font-weight: 500;
                    ">What we can help with:</h5>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        color: #6c757d;
                        font-size: 14px;
                        line-height: 1.5;
                    ">
                        <li>Platform features and functionality</li>
                        <li>Account setup and configuration</li>
                        <li>Technical troubleshooting</li>
                        <li>Best practices and tips</li>
                        <li>General questions and guidance</li>
                    </ul>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <h5 style="
                        margin: 0 0 12px 0;
                        color: #495057;
                        font-size: 14px;
                        font-weight: 500;
                    ">Quick Tips:</h5>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        color: #6c757d;
                        font-size: 14px;
                        line-height: 1.5;
                    ">
                        <li>Use the outline feature to structure your content</li>
                        <li>Try different prompt types for better results</li>
                        <li>Save important outlines using the history feature</li>
                        <li>Upload documents to enhance AI responses</li>
                    </ul>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 16px;
                ">
                    <div style="
                        font-weight: 500;
                        color: #495057;
                        font-size: 14px;
                        margin-bottom: 8px;
                    ">Get help at:</div>
                    <div onclick="copyEmail('ziy.jiang@outlook.com')" style="
                        color: #495057;
                        font-size: 14px;
                        cursor: pointer;
                        padding: 8px 12px;
                        background: #ffffff;
                        border: 1px solid #ced4da;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 8px;
                    " onmouseover="this.style.backgroundColor='#e9ecef'" onmouseout="this.style.backgroundColor='#ffffff'">
                        ziy.jiang@outlook.com
                    </div>
                    <div style="
                        font-size: 12px;
                        color: #6c757d;
                    ">Click to copy email address</div>
                </div>
                
                <div style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    color: #495057;
                    font-size: 14px;
                ">
                    <strong>Support Hours:</strong> We provide support Monday through Friday, 9 AM - 6 PM (UTC). Emergency issues are handled 24/7.
                </div>
            </div>
            
            <div style="
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            ">
                <button onclick="closeNavbarDialog('help-dialog')" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                " onmouseover="this.style.backgroundColor='#5a6268'" onmouseout="this.style.backgroundColor='#6c757d'">Close</button>
            </div>
        </div>
    `;
    showDialog(dialog);
}

/**
 * Create a new dialog element.
 * 
 * This function removes any existing dialog with the same ID
 * to prevent duplicates and creates a new dialog with the specified
 * title and ID. The dialog is styled with a semi-transparent
 * overlay and centered on the screen.
 * @param {string} title - The title of the dialog.
 * @param {string} id - The ID of the dialog.
 * @returns {HTMLDivElement} The newly created dialog element.
 */
function createDialog(title, id) {
    // Remove existing dialog
    const existingDialog = document.getElementById(id);
    if (existingDialog) {
        existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = id;
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
    
    return dialog;
}

/**
 * Show the dialog on the screen.
 * 
 * Appends the dialog to the document body and adds custom
 * scrollbar styles. Also, sets up a click listener on the
 * background to close the dialog.
 * @param {HTMLDivElement} dialog - The dialog element to show.
 */
function showDialog(dialog) {
    document.body.appendChild(dialog);
    
    // Add custom scrollbar styles
    addNavbarDialogStyles();
    
    // Click background to close
    dialog.addEventListener('click', function(event) {
        if (event.target === dialog) {
            closeNavbarDialog(dialog.id);
        }
    });
}

/**
 * Close the dialog with the specified ID.
 * 
 * Removes the dialog element from the document body.
 * @param {string} dialogId - The ID of the dialog to close.
 */
function closeNavbarDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Copy an email address to the clipboard.
 * 
 * Attempts to use the modern Clipboard API first, falling back
 * to a more basic method if the first fails.
 * @param {string} email - The email address to copy.
 */
function copyEmail(email) {
    navigator.clipboard.writeText(email).then(() => {
        showCopyFeedback();
    }).catch(() => {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback();
    });
}

/**
 * Show a feedback message indicating successful copy.
 * 
 * Creates a temporary div element that floats above the
 * navigation bar and displays a green checkmark.
 */
function showCopyFeedback() {
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.textContent = '✅ Email address copied to clipboard!';
    feedback.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: bold;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    
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
    }, 2000);
}

/**
 * Add custom scrollbar styles to dialogs.
 * 
 * This function checks if styles are already added and
 * only adds them if they haven't been. It ensures that
 * the scrollbar styles are consistent across all dialogs.
 */
function addNavbarDialogStyles() {
    // Check if styles already added
    if (document.getElementById('navbar-dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'navbar-dialog-styles';
    style.textContent = `
        /* Custom scrollbar styles - consistent with chapterEditDialog */
        #contact-dialog > div,
        #bug-report-dialog > div,
        #help-dialog > div {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
        
        #contact-dialog > div::-webkit-scrollbar,
        #bug-report-dialog > div::-webkit-scrollbar,
        #help-dialog > div::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        #contact-dialog > div::-webkit-scrollbar-track,
        #bug-report-dialog > div::-webkit-scrollbar-track,
        #help-dialog > div::-webkit-scrollbar-track {
            background: transparent;
            margin: 10px 0;
        }
        
        #contact-dialog > div::-webkit-scrollbar-thumb,
        #bug-report-dialog > div::-webkit-scrollbar-thumb,
        #help-dialog > div::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            border: 2px solid transparent;
        }
        
        #contact-dialog > div::-webkit-scrollbar-thumb:hover,
        #bug-report-dialog > div::-webkit-scrollbar-thumb:hover,
        #help-dialog > div::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(style);
}
