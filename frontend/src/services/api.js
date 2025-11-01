const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

class ApiService {
  constructor() {
    this.baseURL = API_URL
  }

  getAuthHeader() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'API request failed')
      }

      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/api/health`)
    return response.json()
  }
}

export default new ApiService()
