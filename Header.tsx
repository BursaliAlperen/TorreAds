import React from 'react';
import { ToncoinIcon } from './ToncoinIcon';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <ToncoinIcon className="w-12 h-12" />
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          Torreads
        </h1>
      </div>
      <p className="mt-4 text-lg text-slate-300">
        Earn Toncoin by watching ads and referring friends.
      </p>
    </header>
  );
};