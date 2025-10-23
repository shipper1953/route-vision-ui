import { ShipTornadoLogo } from "@/components/logo/ShipTornadoLogo";
import { Link } from "react-router-dom";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShipTornadoLogo className="h-8 w-8" />
            <span className="text-xl font-bold">Ship Tornado</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Ship Tornado. All rights reserved.
            </div>
            <nav className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:support@shiptornado.com" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact Support
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};
