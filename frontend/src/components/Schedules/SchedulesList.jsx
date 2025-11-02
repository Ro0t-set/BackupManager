import { useState } from 'react'
import { Calendar, Clock, Edit, Trash2, Plus, Play, Pause } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import ScheduleModal from './ScheduleModal'

function SchedulesList({ schedules, databaseId, onUpdate }) {
  const [deleting, setDeleting] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)

  const formatCronExpression = (expr) => {
    if (!expr) return 'N/A'
    
    // Common patterns
    const patterns = {
      '0 0 * * *': 'Daily at midnight',
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
    }
    
    return patterns[expr] || expr
  }

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      setDeleting(scheduleId)
      await api.deleteSchedule(scheduleId)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to delete schedule:', err)
      alert('Failed to delete schedule: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const toggleScheduleStatus = async (schedule) => {
    try {
      await api.updateSchedule(schedule.id, {
        is_active: !schedule.is_active
      })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to toggle schedule:', err)
      alert('Failed to update schedule: ' + err.message)
    }
  }

  const handleOpenModal = (schedule = null) => {
    setSelectedSchedule(schedule)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedSchedule(null)
  }

  const handleModalSuccess = () => {
    handleCloseModal()
    if (onUpdate) onUpdate()
  }

  if (!schedules || schedules.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No schedules configured</CardTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Create a schedule to automate backups
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
        
        <ScheduleModal
          open={modalOpen}
          onClose={handleCloseModal}
          schedule={selectedSchedule}
          databaseId={databaseId}
          onSuccess={handleModalSuccess}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Backup Schedules</h3>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>

        <div className="grid gap-4">
          {schedules.map((schedule) => {
            const successRate = schedule.total_backups > 0
              ? ((schedule.successful_backups / schedule.total_backups) * 100).toFixed(1)
              : 0

            return (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${schedule.is_active ? 'bg-primary/10' : 'bg-muted'} flex items-center justify-center`}>
                        <Calendar className={`w-5 h-5 ${schedule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{schedule.name}</CardTitle>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground">{schedule.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Schedule Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                      <p className="text-sm capitalize">{schedule.schedule_type}</p>
                    </div>
                    
                    {schedule.schedule_type === 'cron' && schedule.cron_expression && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Schedule</p>
                        <p className="text-sm">{formatCronExpression(schedule.cron_expression)}</p>
                        <p className="text-xs text-muted-foreground">{schedule.cron_expression}</p>
                      </div>
                    )}
                    
                    {schedule.schedule_type === 'interval' && schedule.interval_value && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Interval</p>
                        <p className="text-sm capitalize">{schedule.interval_value}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Retention</p>
                      <p className="text-sm">{schedule.retention_days} days</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{schedule.total_backups}</p>
                      <p className="text-xs text-muted-foreground">Total Backups</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{schedule.successful_backups}</p>
                      <p className="text-xs text-muted-foreground">Successful</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{successRate}%</p>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {schedule.last_run_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last run: {new Date(schedule.last_run_at).toLocaleString()}
                      </div>
                    )}
                    {schedule.next_run_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Next run: {new Date(schedule.next_run_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleScheduleStatus(schedule)}
                    >
                      {schedule.is_active ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(schedule)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(schedule.id)}
                      disabled={deleting === schedule.id}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        onClose={handleCloseModal}
        schedule={selectedSchedule}
        databaseId={databaseId}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}

export default SchedulesList
