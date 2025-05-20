
import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="flex flex-col items-center space-y-2 text-center">
            <h1 className="text-2xl font-bold text-tms-blue">Ship Tornado</h1>
            <p className="text-muted-foreground">Transportation Management System</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
