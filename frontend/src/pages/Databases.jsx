import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database as DatabaseIcon, Plus, Edit, Trash2, Loader2, TestTube, Server } from 'lucide-react'
import api from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

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
                        handleTestConnection(database.id)
                      }}
                      disabled={testingConnection === database.id}
                    >
                      {testingConnection === database.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2" />
                      )}
                      Test
                    </Button>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDatabase ? 'Edit Database' : 'Add Database Connection'}
            </DialogTitle>
            <DialogDescription>
              {editingDatabase
                ? 'Update the database connection details below.'
                : 'Enter the connection details for your database.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Database Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="My PostgreSQL Database"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group *</Label>
              <Select
                value={formData.group_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, group_id: parseInt(value) })}
              >
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Database Type *</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(DB_TYPES).map(([type, info]) => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.db_type === type ? "default" : "outline"}
                    onClick={() => handleDbTypeChange(type)}
                    className="h-auto py-3 flex flex-col gap-1"
                  >
                    <div className={`w-8 h-8 rounded ${info.color} flex items-center justify-center`}>
                      <Server className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-xs">{info.name}</div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  required
                  placeholder="localhost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="postgres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingDatabase ? "Leave blank to keep current" : ""}
                />
              </div>
            </div>

            {(formData.db_type === 'postgresql' || formData.db_type === 'mysql') && (
              <div className="space-y-2">
                <Label htmlFor="database_name">Database Name</Label>
                <Input
                  id="database_name"
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  placeholder="mydb"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Optional description"
              />
            </div>

            {/* Connection Test Result */}
            {connectionTestResult && (
              <Alert variant={connectionTestResult.success ? "default" : "destructive"}>
                <AlertDescription className="flex items-start gap-2">
                  {connectionTestResult.success ? (
                    <TestTube className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <TestTube className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {connectionTestResult.success ? 'Connection Successful!' : 'Connection Failed'}
                    </p>
                    <p className="text-sm mt-1">{connectionTestResult.message}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  setEditingDatabase(null)
                  setConnectionTestResult(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestNewConnection}
                disabled={testingNewConnection || !formData.host || !formData.port}
              >
                {testingNewConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button type="submit">
                {editingDatabase ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Databases
