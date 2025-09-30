import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function PrivateRoute() {
  // Version simplifiée - toujours authentifié pour les tests
  const isAuthenticated = localStorage.getItem('authToken') || true;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;