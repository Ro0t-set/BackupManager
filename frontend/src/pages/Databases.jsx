import { useState, useEffect } from 'react'
import { Database as DatabaseIcon, Plus, Edit, Trash2, Loader2, X, TestTube, Server } from 'lucide-react'
import api from '../services/api'

const DB_TYPES = {
  postgresql: { icon: '🐘', name: 'PostgreSQL', color: 'blue' },
  mysql: { icon: '🐬', name: 'MySQL', color: 'orange' },
  mongodb: { icon: '🍃', name: 'MongoDB', color: 'green' },
  redis: { icon: '⚡', name: 'Redis', color: 'red' }
}

function Databases() {
  const [databases, setDatabases] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDatabase, setEditingDatabase] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [testingConnection, setTestingConnection] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    db_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database_name: '',
    group_id: ''
  })

  useEffect(() => {
    loadGroups()
    loadDatabases()
  }, [])

  const loadGroups = async () => {
    try {
      const data = await api.getGroups()
      setGroups(data)
    } catch (err) {
      console.error('Failed to load groups:', err)
    }
  }

  const loadDatabases = async (groupId = null) => {
    try {
      setLoading(true)
      const data = await api.getDatabases(groupId)
      setDatabases(data)
      setError('')
    } catch (err) {
      setError('Failed to load databases')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupFilter = (groupId) => {
    setSelectedGroup(groupId)
    loadDatabases(groupId)
  }

  const handleDbTypeChange = (type) => {
    const defaultPorts = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      redis: 6379
    }
    setFormData({ ...formData, db_type: type, port: defaultPorts[type] })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingDatabase) {
        await api.updateDatabase(editingDatabase.id, formData)
      } else {
        await api.createDatabase(formData)
      }

      setShowModal(false)
      resetForm()
      loadDatabases(selectedGroup)
    } catch (err) {
      setError(err.message || 'Failed to save database')
    }
  }

  const handleEdit = (database) => {
    setEditingDatabase(database)
    setFormData({
      name: database.name,
      description: database.description || '',
      db_type: database.db_type,
      host: database.host,
      port: database.port,
      username: database.username || '',
      password: '',
      database_name: database.database_name || '',
      group_id: database.group_id
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this database connection?')) return

    try {
      await api.deleteDatabase(id)
      loadDatabases(selectedGroup)
    } catch (err) {
      setError(err.message || 'Failed to delete database')
    }
  }

  const handleTestConnection = async (id) => {
    setTestingConnection(id)
    try {
      const result = await api.testDatabaseConnection(id)
      alert(result.message || 'Connection test successful!')
    } catch (err) {
      alert('Connection test failed: ' + err.message)
    } finally {
      setTestingConnection(null)
    }
  }

  const openCreateModal = () => {
    setEditingDatabase(null)
    resetForm()
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      db_type: 'postgresql',
      host: 'localhost',
      port: 5432,
      username: '',
      password: '',
      database_name: '',
      group_id: groups.length > 0 ? groups[0].id : ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Databases</h2>
          <p className="text-gray-600 mt-1">Manage your database connections</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Database
        </button>
      </div>

      {/* Group Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => handleGroupFilter(null)}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedGroup === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Groups
        </button>
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupFilter(group.id)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedGroup === group.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {databases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DatabaseIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No databases yet</h3>
          <p className="text-gray-600 mb-4">Add your first database connection to get started</p>
          <button
            onClick={openCreateModal}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Database
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((database) => {
            const dbType = DB_TYPES[database.db_type]
            return (
              <div key={database.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Server className={`w-8 h-8 text-${dbType.color}-600`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{database.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded bg-${dbType.color}-100 text-${dbType.color}-800`}>
                        {dbType.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Host:</span> {database.host}:{database.port}
                  </p>
                  {database.database_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Database:</span> {database.database_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created {new Date(database.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleTestConnection(database.id)}
                    disabled={testingConnection === database.id}
                    className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testingConnection === database.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleEdit(database)}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(database.id)}
                    className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingDatabase ? 'Edit Database' : 'Add Database Connection'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingDatabase(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="My PostgreSQL Database"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group *
                  </label>
                  <select
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Type *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(DB_TYPES).map(([type, info]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleDbTypeChange(type)}
                        className={`px-4 py-3 rounded-lg font-medium transition border-2 ${
                          formData.db_type === type
                            ? `border-${info.color}-600 bg-${info.color}-50 text-${info.color}-900`
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{info.icon}</div>
                        <div className="text-xs">{info.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host *
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="localhost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="postgres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={editingDatabase ? "Leave blank to keep current" : ""}
                  />
                </div>

                {(formData.db_type === 'postgresql' || formData.db_type === 'mysql') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Database Name
                    </label>
                    <input
                      type="text"
                      value={formData.database_name}
                      onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="mydb"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingDatabase(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  {editingDatabase ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Databases
