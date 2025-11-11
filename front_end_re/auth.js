/**
 * @file Authentication management module for CollabThink frontend.
 * 
 * This module provides comprehensive user authentication functionality including
 * login state management, user session handling, and authentication verification.
 * It implements secure authentication flows with proper error handling and
 * user experience features like loading states and error toasts.
 */

console.log('[Auth] Loading authentication module...');

/**
 * Manages user authentication state and operations throughout the application.
 * 
 * This class handles user login/logout, session management, and authentication
 * verification. It provides a centralized interface for all authentication-related
 * operations and maintains consistent state across the application.
 */
class AuthManager {
    /**
     * Initialize the authentication manager with default state.
     * 
     * Sets up the initial authentication state and begins the authentication
     * initialization process to check for existing user sessions.
     */
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initializeAuth();
    }

    /**
     * Initialize authentication state by checking for existing user sessions.
     * 
     * This method is called during construction to restore authentication
     * state from the server, ensuring users remain logged in across page
     * refreshes and browser sessions.
     * 
     * @returns {Promise<void>} Resolves when authentication state is initialized
     */
    async initializeAuth() {
        try {
            console.log('[Auth] Initializing authentication state...');
            const user = await this.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                console.log('[Auth] User logged in:', user.email);
            } else {
                console.log('[Auth] User not logged in');
            }
        } catch (error) {
            console.error('[Auth] Failed to initialize authentication state:', error);
        }
    }

    /**
     * Retrieve current user information from the server.
     * 
     * Makes an API call to check if the user has an active session.
     * Returns null if no user is logged in or if the session has expired.
     * 
     * @returns {Promise<Object|null>} User object if authenticated, null otherwise
     */
    async getCurrentUser() {
        try {
            const response = await fetch('/api/user/current', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            } else if (response.status === 401) {
                return null; // User not logged in
            } else {
                throw new Error('Failed to get user information');
            }
        } catch (error) {
            console.error('[Auth] Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Check and update the current authentication status.
     * 
     * Verifies authentication status with the server and updates
     * the local state accordingly. This method ensures the local
     * state stays synchronized with the server.
     * 
     * @returns {Promise<boolean>} True if user is authenticated, false otherwise
     */
    async checkAuthStatus() {
        const user = await this.getCurrentUser();
        this.isAuthenticated = !!user;
        this.currentUser = user;
        return this.isAuthenticated;
    }

    /**
     * Log out the current user and clear session data.
     * 
     * Sends a logout request to the server, clears local authentication
     * state, and redirects the user to the login page. Also removes
     * any remembered email from local storage for security.
     * 
     * @returns {Promise<void>} Resolves when logout is complete
     * @throws {Error} If logout request fails
     */
    async logout() {
        try {
            console.log('[Auth] 执行登出操作...');
            
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.isAuthenticated = false;
                console.log('[Auth] 登出成功');
                
                // Clear remembered email in local storage for security
                localStorage.removeItem('rememberedEmail');
                
                window.location.href = 'login.html';
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Logout failed');
            }
        } catch (error) {
            console.error('[Auth] 登出失败:', error);
            throw error;
        }
    }

    /**
     * Get a user-friendly display name from the user's email.
     * 
     * Extracts the username portion from the email address (before the @ symbol)
     * to provide a more user-friendly display name throughout the interface.
     * 
     * @returns {string} Display name extracted from email, or empty string if no user
     */
    getUserDisplayName() {
        if (!this.currentUser) return '';
        return this.currentUser.email.split('@')[0]; // Use the part before @ as the display name
    }

    /**
     * Determine if the current page requires authentication.
     * 
     * Checks the current page against a list of public pages that
     * don't require authentication. This prevents authenticated users
     * from accessing login/register pages unnecessarily.
     * 
     * @returns {boolean} True if current page requires authentication
     */
    requiresAuth() {
        const publicPages = ['login.html', 'register.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return !publicPages.includes(currentPage);
    }

    /**
     * Redirect user to the login page.
     * 
     * Performs a client-side redirect to the login page when
     * authentication is required but the user is not logged in.
     */
    redirectToLogin() {
        console.log('[Auth] 重定向到登录页面');
        window.location.href = 'login.html';
    }

    /**
     * Display authentication error messages as toast notifications.
     * 
     * Creates and displays a styled error toast notification that
     * automatically disappears after 3 seconds. The toast is positioned
     * in the top-right corner with a slide-in animation for better UX.
     * 
     * @param {string} message - Error message to display
     */
    showAuthError(message) {
        console.error('[Auth] Authentication error:', message);
        
        // Create error toast with professional styling and animations
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error-toast';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee;
            color: #c53030;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #fed7d7;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove toast after 3 seconds for better UX
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }
}

// Create global authentication manager instance for application-wide access
window.authManager = new AuthManager();

/**
 * Authentication verification check that runs after the page loads.
 * 
 * This event listener performs authentication verification once the DOM
 * is fully loaded. It checks if the current page requires authentication
 * and redirects users accordingly to ensure proper access control.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Auth] DOM加载完成，开始认证检查');
    
    try {
        const isAuthenticated = await window.authManager.checkAuthStatus();
        const requiresAuth = window.authManager.requiresAuth();
        
        console.log('[Auth] 认证状态:', isAuthenticated);
        console.log('[Auth] 页面需要认证:', requiresAuth);
        
        // Redirect to login if authentication is required but user is not logged in
        if (requiresAuth && !isAuthenticated) {
            console.log('[Auth] 页面需要认证但用户未登录，重定向到登录页面');
            window.authManager.redirectToLogin();
            return;
        }
        
        // Redirect authenticated users away from login/register pages
        if (isAuthenticated && ['login.html', 'register.html'].includes(window.location.pathname.split('/').pop())) {
            console.log('[Auth] 用户已登录，重定向到主页面');
            window.location.href = '/chat';
            return;
        }
        
        console.log('[Auth] 认证检查完成');
    } catch (error) {
        console.error('[Auth] 认证检查失败:', error);
    }
});

/**
 * Utility function to retrieve URL parameters from the current page.
 * 
 * Safely extracts query string parameters and handles URL encoding
 * to prevent issues with special characters in parameter values.
 * 
 * @param {string} name - The name of the URL parameter to retrieve
 * @returns {string} The decoded parameter value, or empty string if not found
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Utility function to display loading state on UI elements.
 * 
 * Temporarily disables an element and shows loading text while
 * preserving the original text for restoration. Returns a function
 * that can be called to restore the original state.
 * 
 * @param {HTMLElement} element - The element to show loading state on
 * @param {string} text - Loading text to display (defaults to '加载中...')
 * @returns {Function} Function to restore the original element state
 */
function showLoading(element, text = '加载中...') {
    if (!element) return;
    
    element.disabled = true;
    const originalText = element.textContent;
    element.textContent = text;
    element.dataset.originalText = originalText;
    
    return () => {
        element.disabled = false;
        element.textContent = element.dataset.originalText || originalText;
    };
}

/**
 * Utility function to debounce function calls.
 * 
 * Prevents a function from being called too frequently by delaying
 * execution until after a specified wait period has elapsed since
 * the last call. Useful for search inputs and other frequent events.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to wait
 * @returns {Function} Debounced version of the original function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility function to throttle function calls.
 * 
 * Limits how often a function can be called by ensuring it executes
 * at most once within a specified time limit. Useful for scroll
 * events and other high-frequency operations.
 * 
 * @param {Function} func - The function to throttle
 * @param {number} limit - The minimum time between function calls in milliseconds
 * @returns {Function} Throttled version of the original function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

console.log('[Auth] 认证模块加载完成');
