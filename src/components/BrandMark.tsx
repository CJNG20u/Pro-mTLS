import React from 'react';

/**
 * Pro mTLS Manager mark: a hexagonal seal holding two interlocking rings,
 * one for each side of a mutual-TLS handshake.
 */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25L16 2.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12.6" cy="16" r="5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="19.4" cy="16" r="5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="16" r="1.3" fill="currentColor" />
  </svg>
);
