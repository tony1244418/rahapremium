'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AdultSiteContextValue {
  isAdultSite: boolean;
}

const AdultSiteContext = createContext<AdultSiteContextValue>({ isAdultSite: false });

const ADULT_DOMAIN = process.env.NEXT_PUBLIC_ADULT_DOMAIN || 'adult.rahapremium.site';

function detectAdultSite(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const adult = ADULT_DOMAIN.split(':')[0].toLowerCase();
  return host === adult || host === `www.${adult}`;
}

export function AdultSiteProvider({ children }: { children: React.ReactNode }) {
  const [isAdultSite, setIsAdultSite] = useState(false);

  useEffect(() => {
    setIsAdultSite(detectAdultSite());
  }, []);

  return (
    <AdultSiteContext.Provider value={{ isAdultSite }}>
      {children}
    </AdultSiteContext.Provider>
  );
}

export function useAdultSite(): AdultSiteContextValue {
  return useContext(AdultSiteContext);
}
