import { useAuth } from '../hooks/useAuth'

function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💾</span>
              <h1 className="text-2xl font-bold text-gray-900">BackupManager</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.username}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              {user?.is_admin && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                  Admin
                </span>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome back, {user?.username}! 👋
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
                <span className="text-3xl">📦</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600 mt-2">No backups yet</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Databases</h3>
                <span className="text-3xl">🗄️</span>
              </div>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600 mt-2">Add your first database</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedules</h3>
                <span className="text-3xl">⏰</span>
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
                <span className="text-4xl">➕</span>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Add Database</h4>
                  <p className="text-sm text-gray-600">Connect a new database</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
                <span className="text-4xl">🚀</span>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Create Backup</h4>
                  <p className="text-sm text-gray-600">Run a manual backup now</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition">
                <span className="text-4xl">⏰</span>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Schedule Backup</h4>
                  <p className="text-sm text-gray-600">Set up automated backups</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition">
                <span className="text-4xl">📊</span>
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
              <span className="text-3xl">📖</span>
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
      </main>
    </div>
  )
}

export default Dashboard
