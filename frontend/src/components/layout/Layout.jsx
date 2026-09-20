import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CVEDetailDrawer } from '../cve/CVEDetailDrawer';
import { CommandKSearch } from '../common/CommandKSearch';
import { useDrawer } from '../../context/DrawerContext';
import api from '../../services/api';

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const { selectedCVE, isDrawerOpen, closeDrawer, openDrawer } = useDrawer();

  // Check health periodically
  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setApiHealthy(res.status === 'healthy');
    } catch {
      setApiHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkHealth();
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="flex min-h-screen bg-[#090D14]">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        apiHealthy={apiHealthy}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenSearch={() => setSearchOpen(true)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          apiHealthy={apiHealthy}
          setMobileOpen={setMobileOpen}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {/* RefreshKey triggers page re-mount or refetch */}
          <Outlet context={{ refreshKey, onOpenCVE: openDrawer }} />
        </main>
      </div>

      {/* Global CVE Sliding Drawer */}
      <CVEDetailDrawer
        cve={selectedCVE}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />

      {/* Global Command+K Search Modal */}
      <CommandKSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectCVE={(cve, signalOpen) => {
          if (signalOpen) {
            setSearchOpen(true);
          } else if (cve) {
            openDrawer(cve);
          }
        }}
      />
    </div>
  );
}
