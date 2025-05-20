
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShipTornadoLogo } from '@/components/logo/ShipTornadoLogo';
import { toast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: 'Success!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    } catch (err) {
      // Error is handled in the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side (dark navy section) */}
      <div className="hidden md:flex md:w-1/2 bg-tms-navy flex-col justify-center items-center p-12">
        <div className="mb-24">
          <ShipTornadoLogo size={64} className="text-white" spin={true} />
        </div>
        <div className="text-white max-w-md">
          <h1 className="text-4xl font-bold mb-4">Welcome back</h1>
          <p className="text-xl opacity-90">To continue, enter your sign in information</p>
        </div>
      </div>

      {/* Right side (form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Only show logo on mobile */}
          <div className="flex justify-center mb-8 md:hidden">
            <ShipTornadoLogo size={48} />
          </div>
          
          <h2 className="text-2xl font-bold mb-6 md:hidden">Welcome Back</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                />
                <button 
                  type="button" 
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-tms-navy hover:bg-opacity-90" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
            
            <div className="flex flex-col space-y-2 items-center text-sm text-center">
              <div className="flex space-x-1">
                <span className="text-muted-foreground">New user?</span>
                <a href="#" className="text-tms-navy font-medium hover:underline">Apply</a>
              </div>
              <a href="#" className="text-tms-navy font-medium hover:underline">
                Forgot your password?
              </a>
            </div>
          </form>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>Demo accounts:</p>
            <p>Admin: admin@example.com / password</p>
            <p>User: user@example.com / password</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
