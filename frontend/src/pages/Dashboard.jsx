import { useState, useEffect } from 'react'
import { Database, HardDrive, CheckCircle, XCircle, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StatCard from '@/components/Dashboard/StatCard'
import api from '@/services/api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      const data = await api.getDashboardStats()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'in_progress':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completato'
      case 'failed':
        return 'Fallito'
      case 'in_progress':
        return 'In corso'
      case 'pending':
        return 'In attesa'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Errore: {error}</p>
          <button
            onClick={loadDashboardStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Riprova
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Panoramica generale del sistema di backup
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Database Totali"
          value={stats.overview.total_databases}
          subtitle="Database attivi monitorati"
          icon={Database}
        />
        <StatCard
          title="Backup Totali"
          value={stats.overview.total_backups}
          subtitle="Backup eseguiti"
          icon={HardDrive}
        />
        <StatCard
          title="Spazio Utilizzato"
          value={formatBytes(stats.overview.total_storage)}
          subtitle="Storage totale"
          icon={TrendingUp}
        />
        <StatCard
          title="Tasso di Successo"
          value={`${stats.overview.success_rate}%`}
          subtitle={`${stats.overview.failed_backups} falliti negli ultimi 30 giorni`}
          icon={CheckCircle}
        />
      </div>

      {/* Backup Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Backup (Ultimi 7 giorni)</CardTitle>
          <CardDescription>Andamento dei backup nell'ultima settimana</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.trends.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden flex">
                    {day.successful > 0 && (
                      <div
                        className="bg-green-500 dark:bg-green-600 flex items-center justify-center text-xs text-white font-medium"
                        style={{ width: `${(day.successful / day.total) * 100}%` }}
                        title={`${day.successful} completati`}
                      >
                        {day.successful > 0 && day.successful}
                      </div>
                    )}
                    {day.failed > 0 && (
                      <div
                        className="bg-red-500 dark:bg-red-600 flex items-center justify-center text-xs text-white font-medium"
                        style={{ width: `${(day.failed / day.total) * 100}%` }}
                        title={`${day.failed} falliti`}
                      >
                        {day.failed > 0 && day.failed}
                      </div>
                    )}
                  </div>
                  <div className="w-16 text-sm text-right text-muted-foreground">
                    {day.total} totali
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiche per Gruppo</CardTitle>
          <CardDescription>Dettagli per ogni gruppo di database</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessun gruppo disponibile</p>
          ) : (
            <div className="space-y-4">
              {stats.groups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                    <Badge variant={group.success_rate >= 80 ? 'success' : group.success_rate >= 50 ? 'warning' : 'destructive'}>
                      {group.success_rate}% successo
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Database</div>
                      <div className="text-xl font-semibold">{group.database_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Backup (30gg)</div>
                      <div className="text-xl font-semibold">{group.backup_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Storage</div>
                      <div className="text-xl font-semibold">{formatBytes(group.storage_used)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Ultimo Backup</div>
                      <div className="text-sm font-semibold">
                        {group.last_backup_at ? formatDate(group.last_backup_at) : 'Mai'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Recenti</CardTitle>
          <CardDescription>Ultimi 3 backup eseguiti</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent_backups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessun backup disponibile</p>
          ) : (
            <div className="space-y-2">
              {stats.recent_backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(backup.status)}`}></div>
                    <div>
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-muted-foreground">{backup.database_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatBytes(backup.file_size)}</div>
                      {backup.duration_seconds && (
                        <div className="text-xs text-muted-foreground">{backup.duration_seconds}s</div>
                      )}
                    </div>
                    <Badge variant={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'destructive' : 'default'}>
                      {getStatusLabel(backup.status)}
                    </Badge>
                    <div className="text-sm text-muted-foreground w-32 text-right">
                      {formatDate(backup.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedulazioni Attive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.overview.total_schedules}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Backup automatici programmati
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
