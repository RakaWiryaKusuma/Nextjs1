'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  bio?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize on client-side only
  useEffect(() => {
    const client = getSupabase();
    setSupabase(client);
    
    if (client) {
      checkAuth(client);
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = async (client: any) => {
    try {
      const { data: { session } } = await client.auth.getSession();
      
      if (session?.user) {
        const { data: userData } = await client
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      setError('Auth service not available');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return false;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      setError('Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      setError('Auth service not available');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Registering:', { username, email });
      
      // 1. Check if user exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email},username.eq.${username}`);
      
      if (existingUsers && existingUsers.length > 0) {
        setError('User already exists');
        return false;
      }
      
      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('No user created');
      
      console.log('Auth user created:', authData.user.id);
      
      // 3. Create profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username,
          email,
          role: 'user',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
          created_at: new Date().toISOString()
        });
      
      if (profileError) throw profileError;
      
      console.log('Profile created');
      
      // 4. Auto login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (loginError) throw loginError;
      
      // 5. Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      console.log('Registration complete!');
      return true;
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}