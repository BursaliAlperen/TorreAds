import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full max-w-2xl mx-auto py-4 text-center text-slate-500">
      <p>&copy; {new Date().getFullYear()} Torreads. All Rights Reserved.</p>
    </footer>
  );
};