import { useState } from 'react'
import { 
  HardDrive, Cloud, Database, Server, ExternalLink, 
  CheckCircle, XCircle, AlertTriangle, Edit, Trash2, Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import DestinationModal from './DestinationModal'

const STORAGE_ICONS = {
  local: HardDrive,
  local_external: ExternalLink,
  s3: Cloud,
  minio: Database,
  spaces: Cloud,
  backblaze: Cloud,
  azure_blob: Cloud,
  gcs: Cloud,
}

const STORAGE_NAMES = {
  local: 'Local Storage',
  local_external: 'External Storage',
  s3: 'Amazon S3',
  minio: 'MinIO',
  spaces: 'DigitalOcean Spaces',
  backblaze: 'Backblaze B2',
  azure_blob: 'Azure Blob',
  gcs: 'Google Cloud Storage',
}

function BackupDestinations({ destinations, backupId, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [editingDestination, setEditingDestination] = useState(null)

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const getFileStatusIcon = (fileInfo) => {
    if (!fileInfo) return null
    
    if (fileInfo.exists && fileInfo.is_accessible) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>File verified: {formatFileSize(fileInfo.file_size_on_disk)}</p>
              <p className="text-xs text-muted-foreground">{fileInfo.absolute_path}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    } else if (fileInfo.exists && !fileInfo.is_accessible) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>File exists but not accessible</p>
              <p className="text-xs">{fileInfo.error_message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <XCircle className="w-5 h-5 text-red-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>File not found</p>
              <p className="text-xs">{fileInfo.error_message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
  }

  const handleEdit = (destination) => {
    setEditingDestination(destination)
    setShowModal(true)
  }

  const handleAddNew = () => {
    setEditingDestination(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDestination(null)
  }

  const handleSaved = () => {
    handleCloseModal()
    if (onUpdate) onUpdate()
  }

  if (!destinations || destinations.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No destinations configured</p>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Destination
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Backup Destinations ({destinations.length})</h4>
        <Button size="sm" variant="outline" onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {destinations.map((destination) => {
          const StorageIcon = STORAGE_ICONS[destination.storage_type] || Server
          
          return (
            <Card key={destination.id} className="border-l-4" style={{
              borderLeftColor: 
                destination.status === 'completed' ? '#22c55e' : 
                destination.status === 'failed' ? '#ef4444' : 
                '#6b7280'
            }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {/* Storage Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <StorageIcon className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">
                        {destination.storage_name || STORAGE_NAMES[destination.storage_type]}
                      </p>
                      <Badge 
                        variant={
                          destination.status === 'completed' ? 'default' :
                          destination.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {destination.status}
                      </Badge>
                      {destination.priority === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {destination.base_path && `${destination.base_path}/`}{destination.file_path}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      {destination.file_size && destination.file_size > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(destination.file_size)}
                        </span>
                      )}
                      {destination.upload_duration_seconds && (
                        <span className="text-xs text-muted-foreground">
                          {destination.upload_duration_seconds}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* File Status & Actions */}
                  <div className="flex items-center gap-2">
                    {getFileStatusIcon(destination.file_info)}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(destination)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {destination.error_message && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-destructive">{destination.error_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showModal && (
        <DestinationModal
          open={showModal}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          backupId={backupId}
          destination={editingDestination}
        />
      )}
    </div>
  )
}

export default BackupDestinations
