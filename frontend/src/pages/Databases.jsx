import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database as DatabaseIcon, Plus, Edit, Trash2, Loader2, Server } from 'lucide-react'
import api from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import DatabaseModal from '@/components/Databases/DatabaseModal'

const DB_TYPES = {
  postgresql: { name: 'PostgreSQL', color: 'bg-blue-500' },
  mysql: { name: 'MySQL', color: 'bg-orange-500' },
  mongodb: { name: 'MongoDB', color: 'bg-green-500' },
  redis: { name: 'Redis', color: 'bg-red-500' }
}

function Databases() {
  const navigate = useNavigate()
  const [databases, setDatabases] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDatabase, setEditingDatabase] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [testingConnection, setTestingConnection] = useState(null)
  const [testingNewConnection, setTestingNewConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState(null)
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

  const handleSubmit = async (formData) => {
    setError('')

    try {
      if (editingDatabase) {
        await api.updateDatabase(editingDatabase.id, formData)
      } else {
        await api.createDatabase(formData)
      }

      setShowModal(false)
      setEditingDatabase(null)
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
    setConnectionTestResult(null)
  }

  const handleTestNewConnection = async () => {
    setTestingNewConnection(true)
    setConnectionTestResult(null)
    
    try {
      const result = await api.testNewDatabaseConnection(formData)
      setConnectionTestResult({
        success: result.success,
        message: result.message
      })
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: err.response?.data?.detail || err.message || 'Connection test failed'
      })
    } finally {
      setTestingNewConnection(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Databases</h2>
          <p className="text-muted-foreground mt-1">Manage your database connections</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-5 h-5 mr-2" />
          Add Database
        </Button>
      </div>

      {/* Group Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedGroup === null ? "default" : "outline"}
          onClick={() => handleGroupFilter(null)}
        >
          All Groups
        </Button>
        {groups.map((group) => (
          <Button
            key={group.id}
            variant={selectedGroup === group.id ? "default" : "outline"}
            onClick={() => handleGroupFilter(group.id)}
          >
            {group.name}
          </Button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {databases.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <DatabaseIcon className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No databases yet</CardTitle>
            <CardDescription className="mb-4">
              Add your first database connection to get started
            </CardDescription>
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5 mr-2" />
              Add Database
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((database) => {
            const dbType = DB_TYPES[database.db_type]
            return (
              <Card 
                key={database.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/databases/${database.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${dbType.color} flex items-center justify-center`}>
                      <Server className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{database.name}</CardTitle>
                      <Badge variant="secondary">{dbType.name}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Host:</span> {database.host}:{database.port}
                    </p>
                    {database.database_name && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Database:</span> {database.database_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(database.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(database)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(database.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DatabaseModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingDatabase(null)
        }}
        onSubmit={handleSubmit}
        editingDatabase={editingDatabase}
        groups={groups}
        error={error}
      />
    </div>
  )
}

export default Databases
