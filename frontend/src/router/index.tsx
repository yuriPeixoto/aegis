import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { InboxPage } from '../pages/InboxPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { TicketDetailPage } from '../pages/TicketDetailPage'
import { ShortcutsPage } from '../pages/ShortcutsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AgentProfilePage } from '../pages/AgentProfilePage'
import { CalendarPage } from '../pages/CalendarPage'

import { DashboardLayout } from '../pages/dashboard/DashboardLayout'
import { OverviewTab } from '../pages/dashboard/OverviewTab'
import { MonitorTab } from '../pages/dashboard/MonitorTab'
import { ReportsTab } from '../pages/dashboard/ReportsTab'
import { AgentsTab } from '../pages/dashboard/AgentsTab'

import { SettingsLayout } from '../pages/settings/SettingsLayout'
import { UsersTab } from '../pages/settings/UsersTab'
import { SourcesTab } from '../pages/settings/SourcesTab'
import { TagsTab } from '../pages/settings/TagsTab'
import { SlaTab } from '../pages/settings/SlaTab'
import { AutoCloseTab } from '../pages/settings/AutoCloseTab'
import { CannedResponsesTab } from '../pages/settings/CannedResponsesTab'
import { EscalationTab } from '../pages/settings/EscalationTab'
import { NotificationsTab } from '../pages/settings/NotificationsTab'

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
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <OverviewTab /> },
          { path: 'monitor',  element: <MonitorTab /> },
          { path: 'reports',  element: <ReportsTab /> },
          { path: 'agents',   element: <AgentsTab /> },
          { path: 'agent/:id', element: <AgentProfilePage /> },
        ],
      },
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: 'users',         element: <UsersTab /> },
          { path: 'sources',       element: <SourcesTab /> },
          { path: 'tags',          element: <TagsTab /> },
          { path: 'sla',           element: <SlaTab /> },
          { path: 'autoclose',     element: <AutoCloseTab /> },
          { path: 'canned',        element: <CannedResponsesTab /> },
          { path: 'escalation',    element: <EscalationTab /> },
          { path: 'notifications', element: <NotificationsTab /> },
        ],
      },
      {
        path: '/tickets/:id',
        element: <TicketDetailPage />,
      },
      {
        path: '/agenda',
        element: <CalendarPage />,
      },
      {
        path: '/shortcuts',
        element: <ShortcutsPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      // Legacy redirect for old /agent/:id links
      {
        path: '/agent/:id',
        element: <Navigate to="/dashboard/agents" replace />,
      },
    ],
  },
])
