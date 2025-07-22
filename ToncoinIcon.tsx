
import React from 'react';

interface IconProps {
  className?: string;
}

export const ToncoinIcon: React.FC<IconProps> = ({ className }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      xmlns="http://www.w3.org/2000/svg" 
      preserveAspectRatio="xMidYMid">
      <defs>
        <linearGradient id="ton-grad" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2298D7"></stop>
          <stop offset="100%" stopColor="#007DBB"></stop>
        </linearGradient>
      </defs>
      <path 
        d="M256 128c0 70.692-57.308 128-128 128C57.308 256 0 198.692 0 128 0 57.308 57.308 0 128 0c70.692 0 128 57.308 128 128Z" 
        fill="url(#ton-grad)">
      </path>
      <path 
        d="m84.73 89.282 24.966 69.462c1.783 4.96 7.97 7.07 12.518 4.67l34.46-18.06c4.547-2.4 6.44-7.97 4.658-12.518l-13.31-36.945c-1.783-4.96-7.97-7.07-12.518-4.67L99.043 103.74c-4.548 2.39-6.44 7.97-4.658 12.518l.345.962M171.27 89.282l-24.966 69.462c-1.783 4.96-7.97 7.07-12.518 4.67L99.326 145.35c-4.547-2.4-6.44-7.97-4.658-12.518l13.31-36.945c1.783-4.96 7.97-7.07 12.518-4.67l36.46 12.52c4.548 1.56 6.44 7.14 4.658 11.688l-.345.962" 
        fill="#fff">
      </path>
    </svg>
  );
};
