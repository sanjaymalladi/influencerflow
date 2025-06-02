import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SignInPrompt from './SignInPrompt';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  requireRole?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallbackMessage,
  requireRole 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#FFE600]" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SignInPrompt 
        message={fallbackMessage || "Please sign in to access this page"} 
      />
    );
  }

  // Check role-based access if required
  if (requireRole && user) {
    const userRole = user.role;
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    
    if (!allowedRoles.includes(userRole)) {
      return (
        <SignInPrompt 
          message={`This page is restricted to ${allowedRoles.join(' or ')} users. Your current role is ${userRole}.`}
        />
      );
    }
  }

  // User is authenticated (and has required role if specified)
  return <>{children}</>;
};

export default ProtectedRoute; 