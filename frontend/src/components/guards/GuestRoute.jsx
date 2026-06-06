import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Routes réservées aux visiteurs non connectés (login, register).
// Un utilisateur déjà authentifié est redirigé vers son tableau de bord.
function GuestRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default GuestRoute;
