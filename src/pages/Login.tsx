
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShipTornadoLogo } from '@/components/logo/ShipTornadoLogo';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      toast.error(errorMessage);
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
        <div className="mb-24 flex items-center gap-4">
          <ShipTornadoLogo size={64} className="text-white" spin={true} />
          <h1 className="text-4xl font-bold text-white">Ship Tornado</h1>
        </div>
        <div className="text-white max-w-md">
          <p className="text-xl opacity-90">Welcome back! Sign in to continue</p>
        </div>
      </div>

      {/* Right side (form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Only show logo on mobile */}
          <div className="flex justify-center mb-8 md:hidden items-center gap-2">
            <ShipTornadoLogo size={48} className="text-tms-navy" />
            <h2 className="text-2xl font-bold">Ship Tornado</h2>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="text-muted-foreground">Enter your credentials to access your account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
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
                  placeholder="Enter your password"
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
              disabled={isLoading || loading}
            >
              {(isLoading || loading) ? "Signing in..." : "Sign in"}
            </Button>
            
            <div className="flex flex-col space-y-2 items-center text-sm text-center">
              <div className="flex space-x-1">
                <span className="text-muted-foreground">New to Ship Tornado?</span>
                <Link to="/signup" className="text-tms-navy font-medium hover:underline">
                  Create an account
                </Link>
              </div>
              <a href="#" className="text-tms-navy font-medium hover:underline">
                Forgot your password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
