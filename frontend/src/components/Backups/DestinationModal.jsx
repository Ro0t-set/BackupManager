import { useState, useEffect } from 'react'
import { Server } from 'lucide-react'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

const STORAGE_TYPES = [
  { value: 'local', label: 'Local Storage', icon: '💾' },
  { value: 'local_external', label: 'External Storage', icon: '🔌' },
  { value: 's3', label: 'Amazon S3', icon: '☁️' },
  { value: 'minio', label: 'MinIO', icon: '🗄️' },
  { value: 'spaces', label: 'DigitalOcean Spaces', icon: '🌊' },
  { value: 'backblaze', label: 'Backblaze B2', icon: '⚡' },
  { value: 'azure_blob', label: 'Azure Blob Storage', icon: '☁️' },
  { value: 'gcs', label: 'Google Cloud Storage', icon: '☁️' },
]

function DestinationModal({ open, onClose, onSaved, backupId, destination }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    storage_type: 'local',
    storage_name: '',
    file_path: '',
    base_path: '',
    priority: 0,
    storage_config: '',
  })

  useEffect(() => {
    if (destination) {
      setFormData({
        storage_type: destination.storage_type,
        storage_name: destination.storage_name || '',
        file_path: destination.file_path,
        base_path: destination.base_path || '',
        priority: destination.priority || 0,
        storage_config: destination.storage_config || '',
      })
    } else {
      // Reset form for new destination
      setFormData({
        storage_type: 'local',
        storage_name: '',
        file_path: '',
        base_path: '',
        priority: 0,
        storage_config: '',
      })
    }
  }, [destination])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (destination) {
        await api.updateBackupDestination(backupId, destination.id, formData)
      } else {
        await api.createBackupDestination(backupId, formData)
      }
      
      if (onSaved) onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save destination')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!destination) return
    if (!confirm('Are you sure you want to delete this destination?')) return

    setError('')
    setSaving(true)

    try {
      await api.deleteBackupDestination(backupId, destination.id)
      if (onSaved) onSaved()
    } catch (err) {
      setError(err.message || 'Failed to delete destination')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {destination ? 'Edit Destination' : 'Add New Destination'}
          </DialogTitle>
          <DialogDescription>
            {destination 
              ? 'Update the backup destination configuration.'
              : 'Add a new storage destination for this backup.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Storage Type */}
          <div className="space-y-2">
            <Label htmlFor="storage_type">Storage Type *</Label>
            <Select
              value={formData.storage_type}
              onValueChange={(value) => setFormData({ ...formData, storage_type: value })}
            >
              <SelectTrigger id="storage_type">
                <SelectValue placeholder="Select storage type" />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Name */}
          <div className="space-y-2">
            <Label htmlFor="storage_name">Storage Name</Label>
            <Input
              id="storage_name"
              value={formData.storage_name}
              onChange={(e) => setFormData({ ...formData, storage_name: e.target.value })}
              placeholder="e.g., External Backup Drive, AWS Production Backups"
            />
            <p className="text-xs text-muted-foreground">
              Optional friendly name for this destination
            </p>
          </div>

          {/* File Path */}
          <div className="space-y-2">
            <Label htmlFor="file_path">File Path *</Label>
            <Input
              id="file_path"
              value={formData.file_path}
              onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
              required
              placeholder="backups/database/backup_20251102.sql.gz"
            />
            <p className="text-xs text-muted-foreground">
              Relative path or S3 key for the backup file
            </p>
          </div>

          {/* Base Path (for local/external storage) */}
          {(formData.storage_type === 'local' || formData.storage_type === 'local_external') && (
            <div className="space-y-2">
              <Label htmlFor="base_path">Base Path</Label>
              <Input
                id="base_path"
                value={formData.base_path}
                onChange={(e) => setFormData({ ...formData, base_path: e.target.value })}
                placeholder="/app/backups or /mnt/external_hdd"
              />
              <p className="text-xs text-muted-foreground">
                Base directory where the file is stored
              </p>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Lower number = higher priority (0 = highest). Determines execution order.
            </p>
          </div>

          {/* Storage Config (for cloud storage) */}
          {!['local', 'local_external'].includes(formData.storage_type) && (
            <div className="space-y-2">
              <Label htmlFor="storage_config">Storage Configuration (JSON)</Label>
              <Textarea
                id="storage_config"
                value={formData.storage_config}
                onChange={(e) => setFormData({ ...formData, storage_config: e.target.value })}
                placeholder='{"bucket": "my-backups", "region": "us-east-1"}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Optional JSON configuration for cloud storage (bucket, region, etc.)
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {destination && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : destination ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DestinationModal
