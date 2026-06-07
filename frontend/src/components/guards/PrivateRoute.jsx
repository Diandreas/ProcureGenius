import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isNativePlatform } from '../../utils/platform';

// Non connecte : web -> landing marketing ; app mobile -> ecran de connexion.
const NOT_AUTH_REDIRECT = isNativePlatform() ? '/login' : '/landing';

function PrivateRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return isAuthenticated ? <Outlet /> : <Navigate to={NOT_AUTH_REDIRECT} replace />;
}

export default PrivateRoute;