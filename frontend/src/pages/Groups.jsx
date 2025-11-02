import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Edit, Trash2, Loader2, Database, AlertTriangle, ArrowRight } from 'lucide-react'
import api from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import DatabaseModal from '@/components/Databases/DatabaseModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [groupDatabases, setGroupDatabases] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [showDatabaseModal, setShowDatabaseModal] = useState(false)
  const [selectedGroupForDb, setSelectedGroupForDb] = useState(null)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await api.getGroups()
      setGroups(data)

      // Load databases for each group
      const dbData = {}
      for (const group of data) {
        try {
          const databases = await api.getGroupDatabases(group.id)
          dbData[group.id] = databases
        } catch (err) {
          console.error(`Failed to load databases for group ${group.id}:`, err)
          dbData[group.id] = []
        }
      }
      setGroupDatabases(dbData)
      setError('')
    } catch (err) {
      setError('Failed to load groups')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingGroup) {
        await api.updateGroup(editingGroup.id, formData)
      } else {
        await api.createGroup(formData)
      }

      setShowModal(false)
      setFormData({ name: '', description: '' })
      setEditingGroup(null)
      loadGroups()
    } catch (err) {
      setError(err.message || 'Failed to save group')
    }
  }

  const handleEdit = (group) => {
    setEditingGroup(group)
    setFormData({ name: group.name, description: group.description || '' })
    setShowModal(true)
  }

  const handleDeleteClick = (group) => {
    setGroupToDelete(group)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!groupToDelete) return

    try {
      await api.deleteGroup(groupToDelete.id)
      setShowDeleteDialog(false)
      setGroupToDelete(null)
      loadGroups()
    } catch (err) {
      setError(err.message || 'Failed to delete group')
      setShowDeleteDialog(false)
    }
  }

  const openCreateModal = () => {
    setEditingGroup(null)
    setFormData({ name: '', description: '' })
    setShowModal(true)
  }

  const openDatabaseModal = (group) => {
    setSelectedGroupForDb(group)
    setShowDatabaseModal(true)
  }

  const handleDatabaseSubmit = async (formData) => {
    setError('')

    try {
      await api.createDatabase(formData)
      setShowDatabaseModal(false)
      setSelectedGroupForDb(null)
      loadGroups()
    } catch (err) {
      setError(err.message || 'Failed to create database')
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
          <h2 className="text-2xl font-bold">Groups</h2>
          <p className="text-muted-foreground mt-1">Organize your databases into groups</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-5 h-5 mr-2" />
          Create Group
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FolderOpen className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No groups yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first group to organize your databases
            </CardDescription>
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const databases = groupDatabases[group.id] || []
            return (
              <Card key={group.id} className="hover:bg-muted/30 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription className="mt-1">{group.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openDatabaseModal(group)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Database
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(group)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Databases List */}
                  {databases.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        DATABASES ({databases.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {databases.map((db) => (
                          <div
                            key={db.id}
                            onClick={() => navigate(`/databases/${db.id}`)}
                            className="flex items-center gap-2 p-3 rounded-md bg-background border hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group"
                          >
                            <div className={`p-1.5 rounded ${
                              db.db_type === 'postgresql' ? 'bg-blue-500/10' :
                              db.db_type === 'mysql' ? 'bg-orange-500/10' :
                              db.db_type === 'mongodb' ? 'bg-green-500/10' :
                              'bg-muted'
                            }`}>
                              <Database className={`h-4 w-4 ${
                                db.db_type === 'postgresql' ? 'text-blue-500' :
                                db.db_type === 'mysql' ? 'text-orange-500' :
                                db.db_type === 'mongodb' ? 'text-green-500' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{db.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {db.host}:{db.port}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No databases in this group</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Update the group information below.'
                : 'Enter the details for your new group.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Production, Development, Testing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Optional description for this group"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  setEditingGroup(null)
                  setFormData({ name: '', description: '' })
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Database Dialog */}
      <DatabaseModal
        open={showDatabaseModal}
        onClose={() => {
          setShowDatabaseModal(false)
          setSelectedGroupForDb(null)
        }}
        onSubmit={handleDatabaseSubmit}
        preSelectedGroupId={selectedGroupForDb?.id}
        error={error}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Group "{groupToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This action cannot be undone. This will permanently delete:</p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4 text-destructive" />
                  <span className="font-medium">The group and all its settings</span>
                </div>
                {groupToDelete && groupDatabases[groupToDelete.id]?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-destructive" />
                    <span className="font-medium">
                      {groupDatabases[groupToDelete.id].length} database{groupDatabases[groupToDelete.id].length !== 1 ? 's' : ''} in this group
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="font-medium">All associated backups and schedules</span>
                </div>
              </div>
              {groupToDelete && groupDatabases[groupToDelete.id]?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Databases that will be deleted:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {groupDatabases[groupToDelete.id].map(db => (
                      <li key={db.id}>{db.name} ({db.host}:{db.port})</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Groups
