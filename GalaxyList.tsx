import React from 'react';

interface GalaxyInfo {
  id: string;
  name: string;
  serverCount: number;
}

interface GalaxyListProps {
  galaxies: GalaxyInfo[];
  onGalaxyClick: (galaxyId: string) => void;
}

export const GalaxyList: React.FC<GalaxyListProps> = ({ galaxies, onGalaxyClick }) => {
  if (!galaxies || galaxies.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-20 p-3 bg-gray-900 rounded-lg shadow-2xl bg-opacity-80 backdrop-blur-sm max-w-64"
      style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
      // Prevent clicks inside the list from closing tooltips etc.
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-base font-bold text-cyan-300 mb-2 border-b border-gray-700 pb-1">
        AI Universe Map
      </h3>
      <ul className="space-y-1 pr-1 text-xs overflow-y-auto max-h-48">
        {galaxies.map((galaxy) => (
          <li
            key={galaxy.id}
            className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer transition-colors duration-150 p-1 rounded"
            onClick={() => onGalaxyClick(galaxy.id)}
            title={`Click to focus on ${galaxy.name}`}
          >
            <span className="truncate mr-2">{galaxy.name}</span>
            <span className="font-mono text-cyan-400 flex-shrink-0 bg-sky-900/50 px-2 py-0.5 rounded-md text-xs">
              {galaxy.serverCount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
