import { Package, Database as DatabaseIcon, Clock, Plus, Rocket, Calendar, BarChart3, BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

function Dashboard() {
  const { user } = useAuth()

  const stats = [
    { title: 'Total Backups', value: '0', description: 'No backups yet', icon: Package, color: 'text-blue-600' },
    { title: 'Databases', value: '0', description: 'Add your first database', icon: DatabaseIcon, color: 'text-green-600' },
    { title: 'Schedules', value: '0', description: 'Create backup schedules', icon: Clock, color: 'text-purple-600' },
  ]

  const quickActions = [
    { title: 'Add Database', description: 'Connect a new database', icon: Plus },
    { title: 'Create Backup', description: 'Run a manual backup now', icon: Rocket },
    { title: 'Schedule Backup', description: 'Set up automated backups', icon: Calendar },
    { title: 'View Reports', description: 'Check backup history', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back, {user?.username}!</CardTitle>
          <CardDescription>
            Manage your database backups, schedules, and monitoring from this dashboard.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{stat.title}</CardTitle>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-2">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto py-6 justify-start"
                >
                  <Icon className="w-10 h-10 mr-4" />
                  <div className="text-left">
                    <h4 className="font-semibold">{action.title}</h4>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Documentation Link */}
      <Alert>
        <BookOpen className="w-5 h-5" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">API Documentation</h3>
              <p className="text-sm">
                Explore the REST API endpoints and integrate with your systems
              </p>
            </div>
            <Button asChild>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Docs
              </a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default Dashboard
