'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  const { register, isLoading, error: authError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    // Validation
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const success = await register(username, email, password);
    
    if (success) {
      alert('Account created! You are now logged in.');
      router.push('/');
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">SEIJA'S MAGAZINE</h1>
        
        <div className="bg-white p-8 rounded-lg border">
          <h2 className="text-2xl font-bold mb-6">Create Account</h2>
          
          {displayError && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {displayError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white p-3 rounded font-medium disabled:bg-gray-400"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}