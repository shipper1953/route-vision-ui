
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShipTornadoLogo } from '@/components/logo/ShipTornadoLogo';
import { toast } from 'sonner';
import { Eye, EyeOff, Info, ArrowRight } from 'lucide-react';

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
          <h2 className="text-2xl font-semibold mb-3">Welcome to Ship Tornado Demo</h2>
          <p className="text-lg opacity-90">Sign in to your account or create a free demo account to explore our full shipping management platform with no limitations.</p>
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

          {/* Demo Environment Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">🎯 Demo Environment</h3>
                <p className="text-sm text-blue-800">
                  Create a free account to explore all Ship Tornado features with full access. No credit card required.
                </p>
              </div>
            </div>
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
            
            {/* Prominent Signup CTA */}
            <div className="mt-6 p-6 border-2 border-blue-200 rounded-lg bg-gradient-to-br from-blue-50 to-white text-center">
              <p className="text-sm text-muted-foreground mb-3">Don't have an account?</p>
              <Link to="/signup">
                <Button 
                  type="button"
                  variant="outline" 
                  size="lg"
                  className="w-full border-2 border-tms-navy text-tms-navy hover:bg-tms-navy hover:text-white font-semibold group"
                >
                  Create Free Demo Account
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">✓ Instant access • ✓ All features unlocked • ✓ No credit card needed</p>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <a href="#" className="text-sm text-tms-navy font-medium hover:underline">
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
