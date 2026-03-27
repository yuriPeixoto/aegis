import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { InboxPage } from '../pages/InboxPage'
import { DashboardPage } from '../pages/DashboardPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { TicketDetailPage } from '../pages/TicketDetailPage'
import { ShortcutsPage } from '../pages/ShortcutsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
  },
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <InboxPage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '/tickets/:id',
        element: <TicketDetailPage />,
      },
      {
        path: '/shortcuts',
        element: <ShortcutsPage />,
      },
    ],
  },
])
