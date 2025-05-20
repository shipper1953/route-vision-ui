
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TmsLayout } from './layout/TmsLayout';

const DashboardLayout: React.FC = () => {
  return (
    <TmsLayout>
      <Outlet />
    </TmsLayout>
  );
};

export default DashboardLayout;
