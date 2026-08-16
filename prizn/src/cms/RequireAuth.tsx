import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

function isEmailVerified(user: { emailVerified?: boolean } | null) {
  return user?.emailVerified !== false
}

/** Client-side gate for /cms/* — backend still enforces auth on APIs. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAF8F3] font-sans text-stone-600">
        Checking session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/cms/login" replace state={{ from: location.pathname }} />
  }

  if (!isEmailVerified(user)) {
    return <Navigate to="/cms/verify-email" replace />
  }

  return <Outlet />
}
