import { useState } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')

  // Check API health on mount
  useState(() => {
    fetch(import.meta.env.VITE_API_URL?.replace('/api', '') + '/api/health')
      .then(res => res.json())
      .then(data => setApiStatus(data.status))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                BackupManager
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">API Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  apiStatus === 'healthy'
                    ? 'bg-green-100 text-green-800'
                    : apiStatus === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {apiStatus}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">
                  Welcome to BackupManager
                </h2>
                <p className="text-blue-800">
                  Multi-database backup management system for PostgreSQL, MySQL, MongoDB, and Redis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">💾</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Automated Backups</h3>
                  <p className="text-sm text-gray-600">Schedule and manage database backups</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Secure Storage</h3>
                  <p className="text-sm text-gray-600">Encrypted backup storage</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Monitor & Restore</h3>
                  <p className="text-sm text-gray-600">Track backups and restore easily</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
                       className="text-blue-600 hover:text-blue-800 underline">
                      📖 API Documentation
                    </a>
                  </li>
                  <li className="text-gray-600">
                    🚀 Frontend: http://localhost:5173
                  </li>
                  <li className="text-gray-600">
                    🔧 Backend: http://localhost:8000
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
