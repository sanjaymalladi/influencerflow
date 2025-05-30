import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from '@/services/apiService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    company?: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing auth token on app load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('userProfile');

      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching user profile
          const userData = await authAPI.getProfile();
          setUser(userData);
          localStorage.setItem('userProfile', JSON.stringify(userData));
        } catch (error) {
          console.error('Auth initialization failed:', error);
          // Clear invalid token
          localStorage.removeItem('authToken');
          localStorage.removeItem('userProfile');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { user: userData, token } = await authAPI.login({ email, password });
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userProfile', JSON.stringify(userData));
      
      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    company?: string;
  }): Promise<void> => {
    try {
      setIsLoading(true);
      const { user: newUser, token } = await authAPI.register(userData);
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userProfile', JSON.stringify(newUser));
      
      setUser(newUser);
      toast.success(`Welcome to InfluencerFlow, ${newUser.name}!`);
    } catch (error: any) {
      console.error('Registration failed:', error);
      const message = error.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('userProfile');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await authAPI.updateProfile(userData);
      setUser(updatedUser);
      localStorage.setItem('userProfile', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Profile update failed:', error);
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 