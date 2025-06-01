
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShipTornadoLogo } from '@/components/logo/ShipTornadoLogo';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { createDefaultAdminUser } from '@/utils/setupDefaultUser';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [defaultCredentials, setDefaultCredentials] = useState<{email: string, password: string} | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [needsManualSetup, setNeedsManualSetup] = useState(false);
  const { login, error, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Check user status without attempting automatic creation
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const result = await createDefaultAdminUser();
        setDefaultCredentials({ email: result.email, password: result.password });
        setConnectionError(false);
        
        if (!result.exists) {
          setNeedsManualSetup(true);
          console.log("Manual user setup required");
        }
      } catch (error) {
        console.error("Failed to check user status:", error);
        setNeedsManualSetup(true);
        setDefaultCredentials({ 
          email: "admin@test.com", 
          password: "ShipTornado123!" 
        });
      }
    };

    checkUserStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
        setConnectionError(true);
        toast.error('Connection error. Please check your internet connection and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const useDefaultCredentials = () => {
    if (defaultCredentials) {
      setEmail(defaultCredentials.email);
      setPassword(defaultCredentials.password);
    }
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
          <p className="text-xl opacity-90">To continue, enter your sign in information</p>
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
          
          {/* Connection error warning */}
          {connectionError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-medium text-yellow-900 mb-2">Connection Issue Detected</h3>
              <p className="text-sm text-yellow-700">
                Unable to connect to authentication service. Please check your internet connection.
              </p>
            </div>
          )}
          
          {/* Manual setup required */}
          {needsManualSetup && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">User Setup Required</h3>
              <p className="text-sm text-blue-700 mb-3">
                To get started, you'll need to create your first user account. You can:
              </p>
              <ul className="text-sm text-blue-700 mb-3 list-disc list-inside space-y-1">
                <li>Use the "Create User" page after logging in with any existing account</li>
                <li>Create an account directly in your Supabase dashboard</li>
                <li>Contact your system administrator</li>
              </ul>
              {defaultCredentials && (
                <div className="mt-3">
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Suggested test credentials:</strong>
                  </p>
                  <p className="text-sm text-blue-700">
                    Email: <code className="bg-blue-100 px-1 rounded">{defaultCredentials.email}</code><br/>
                    Password: <code className="bg-blue-100 px-1 rounded">{defaultCredentials.password}</code>
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={useDefaultCredentials}
                    className="w-full mt-2"
                  >
                    Use Suggested Credentials
                  </Button>
                </div>
              )}
            </div>
          )}
          
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
                <span className="text-muted-foreground">New user?</span>
                <a href="#" className="text-tms-navy font-medium hover:underline">Apply</a>
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
