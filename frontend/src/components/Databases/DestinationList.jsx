import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Folder, Trash2, HardDrive, CheckCircle2, XCircle, Plus, AlertTriangle } from 'lucide-react'
import api from '@/services/api'
import PathPicker from './PathPicker'

export default function DestinationList({ databaseId, destinations, onUpdate }) {
  const [showPathPicker, setShowPathPicker] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAddDestination = async (path) => {
    setLoading(true)
    setError(null)

    try {
      await api.createDatabaseDestination(databaseId, {
        database_id: databaseId,
        path,
        enabled: true
      })
      setShowPathPicker(false)
      onUpdate() // Refresh destinations list
    } catch (err) {
      setError(err.message || 'Failed to add destination')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEnabled = async (destinationId, currentEnabled) => {
    setLoading(true)
    setError(null)

    try {
      await api.updateDatabaseDestination(databaseId, destinationId, {
        enabled: !currentEnabled
      })
      onUpdate()
    } catch (err) {
      setError(err.message || 'Failed to update destination')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDestination = async (destinationId) => {
    setLoading(true)
    setError(null)

    try {
      await api.deleteDatabaseDestination(databaseId, destinationId)
      setDeletingId(null)
      onUpdate()
    } catch (err) {
      setError(err.message || 'Failed to delete destination')
      setDeletingId(null)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (showPathPicker) {
    return (
      <PathPicker
        databaseId={databaseId}
        onPathSelected={handleAddDestination}
        onCancel={() => setShowPathPicker(false)}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Backup Destinations
            </CardTitle>
            <CardDescription>
              Configure where backups will be stored. Recommended: at least 2 destinations.
            </CardDescription>
          </div>
          <Button onClick={() => setShowPathPicker(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Destination
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {destinations && destinations.length === 0 && (
          <Alert>
            <AlertDescription>
              No backup destinations configured yet. Add at least one destination to enable backups.
            </AlertDescription>
          </Alert>
        )}

        {destinations && destinations.length > 0 && (
          <div className="space-y-2">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{destination.path}</span>
                      {destination.enabled ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Added: {formatDateTime(destination.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Enabled</span>
                    <Switch
                      checked={destination.enabled}
                      onCheckedChange={() => handleToggleEnabled(destination.id, destination.enabled)}
                      disabled={loading}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(destination.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {destinations && destinations.length < 2 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommendation:</strong> Add at least one more destination for redundancy.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Destination?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the destination configuration. Existing backup files at this location
              will NOT be deleted, but new backups will no longer be saved here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteDestination(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
