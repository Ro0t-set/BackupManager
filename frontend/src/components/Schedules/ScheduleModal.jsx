import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/services/api';

const SCHEDULE_TYPES = [
  { value: 'interval', label: 'Interval-based', intervals: ['hourly', 'daily', 'weekly', 'monthly'] },
  { value: 'cron', label: 'Custom (Cron Expression)' },
  { value: 'manual', label: 'Manual Only' },
];

// Default cron expressions for interval types
const INTERVAL_CRON = {
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *',
};

function ScheduleModal({ open, onClose, schedule, databaseId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule_type: 'interval',
    interval_value: 'daily',
    cron_expression: '0 0 * * *',
    retention_days: 7,
    max_backups: 10,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name || '',
        description: schedule.description || '',
        schedule_type: schedule.schedule_type || 'interval',
        interval_value: schedule.interval_value || 'daily',
        cron_expression: schedule.cron_expression || '0 0 * * *',
        retention_days: schedule.retention_days || 7,
        max_backups: schedule.max_backups || 10,
        is_active: schedule.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        schedule_type: 'interval',
        interval_value: 'daily',
        cron_expression: '0 0 * * *',
        retention_days: 7,
        max_backups: 10,
        is_active: true,
      });
    }
    setError(null);
  }, [schedule, open]);

  const handleScheduleTypeChange = (type) => {
    const newFormData = {
      ...formData,
      schedule_type: type,
    };

    // Set defaults based on type
    if (type === 'interval') {
      newFormData.interval_value = 'daily';
      newFormData.cron_expression = INTERVAL_CRON.daily;
    } else if (type === 'cron') {
      newFormData.interval_value = null;
      newFormData.cron_expression = '0 0 * * *';
    } else if (type === 'manual') {
      newFormData.interval_value = null;
      newFormData.cron_expression = null;
    }

    setFormData(newFormData);
  };

  const handleIntervalChange = (interval) => {
    setFormData({
      ...formData,
      interval_value: interval,
      cron_expression: INTERVAL_CRON[interval] || formData.cron_expression,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        database_id: databaseId,
      };

      if (schedule?.id) {
        await api.updateSchedule(schedule.id, payload);
      } else {
        await api.createSchedule(payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Edit Schedule' : 'Create New Schedule'}
          </DialogTitle>
          <DialogDescription>
            Configure automated backup schedule for this database
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Schedule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Backup"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Schedule Configuration</h3>
            
            <div>
              <Label htmlFor="schedule_type">Schedule Type *</Label>
              <Select
                value={formData.schedule_type}
                onValueChange={handleScheduleTypeChange}
              >
                <SelectTrigger id="schedule_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interval Selection (only for interval type) */}
            {formData.schedule_type === 'interval' && (
              <div>
                <Label htmlFor="interval_value">Interval *</Label>
                <Select
                  value={formData.interval_value || 'daily'}
                  onValueChange={handleIntervalChange}
                >
                  <SelectTrigger id="interval_value">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Cron: {formData.cron_expression || 'N/A'}
                </p>
              </div>
            )}

            {/* Cron Expression (only for cron type) */}
            {formData.schedule_type === 'cron' && (
              <div>
                <Label htmlFor="cron_expression">Cron Expression *</Label>
                <Input
                  id="cron_expression"
                  value={formData.cron_expression || ''}
                  onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                  placeholder="0 0 * * *"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: minute hour day month weekday (e.g., "0 0 * * *" = daily at midnight)
                </p>
              </div>
            )}

            {/* Manual type message */}
            {formData.schedule_type === 'manual' && (
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                Manual schedules must be triggered manually. No automatic execution will occur.
              </div>
            )}
          </div>

          {/* Retention Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Retention Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retention_days">Retention Days *</Label>
                <Input
                  id="retention_days"
                  type="number"
                  min="1"
                  value={formData.retention_days}
                  onChange={(e) => setFormData({ ...formData, retention_days: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep backups for this many days
                </p>
              </div>

              <div>
                <Label htmlFor="max_backups">Max Backups *</Label>
                <Input
                  id="max_backups"
                  type="number"
                  min="1"
                  value={formData.max_backups}
                  onChange={(e) => setFormData({ ...formData, max_backups: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of backups to keep
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Schedule is active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                schedule ? 'Update Schedule' : 'Create Schedule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleModal;
