import { createBrowserRouter } from 'react-router';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import Tickets from './pages/Tickets';
import History from './pages/History';
import Admin from './pages/Admin';
import Cash from './pages/Cash';
import Tables from './pages/Tables';
import Deliveries from './pages/Deliveries';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: () => (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mesas',
    Component: () => (
      <ProtectedRoute>
        <Tables />
      </ProtectedRoute>
    ),
  },
  {
    path: '/entregas',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <Deliveries />
      </ProtectedRoute>
    ),
  },
  {
    path: '/nueva-orden',
    Component: () => (
      <ProtectedRoute>
        <NewOrder />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ordenes',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <Orders />
      </ProtectedRoute>
    ),
  },
  {
    path: '/cocina',
    Component: () => (
      <ProtectedRoute>
        <Kitchen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tickets',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <Tickets />
      </ProtectedRoute>
    ),
  },
  {
    path: '/caja',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <Cash />
      </ProtectedRoute>
    ),
  },
  {
    path: '/historial',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <History />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    Component: () => (
      <ProtectedRoute requiredRole="admin">
        <Admin />
      </ProtectedRoute>
    ),
  },
]);
