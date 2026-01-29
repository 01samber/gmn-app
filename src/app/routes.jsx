import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { authApi } from "../api";
import AppShell from "../layout/AppShell";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import WorkOrders from "../pages/WorkOrders";
import Technicians from "../pages/Technicians";
import Costs from "../pages/Costs";
import Proposals from "../pages/Proposals";
import Files from "../pages/Files";
import Calendar from "../pages/Calendar";
import Commission from "../pages/Commission";

// Protected route - requires authentication
function ProtectedRoute() {
  if (!authApi.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Public route - redirects to dashboard if already logged in
function PublicRoute() {
  if (authApi.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// Root redirect - check auth and redirect accordingly
function RootRedirect() {
  if (authApi.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // Root path - redirect based on auth status
  { 
    path: "/", 
    element: <RootRedirect /> 
  },
  // Login page - only for non-authenticated users
  { 
    path: "/login", 
    element: <PublicRoute />,
    children: [
      { index: true, element: <Login /> }
    ]
  },
  // Protected routes - require authentication
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/work-orders", element: <WorkOrders /> },
          { path: "/workorders", element: <Navigate to="/work-orders" replace /> },
          { path: "/technicians", element: <Technicians /> },
          { path: "/costs", element: <Costs /> },
          { path: "/proposals", element: <Proposals /> },
          { path: "/files", element: <Files /> },
          { path: "/calendar", element: <Calendar /> },
          { path: "/commission", element: <Commission /> },
        ],
      },
    ],
  },
  // Catch all - redirect to login
  { path: "*", element: <RootRedirect /> },
]);

export function clearAuthed() {
  authApi.logout();
}
