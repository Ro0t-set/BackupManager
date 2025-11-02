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

  // Groups endpoints
  async getGroups() {
    return this.request('/groups')
  }

  async getGroup(id) {
    return this.request(`/groups/${id}`)
  }

  async createGroup(groupData) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    })
  }

  async updateGroup(id, groupData) {
    return this.request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    })
  }

  async deleteGroup(id) {
    return this.request(`/groups/${id}`, {
      method: 'DELETE',
    })
  }

  // Databases endpoints
  async getDatabases(groupId = null) {
    const query = groupId ? `?group_id=${groupId}` : ''
    return this.request(`/databases${query}`)
  }

  async getDatabase(id) {
    return this.request(`/databases/${id}`)
  }

  async getDatabaseDetails(id) {
    return this.request(`/databases/${id}/details`)
  }

  async createDatabase(databaseData) {
    return this.request('/databases', {
      method: 'POST',
      body: JSON.stringify(databaseData),
    })
  }

  async updateDatabase(id, databaseData) {
    return this.request(`/databases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(databaseData),
    })
  }

  async deleteDatabase(id) {
    return this.request(`/databases/${id}`, {
      method: 'DELETE',
    })
  }

  async testDatabaseConnection(id) {
    return this.request(`/databases/${id}/test`, {
      method: 'POST',
    })
  }

  async testNewDatabaseConnection(databaseData) {
    return this.request('/databases/test-connection', {
      method: 'POST',
      body: JSON.stringify(databaseData),
    })
  }

  // Backup Destinations endpoints
  async getBackupDestinations(backupId) {
    return this.request(`/backups/${backupId}/destinations`)
  }

  async createBackupDestination(backupId, destinationData) {
    return this.request(`/backups/${backupId}/destinations`, {
      method: 'POST',
      body: JSON.stringify(destinationData),
    })
  }

  async updateBackupDestination(backupId, destinationId, destinationData) {
    return this.request(`/backups/${backupId}/destinations/${destinationId}`, {
      method: 'PUT',
      body: JSON.stringify(destinationData),
    })
  }

  async deleteBackupDestination(backupId, destinationId) {
    return this.request(`/backups/${backupId}/destinations/${destinationId}`, {
      method: 'DELETE',
    })
  }

  // Schedules endpoints
  async getSchedules(databaseId = null) {
    const query = databaseId ? `?database_id=${databaseId}` : ''
    return this.request(`/schedules/${query}`)
  }

  async getSchedule(id) {
    return this.request(`/schedules/${id}`)
  }

  async createSchedule(scheduleData) {
    return this.request('/schedules/', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    })
  }

  async updateSchedule(id, scheduleData) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    })
  }

  async deleteSchedule(id) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE',
    })
  }

  // Backups endpoints
  async getBackups(databaseId = null) {
    const query = databaseId ? `?database_id=${databaseId}` : ''
    return this.request(`/backups${query}`)
  }

  async triggerManualBackup(databaseId) {
    return this.request('/backups/manual', {
      method: 'POST',
      body: JSON.stringify({ database_id: databaseId }),
    })
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/api/health`)
    return response.json()
  }
}

export default new ApiService()
