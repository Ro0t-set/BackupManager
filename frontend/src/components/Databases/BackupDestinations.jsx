import { useState, useEffect } from 'react';
import { Download, FolderOpen, CheckCircle2, XCircle, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import api from '@/services/api';
import { toast } from 'sonner';

export default function BackupDestinations({ backupId, destinationResults, onUpdate }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Parse destination results if it's a string
  let results = null;
  try {
    results = typeof destinationResults === 'string'
      ? JSON.parse(destinationResults)
      : destinationResults;
  } catch (err) {
    console.error('Failed to parse destination_results:', err);
    return null;
  }

  // Verify files exist on mount
  useEffect(() => {
    if (backupId && results && Object.keys(results).length > 0) {
      verifyBackupFiles();
    }
  }, [backupId]);

  const verifyBackupFiles = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyBackupFiles(backupId);
      setVerification(result);
    } catch (err) {
      console.error('Failed to verify backup files:', err);
    } finally {
      setVerifying(false);
    }
  };

  if (!results || Object.keys(results).length === 0) {
    return null;
  }

  const handleDownload = async (destinationPath = null) => {
    setDownloading(true);
    try {
      const url = destinationPath
        ? `/api/backups/${backupId}/download?destination_path=${encodeURIComponent(destinationPath)}`
        : `/api/backups/${backupId}/download`;

      const response = await fetch(`http://localhost:8000${url}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Download failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'backup.sql.gz';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success('Download Started', {
        description: `Downloading ${filename}`
      });
    } catch (err) {
      toast.error('Download Failed', {
        description: err.message
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (deleteFiles = false) => {
    setDeleting(true);
    try {
      await api.deleteBackup(backupId, deleteFiles);
      toast.success('Backup Deleted', {
        description: deleteFiles
          ? 'Backup record and files deleted successfully'
          : 'Backup record deleted successfully'
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Delete Failed', {
        description: err.message
      });
    } finally {
      setDeleting(false);
    }
  };

  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;
  const hasAnySuccess = successCount > 0;
  const hasMissingFiles = verification && verification.missing_count > 0;

  return (
    <div className="space-y-3">
      {/* Warning if files are missing */}
      {hasMissingFiles && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {verification.missing_count} of {verification.total_count} backup file{verification.missing_count !== 1 ? 's' : ''} missing from disk.
            The files may have been moved or deleted manually.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Saved Locations ({successCount}/{totalCount})
          </span>
          {hasMissingFiles && (
            <Badge variant="destructive" className="text-xs">
              {verification.missing_count} Missing
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {hasAnySuccess && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload()}
              disabled={downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download'}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to delete only the backup record or also remove the backup files from all destinations?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(false)}>
                  Delete Record Only
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleDelete(true)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Record & Files
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(results).map(([path, result]) => {
          const fileVerification = verification?.destinations?.[path];
          const fileExists = fileVerification?.exists ?? true; // Default to true if not verified yet

          return (
            <div
              key={path}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="mt-0.5">
                {!fileExists ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                ) : result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm font-mono truncate block">
                    {result.file_path || path}
                  </code>
                  {result.success && result.size_mb && (
                    <Badge variant="secondary" className="text-xs">
                      {result.size_mb.toFixed(2)} MB
                    </Badge>
                  )}
                  {!fileExists && (
                    <Badge variant="destructive" className="text-xs">
                      File Missing
                    </Badge>
                  )}
                </div>

                {result.error && (
                  <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{result.error}</span>
                  </div>
                )}

                {!fileExists && (
                  <div className="flex items-start gap-2 mt-2 text-sm text-yellow-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Backup file not found on disk. It may have been moved or deleted.</span>
                  </div>
                )}
              </div>

              {result.success && fileExists && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(path)}
                  disabled={downloading}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
