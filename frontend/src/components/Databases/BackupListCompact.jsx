import { useState } from 'react'
import { Clock, Calendar, HardDrive, Info, Download, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import BackupDestinations from './BackupDestinations'
import { Alert, AlertDescription } from '@/components/ui/alert'
import api from '@/services/api'

export default function BackupListCompact({ backups, onUpdate }) {
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [backupToDelete, setBackupToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      in_progress: 'secondary',
      pending: 'outline'
    }
    return variants[status] || 'outline'
  }

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Completato',
      failed: 'Fallito',
      in_progress: 'In corso',
      pending: 'In attesa'
    }
    return labels[status] || status
  }

  const handleRowClick = (backup) => {
    setSelectedBackup(backup)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedBackup(null)
  }

  const handleDeleteClick = (backup, e) => {
    e.stopPropagation()
    setBackupToDelete(backup)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!backupToDelete) return
    
    setIsDeleting(true)
    try {
      // Delete backup with files
      await api.deleteBackup(backupToDelete.id, true)
      
      // Close dialogs
      setDeleteDialogOpen(false)
      setBackupToDelete(null)
      
      // Refresh the backup list
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      alert('Errore durante l\'eliminazione del backup: ' + (error.message || 'Errore sconosciuto'))
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = (backup) => {
    // Allow deletion of failed or pending backups
    return backup.status === 'failed' || backup.status === 'pending'
  }

  if (!backups || backups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <HardDrive className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nessun backup disponibile</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => (
              <TableRow
                key={backup.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(backup)}
              >
                <TableCell className="font-medium">
                  {backup.name}
                </TableCell>
                <TableCell>
                  {backup.schedule_name ? (
                    <Badge variant="secondary" className="text-xs">
                      {backup.schedule_name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Manuale
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateShort(backup.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(backup.status)}>
                    {getStatusLabel(backup.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRowClick(backup)
                      }}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                    {canDelete(backup) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteClick(backup, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedBackup && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-col gap-2 pr-8">
                  <div className="flex items-center justify-between">
                    <span className="flex-1 truncate">{selectedBackup.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusBadge(selectedBackup.status)}>
                      {getStatusLabel(selectedBackup.status)}
                    </Badge>
                    {canDelete(selectedBackup) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          handleCloseModal()
                          handleDeleteClick(selectedBackup, e)
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Elimina
                      </Button>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Dettagli completi del backup
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Error Message */}
                {selectedBackup.error_message && (
                  <Alert variant="destructive">
                    <AlertDescription>{selectedBackup.error_message}</AlertDescription>
                  </Alert>
                )}

                {/* Backup Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground text-xs">Creato</div>
                      <div className="font-medium">{formatDate(selectedBackup.created_at)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground text-xs">Tipo</div>
                      <div className="font-medium">
                        {selectedBackup.schedule_name ? (
                          <Badge variant="secondary" className="text-xs">
                            Scheduler: {selectedBackup.schedule_name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Backup Manuale
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedBackup.started_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Iniziato</div>
                        <div className="font-medium">{formatDate(selectedBackup.started_at)}</div>
                      </div>
                    </div>
                  )}

                  {selectedBackup.completed_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Completato</div>
                        <div className="font-medium">{formatDate(selectedBackup.completed_at)}</div>
                      </div>
                    </div>
                  )}

                  {selectedBackup.duration_seconds && selectedBackup.duration_seconds > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Durata</div>
                        <div className="font-medium">{selectedBackup.duration_seconds}s</div>
                      </div>
                    </div>
                  )}

                  {selectedBackup.is_compressed && (
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Compressione</div>
                        <div className="font-medium">
                          {selectedBackup.compression_type || 'gzip'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Destinations */}
                {selectedBackup.destination_results && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Destinazioni Backup</h4>
                    <BackupDestinations
                      backupId={selectedBackup.id}
                      destinationResults={selectedBackup.destination_results}
                      onUpdate={() => {
                        onUpdate?.()
                        handleCloseModal()
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il backup "{backupToDelete?.name}"?
              <br />
              <strong className="text-destructive">
                Questa azione eliminerà anche tutti i file di backup dalle destinazioni e non può essere annullata.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
