import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { InboxPage } from '../pages/InboxPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppShell title="Inbox" />,
    children: [
      {
        path: '/',
        element: <InboxPage />,
      },
    ],
  },
])
