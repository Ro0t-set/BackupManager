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

    const response = await fetch(url, { ...options, headers })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null
    }

    return response.json()
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

  async getGroupDatabases(groupId) {
    return this.request(`/groups/${groupId}/databases`)
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

  // Database Destinations endpoints (NEW - destinations are per database, not per backup)
  async getDatabaseDestinations(databaseId) {
    return this.request(`/databases/${databaseId}/destinations`)
  }

  async createDatabaseDestination(databaseId, destinationData) {
    return this.request(`/databases/${databaseId}/destinations`, {
      method: 'POST',
      body: JSON.stringify(destinationData),
    })
  }

  async updateDatabaseDestination(databaseId, destinationId, destinationData) {
    return this.request(`/databases/${databaseId}/destinations/${destinationId}`, {
      method: 'PUT',
      body: JSON.stringify(destinationData),
    })
  }

  async deleteDatabaseDestination(databaseId, destinationId) {
    return this.request(`/databases/${databaseId}/destinations/${destinationId}`, {
      method: 'DELETE',
    })
  }

  async validateDestinationPath(databaseId, path) {
    return this.request(`/databases/${databaseId}/destinations/validate-path?path=${encodeURIComponent(path)}`, {
      method: 'POST',
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
    return this.request('/schedules', {
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

  async deleteBackup(backupId, deleteFiles = false) {
    return this.request(`/backups/${backupId}?delete_files=${deleteFiles}`, {
      method: 'DELETE',
    })
  }

  async verifyBackupFiles(backupId) {
    return this.request(`/backups/${backupId}/verify`)
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request('/dashboard/stats')
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/api/health`)
    return response.json()
  }
}

export default new ApiService()
