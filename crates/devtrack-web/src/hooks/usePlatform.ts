import { useEffect } from 'react';

export function usePlatform() {
  useEffect(() => {
    const platform = navigator.userAgent.includes('Mac') ? 'macos'
      : navigator.userAgent.includes('Win') ? 'windows'
      : 'linux';
    document.documentElement.setAttribute('data-platform', platform);
  }, []);
}