import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom'
import { Database, LayoutDashboard, FolderOpen, LogOut, Loader2 } from 'lucide-react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Groups from '@/pages/Groups'
import Databases from '@/pages/Databases'
import DatabaseDetail from '@/pages/DatabaseDetail'

function AppLayout() {
  const { isAuthenticated, loading, user, logout } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'groups', label: 'Groups', icon: FolderOpen, path: '/groups' },
    { id: 'databases', label: 'Databases', icon: Database, path: '/databases' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">BackupManager</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.full_name || user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              {user?.is_admin && (
                <Badge variant="secondary">Admin</Badge>
              )}
              <Button variant="destructive" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64">
            <Card className="p-2">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path || 
                                   (item.id === 'databases' && location.pathname.startsWith('/databases'))
                  return (
                    <NavLink key={item.id} to={item.path}>
                      {({ isActive: routeActive }) => (
                        <Button
                          variant={(isActive || routeActive) ? 'default' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {item.label}
                        </Button>
                      )}
                    </NavLink>
                  )
                })}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/databases" element={<Databases />} />
              <Route path="/databases/:id" element={<DatabaseDetail />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

