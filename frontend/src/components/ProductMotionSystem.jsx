import { useEffect } from 'react';

import './ProductMotionSystem.css';

const routeToneMap = [
  ['/dashboard', 'overview'],
  ['/accounts', 'wallets'],
  ['/transactions', 'ledger'],
  ['/budget', 'budget'],
  ['/goals', 'goals'],
  ['/recurring', 'renewals'],
  ['/reports', 'insights'],
  ['/activity', 'activity'],
  ['/billing', 'billing'],
  ['/settings', 'settings'],
  ['/pricing', 'pricing'],
  ['/login', 'access'],
  ['/signup', 'access'],
  ['/forgot-password', 'access'],
  ['/reset-password', 'access'],
];

function getRouteTone(routePath, isWorkspace) {
  const matchedTone = routeToneMap.find(([prefix]) => routePath.startsWith(prefix));
  return matchedTone?.[1] ?? (isWorkspace ? 'workspace' : 'public');
}

function ProductMotionSystem({ routePath = '', isWorkspace = false }) {
  const routeTone = getRouteTone(routePath, isWorkspace);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reduceMotion.matches) {
      return undefined;
    }

    let frameId = 0;

    const updatePointerPosition = (event) => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const pointerX = Math.round((event.clientX / window.innerWidth) * 100);
        const pointerY = Math.round((event.clientY / window.innerHeight) * 100);

        document.documentElement.style.setProperty('--rivo-pointer-x', `${pointerX}%`);
        document.documentElement.style.setProperty('--rivo-pointer-y', `${pointerY}%`);
      });
    };

    window.addEventListener('pointermove', updatePointerPosition, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('pointermove', updatePointerPosition);
    };
  }, []);

  return (
    <div
      className={`rivo-motion-system ${isWorkspace ? 'is-workspace' : 'is-public'} tone-${routeTone}`}
      aria-hidden="true"
    >
      <span className="rivo-motion-mesh" />
      <span className="rivo-motion-grid" />
      <span className="rivo-motion-orb rivo-motion-orb-one" />
      <span className="rivo-motion-orb rivo-motion-orb-two" />
      <span className="rivo-motion-orb rivo-motion-orb-three" />
      <span className="rivo-motion-ribbon rivo-motion-ribbon-one" />
      <span className="rivo-motion-ribbon rivo-motion-ribbon-two" />
      <span className="rivo-motion-signal rivo-motion-signal-one" />
      <span className="rivo-motion-signal rivo-motion-signal-two" />
      <span className="rivo-motion-signal rivo-motion-signal-three" />
    </div>
  );
}

export default ProductMotionSystem;
