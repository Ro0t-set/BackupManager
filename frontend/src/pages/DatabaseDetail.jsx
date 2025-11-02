import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Database as DatabaseIcon, Server, Clock, HardDrive, 
  CheckCircle, XCircle, AlertTriangle, Plus, RefreshCw, Calendar,
  Activity, TrendingUp
} from 'lucide-react'
import api from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BackupDestinations from '@/components/Backups/BackupDestinations'
import SchedulesList from '@/components/Schedules/SchedulesList'

const DB_TYPES = {
  postgresql: { name: 'PostgreSQL', color: 'bg-blue-500' },
  mysql: { name: 'MySQL', color: 'bg-orange-500' },
  mongodb: { name: 'MongoDB', color: 'bg-green-500' },
  redis: { name: 'Redis', color: 'bg-red-500' }
}

function DatabaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [database, setDatabase] = useState(null)

  useEffect(() => {
    loadDatabaseDetails()
  }, [id])

  const loadDatabaseDetails = async () => {
    try {
      setLoading(true)
      const data = await api.getDatabaseDetails(id)
      setDatabase(data)
      setError('')
    } catch (err) {
      setError('Failed to load database details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDatabaseDetails()
    setRefreshing(false)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const calculateSuccessRate = () => {
    if (!database || database.total_backups === 0) return 0
    return ((database.successful_backups / database.total_backups) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !database) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/databases')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Databases
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Database not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const dbType = DB_TYPES[database.db_type]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/databases')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className={`w-12 h-12 rounded-lg ${dbType.color} flex items-center justify-center`}>
            <Server className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{database.name}</h2>
            <p className="text-muted-foreground">
              {dbType.name} • {database.group_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => api.triggerManualBackup(database.id)}>
            <Plus className="w-4 h-4 mr-2" />
            Trigger Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{database.total_backups}</div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{calculateSuccessRate()}%</div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {database.successful_backups} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatFileSize(database.total_backup_size)}
              </div>
              <HardDrive className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {database.schedules.filter(s => s.is_active).length}
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {database.schedules.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Database Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-sm">{dbType.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Host</p>
              <p className="text-sm">{database.host}:{database.port}</p>
            </div>
            {database.database_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Database</p>
                <p className="text-sm">{database.database_name}</p>
              </div>
            )}
            {database.username && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Username</p>
                <p className="text-sm">{database.username}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={database.is_active ? 'default' : 'secondary'}>
                {database.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {database.last_backup_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
                <p className="text-sm">
                  {new Date(database.last_backup_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          {database.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{database.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="backups" className="w-full">
        <TabsList>
          <TabsTrigger value="backups">
            Recent Backups ({database.recent_backups.length})
          </TabsTrigger>
          <TabsTrigger value="schedules">
            Schedules ({database.schedules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          {database.recent_backups.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <DatabaseIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">No backups yet</CardTitle>
                <CardDescription className="mb-4">
                  Trigger your first backup to get started
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {database.recent_backups.map((backup) => (
                <Card key={backup.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{backup.name}</CardTitle>
                        <CardDescription>
                          {new Date(backup.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={
                          backup.status === 'completed' ? 'default' :
                          backup.status === 'failed' ? 'destructive' :
                          backup.status === 'in_progress' ? 'secondary' : 'outline'
                        }
                      >
                        {backup.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {backup.error_message && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{backup.error_message}</AlertDescription>
                      </Alert>
                    )}
                    
                    {backup.duration_seconds && (
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Duration: {backup.duration_seconds}s
                      </div>
                    )}

                    {/* Destinations */}
                    {backup.destinations && backup.destinations.length > 0 && (
                      <BackupDestinations 
                        destinations={backup.destinations}
                        backupId={backup.id}
                        onUpdate={handleRefresh}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <SchedulesList 
            schedules={database.schedules}
            databaseId={database.id}
            onUpdate={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DatabaseDetail
