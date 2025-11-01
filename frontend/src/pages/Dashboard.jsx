import { Package, Database as DatabaseIcon, Clock, Plus, Rocket, Calendar, BarChart3, BookOpen } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome back, {user?.username}!
            </h2>
            <p className="text-gray-600">
              Manage your database backups, schedules, and monitoring from this dashboard.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Total Backups</h3>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600 mt-2">No backups yet</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Databases</h3>
                <DatabaseIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600 mt-2">Add your first database</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedules</h3>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600 mt-2">Create backup schedules</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
                <Plus className="w-10 h-10 text-blue-600" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Add Database</h4>
                  <p className="text-sm text-gray-600">Connect a new database</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
                <Rocket className="w-10 h-10 text-green-600" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Create Backup</h4>
                  <p className="text-sm text-gray-600">Run a manual backup now</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition">
                <Calendar className="w-10 h-10 text-purple-600" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Schedule Backup</h4>
                  <p className="text-sm text-gray-600">Set up automated backups</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition">
                <BarChart3 className="w-10 h-10 text-orange-600" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">View Reports</h4>
                  <p className="text-sm text-gray-600">Check backup history</p>
                </div>
              </button>
            </div>
          </div>

          {/* API Documentation Link */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">API Documentation</h3>
                <p className="text-sm text-blue-800">
                  Explore the REST API endpoints and integrate with your systems
                </p>
              </div>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Open Docs
              </a>
            </div>
          </div>
        </div>
    </div>
  )
}

export default Dashboard
