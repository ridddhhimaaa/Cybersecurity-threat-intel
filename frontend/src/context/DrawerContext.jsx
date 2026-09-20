import React, { createContext, useContext, useState } from 'react';

const DrawerContext = createContext({
  selectedCVE: null,
  isDrawerOpen: false,
  openDrawer: (cve) => {},
  closeDrawer: () => {},
});

export function DrawerProvider({ children }) {
  const [selectedCVE, setSelectedCVE] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (cve) => {
    setSelectedCVE(cve);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <DrawerContext.Provider
      value={{
        selectedCVE,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}
