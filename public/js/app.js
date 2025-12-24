/**
 * PageFairy Client-Side API Helper
 * Handles form submissions and fetch requests to /functions/api/ routes
 */

// Base API URL
const API_BASE = '/functions/api';

/**
 * Helper function to make API requests
 * @param {string} endpoint - API endpoint path (e.g., '/auth/signup')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Authentication API
 */
const Auth = {
  /**
   * Sign up a new user
   * @param {object} userData - User signup data
   * @returns {Promise<object>} Response data
   */
  async signup(userData) {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  /**
   * Log in a user
   * @param {object} credentials - User login credentials
   * @returns {Promise<object>} Response data
   */
  async login(credentials) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * Log out the current user
   * @returns {Promise<object>} Response data
   */
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST'
    });
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<object>} Response data
   */
  async forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Response data
   */
  async resetPassword(token, newPassword) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
  }
};

/**
 * Billing API
 */
const Billing = {
  /**
   * Create a checkout session for pre-authorization
   * @param {object} checkoutData - Checkout data
   * @returns {Promise<object>} Response with clientSecret and paymentIntentId
   */
  async createCheckout(checkoutData) {
    return apiRequest('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    });
  },

  /**
   * Access customer portal
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<object>} Response with portal URL
   */
  async portal(customerId) {
    return apiRequest('/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId })
    });
  }
};

/**
 * Campaigns API
 */
const Campaigns = {
  /**
   * Get all campaigns
   * @returns {Promise<object>} Response with campaigns
   */
  async getAll() {
    return apiRequest('/campaigns', {
      method: 'GET'
    });
  },

  /**
   * Get a specific campaign
   * @param {number} id - Campaign ID
   * @returns {Promise<object>} Response with campaign data
   */
  async getById(id) {
    return apiRequest(`/campaigns/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Create a new campaign
   * @param {object} campaignData - Campaign data
   * @returns {Promise<object>} Response with created campaign
   */
  async create(campaignData) {
    return apiRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  },

  /**
   * Update a campaign
   * @param {number} id - Campaign ID
   * @param {object} updates - Updated campaign data
   * @returns {Promise<object>} Response with updated campaign
   */
  async update(id, updates) {
    return apiRequest(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Delete a campaign
   * @param {number} id - Campaign ID
   * @returns {Promise<object>} Response
   */
  async delete(id) {
    return apiRequest(`/campaigns/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Orders API
 */
const Orders = {
  /**
   * Get all orders
   * @returns {Promise<object>} Response with orders
   */
  async getAll() {
    return apiRequest('/orders', {
      method: 'GET'
    });
  },

  /**
   * Get a specific order
   * @param {number} id - Order ID
   * @returns {Promise<object>} Response with order data
   */
  async getById(id) {
    return apiRequest(`/orders/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Update order status
   * @param {number} id - Order ID
   * @param {object} updates - Updated order data
   * @returns {Promise<object>} Response with updated order
   */
  async update(id, updates) {
    return apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
};

/**
 * Form Helper Functions
 */
const FormHelpers = {
  /**
   * Get form data as an object
   * @param {HTMLFormElement} form - Form element
   * @returns {object} Form data as key-value pairs
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  },

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {HTMLElement} container - Container to display error
   */
  showError(message, container) {
    if (!container) return;
    container.innerHTML = `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${message}</span>
      </div>
    `;
  },

  /**
   * Show success message
   * @param {string} message - Success message
   * @param {HTMLElement} container - Container to display success
   */
  showSuccess(message, container) {
    if (!container) return;
    container.innerHTML = `
      <div class="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${message}</span>
      </div>
    `;
  },

  /**
   * Clear messages
   * @param {HTMLElement} container - Container to clear
   */
  clearMessages(container) {
    if (container) {
      container.innerHTML = '';
    }
  }
};

// Export the API and helper functions
window.PageFairyAPI = {
  Auth,
  Billing,
  Campaigns,
  Orders,
  FormHelpers,
  apiRequest
};

// Make individual modules available globally
window.Auth = Auth;
window.Billing = Billing;
window.Campaigns = Campaigns;
window.Orders = Orders;
window.FormHelpers = FormHelpers;
