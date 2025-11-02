import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FolderOpen, CheckCircle2, XCircle, AlertTriangle, HardDrive } from 'lucide-react'
import api from '@/services/api'

const COMMON_PATHS = [
  '/home',
  '/mnt',
  '/media',
  '/opt/backups',
  '/var/backups',
]

export default function PathPicker({ databaseId, onPathSelected, onCancel }) {
  const [selectedPath, setSelectedPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null)
  const [error, setError] = useState(null)

  const validatePath = async (path) => {
    if (!path || path.trim() === '') {
      setValidation(null)
      return
    }

    setValidating(true)
    setError(null)

    try {
      const result = await api.validateDestinationPath(databaseId, path)
      setValidation(result)
    } catch (err) {
      setError(err.message || 'Failed to validate path')
      setValidation(null)
    } finally {
      setValidating(false)
    }
  }

  const handlePathChange = (path) => {
    setSelectedPath(path)
    // Debounce validation
    const timeoutId = setTimeout(() => validatePath(path), 500)
    return () => clearTimeout(timeoutId)
  }

  const handleQuickSelect = (path) => {
    setSelectedPath(path)
    validatePath(path)
  }

  const handleAdd = () => {
    if (validation && validation.valid) {
      onPathSelected(selectedPath)
    }
  }

  const getValidationIcon = () => {
    if (validating) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    if (!validation) return null

    if (validation.valid) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getValidationMessage = () => {
    if (!validation) return null

    if (!validation.exists) {
      return { type: 'error', message: 'Path does not exist' }
    }
    if (!validation.is_directory) {
      return { type: 'error', message: 'Path is not a directory' }
    }
    if (!validation.is_writable) {
      return { type: 'error', message: 'Path is not writable' }
    }
    if (validation.valid && validation.free_space_gb !== null) {
      return {
        type: 'success',
        message: `Path is valid • ${validation.free_space_gb.toFixed(1)} GB free`
      }
    }
    if (validation.valid) {
      return { type: 'success', message: 'Path is valid' }
    }

    return { type: 'error', message: 'Path validation failed' }
  }

  const validationMsg = getValidationMessage()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Select Backup Destination
        </CardTitle>
        <CardDescription>
          Choose a folder where backups will be saved. The path must exist and be writable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Access */}
        <div>
          <Label className="mb-2 block">Quick Access</Label>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_PATHS.map((path) => (
              <Button
                key={path}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(path)}
                className="justify-start"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {path}
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Path Input */}
        <div className="space-y-2">
          <Label htmlFor="custom-path">Or enter custom path</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="custom-path"
                value={selectedPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/backup/directory"
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>
          </div>

          {/* Validation Message */}
          {validationMsg && (
            <Alert
              variant={validationMsg.type === 'error' ? 'destructive' : 'default'}
              className={validationMsg.type === 'success' ? 'border-green-200 bg-green-50' : ''}
            >
              <HardDrive className="h-4 w-4" />
              <AlertDescription>
                {validationMsg.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Recommended:</strong> Add at least 2 destinations for redundancy (e.g., local drive + external HDD + NAS)
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!validation || !validation.valid || validating}
          >
            Add Destination
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
