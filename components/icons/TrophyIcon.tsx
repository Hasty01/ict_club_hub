import React from 'react';

export const TrophyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6a9 9 0 019 9H3a9 9 0 019-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 21V9a3 3 0 00-3-3H3M9 21V9a3 3 0 013-3h9" />
    </svg>
);