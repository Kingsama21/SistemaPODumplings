import { createBrowserRouter } from 'react-router';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import Tickets from './pages/Tickets';
import History from './pages/History';
import Admin from './pages/Admin';
import Cash from './pages/Cash';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/nueva-orden',
    Component: NewOrder,
  },
  {
    path: '/ordenes',
    Component: Orders,
  },
  {
    path: '/cocina',
    Component: Kitchen,
  },
  {
    path: '/tickets',
    Component: Tickets,
  },
  {
    path: '/caja',
    Component: Cash,
  },
  {
    path: '/historial',
    Component: History,
  },
  {
    path: '/admin',
    Component: Admin,
  },
]);
