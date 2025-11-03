import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, HardDrive, CheckCircle, XCircle, Calendar, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StatCard from '@/components/Dashboard/StatCard'
import api from '@/services/api'

function Dashboard() {
  const navigate = useNavigate()
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
    if (!bytes || bytes === 0) return null
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/80'
      case 'failed':
        return 'bg-destructive'
      case 'in_progress':
        return 'bg-primary'
      default:
        return 'bg-muted-foreground'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-destructive">Error: {error}</p>
          <button
            onClick={loadDashboardStats}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Retry
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
        <p className="text-muted-foreground mt-1">
          Backup system overview
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div onClick={() => navigate('/databases')} className="cursor-pointer">
          <StatCard
            title="Total Databases"
            value={stats.overview.total_databases}
            subtitle="Active monitored databases"
            icon={Database}
          />
        </div>
        <div onClick={() => navigate('/databases')} className="cursor-pointer">
          <StatCard
            title="Total Backups"
            value={stats.overview.total_backups}
            subtitle="Backups executed"
            icon={HardDrive}
          />
        </div>
        <div onClick={() => navigate('/databases')} className="cursor-pointer">
          <StatCard
            title="Storage Used"
            value={formatBytes(stats.overview.total_storage)}
            subtitle="Total storage"
            icon={TrendingUp}
          />
        </div>
        <div onClick={() => navigate('/databases')} className="cursor-pointer">
          <StatCard
            title="Success Rate"
            value={`${stats.overview.success_rate}%`}
            subtitle="Last 30 days"
            icon={CheckCircle}
          />
        </div>
      </div>

      {/* Backup Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Trends (Last 7 Days)</CardTitle>
          <CardDescription>Backup activity over the last week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 h-48">
            {stats.trends.map((day) => {
              const maxHeight = Math.max(...stats.trends.map(d => d.total))
              const heightPercent = maxHeight > 0 ? (day.total / maxHeight) * 100 : 0

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  {/* Bar container */}
                  <div className="w-full flex flex-col justify-end" style={{ height: '160px' }}>
                    <div
                      className="w-full bg-muted rounded-t-md overflow-hidden flex flex-col-reverse gap-[2px] p-[2px]"
                      style={{ height: `${heightPercent}%`, minHeight: day.total > 0 ? '20px' : '0px' }}
                    >
                      {/* Success segments */}
                      {Array.from({ length: day.successful }).map((_, i) => (
                        <div
                          key={`success-${i}`}
                          className="w-full h-2 bg-emerald-500/90 rounded-sm"
                          title={`Backup ${i + 1} completed`}
                        />
                      ))}
                      {/* Failed segments */}
                      {Array.from({ length: day.failed }).map((_, i) => (
                        <div
                          key={`failed-${i}`}
                          className="w-full h-2 bg-destructive/90 rounded-sm"
                          title={`Backup ${i + 1} failed`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Date label */}
                  <div className="text-xs text-muted-foreground text-center">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>

                  {/* Count */}
                  <div className="text-xs font-medium text-center">
                    {day.total > 0 ? day.total : '-'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500/90 rounded-sm" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive/90 rounded-sm" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
          </div>
        </CardContent>
      </Card>
      

      {/* Group Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics by Group</CardTitle>
          <CardDescription>Details for each database group</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No groups available</p>
          ) : (
            <div className="space-y-4">
              {stats.groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate('/groups')}
                  className="group/card border rounded-lg p-4 hover:bg-muted/30 transition-all hover:shadow-sm cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Success rate progress ring */}
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-muted/20"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeDasharray={`${group.success_rate} ${100 - group.success_rate}`}
                            className={group.success_rate >= 80 ? 'text-emerald-500' : group.success_rate >= 50 ? 'text-yellow-500' : 'text-destructive'}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold">{group.success_rate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        Databases
                      </div>
                      <div className="text-2xl font-bold">{group.database_count}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        Backups (30d)
                      </div>
                      <div className="text-2xl font-bold">{group.backup_count}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Storage
                      </div>
                      <div className="text-xl font-bold">{formatBytes(group.storage_used)}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last Backup
                      </div>
                      <div className="text-sm font-semibold">
                        {group.last_backup_at ? formatDate(group.last_backup_at) : 'Never'}
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
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Last 3 backups executed</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent_backups.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No backups available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_backups.map((backup, index) => (
                <div
                  key={backup.id}
                  onClick={() => navigate(`/databases/${backup.database_id}`)}
                  className="group relative flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer"
                >
                  {/* Status indicator line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getStatusColor(backup.status)}`}></div>

                  <div className="flex items-center gap-4 flex-1 ml-3">
                    {/* Status icon */}
                    <div className={`p-2 rounded-lg ${backup.status === 'completed' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                      {backup.status === 'completed' ? (
                        <CheckCircle className={`h-5 w-5 text-emerald-500`} />
                      ) : (
                        <XCircle className={`h-5 w-5 text-destructive`} />
                      )}
                    </div>

                    {/* Backup info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{backup.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        {backup.database_name}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="hidden md:flex items-center gap-6">
                      {formatBytes(backup.file_size) && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Size</div>
                          <div className="text-sm font-semibold">{formatBytes(backup.file_size)}</div>
                        </div>
                      )}
                      {backup.duration_seconds && backup.duration_seconds > 0 && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Duration</div>
                          <div className="text-sm font-semibold">{backup.duration_seconds}s</div>
                        </div>
                      )}
                      <div className="text-center min-w-[100px]">
                        <div className="text-xs text-muted-foreground mb-1">Date</div>
                        <div className="text-sm font-semibold">{formatDate(backup.created_at)}</div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'destructive' : 'default'}
                      className="ml-4"
                    >
                      {getStatusLabel(backup.status)}
                    </Badge>

                    {/* Arrow icon on hover */}
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Schedules */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            Active Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-bold">{stats.overview.total_schedules}</div>
            <div className="text-sm text-muted-foreground mb-1">scheduled tasks</div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Automated backup jobs running
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
