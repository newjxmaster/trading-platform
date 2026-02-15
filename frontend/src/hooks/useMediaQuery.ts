import { useState, useEffect } from 'react';

// ============================================
// useMediaQuery Hook
// ============================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// ============================================
// Predefined Breakpoint Hooks
// ============================================

export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 639px)');
};

export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
};

export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1024px)');
};

export const useIsLargeDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1280px)');
};

export default useMediaQuery;
