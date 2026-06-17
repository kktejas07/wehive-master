import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RouteFallback from './RouteFallback';

/**
 * Wraps a route element so only authenticated users can reach it.
 * Unauthenticated visitors are sent to /login with a `next` param so
 * the login page can redirect back after a successful sign-in.
 */
export default function PrivateRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteFallback />;
  if (!isAuthed) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return children;
}
