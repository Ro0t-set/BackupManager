import { useState, useEffect } from 'react'
import { Plus, Server, TestTube, Loader2 } from 'lucide-react'
import api from '@/services/api'
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

const DB_TYPES = {
  postgresql: { name: 'PostgreSQL', color: 'bg-blue-500' },
  mysql: { name: 'MySQL', color: 'bg-orange-500' },
  mongodb: { name: 'MongoDB', color: 'bg-green-500' },
  redis: { name: 'Redis', color: 'bg-red-500' }
}

export default function DatabaseModal({
  open,
  onClose,
  onSubmit,
  editingDatabase = null,
  groups = [],
  preSelectedGroupId = null,
  error = null
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    db_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database_name: '',
    group_id: preSelectedGroupId || ''
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState(null)

  useEffect(() => {
    if (editingDatabase) {
      setFormData({
        name: editingDatabase.name,
        description: editingDatabase.description || '',
        db_type: editingDatabase.db_type,
        host: editingDatabase.host,
        port: editingDatabase.port,
        username: editingDatabase.username || '',
        password: '',
        database_name: editingDatabase.database_name || '',
        group_id: editingDatabase.group_id
      })
    } else {
      setFormData({
        name: '',
        description: '',
        db_type: 'postgresql',
        host: 'localhost',
        port: 5432,
        username: '',
        password: '',
        database_name: '',
        group_id: preSelectedGroupId || ''
      })
    }
    setConnectionTestResult(null)
  }, [editingDatabase, preSelectedGroupId, open])

  const handleDbTypeChange = (type) => {
    const defaultPorts = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      redis: 6379
    }
    setFormData({ ...formData, db_type: type, port: defaultPorts[type] })
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionTestResult(null)

    try {
      const testData = {
        name: formData.name || 'Test Connection',
        db_type: formData.db_type,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        database_name: formData.database_name,
        group_id: formData.group_id || preSelectedGroupId || (groups.length > 0 ? groups[0].id : 1)
      }

      const result = await api.testNewDatabaseConnection(testData)
      setConnectionTestResult(result)
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: err.message || 'Failed to test connection'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
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

          {!preSelectedGroupId && (
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
          )}

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
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testingConnection || !formData.host || !formData.port}
            >
              {testingConnection ? (
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
              <Plus className="w-4 h-4 mr-2" />
              {editingDatabase ? 'Update' : 'Create'} Database
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
