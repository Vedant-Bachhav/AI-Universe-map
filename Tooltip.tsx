
import React from 'react';
import type { Server, CategoryTooltipData } from '../types';

interface TooltipProps {
  data: Server | CategoryTooltipData | null;
  position: { x: number; y: number };
  onServerClick?: (serverId: string) => void;
}

// Type guard to check if the data is for a Server
function isServer(data: Server | CategoryTooltipData): data is Server {
  return (data as Server).description !== undefined;
}

export const Tooltip: React.FC<TooltipProps> = ({ data, position, onServerClick }) => {
  if (!data) {
    return null;
  }

  const renderServerTooltip = (serverData: Server) => {
    const { name, description, rating, category, activityLevel, features, isActive, isExpert } = serverData;
    return (
      <>
        <h3 className="text-lg font-bold text-cyan-300">{name}</h3>
        <p className="text-sm text-gray-300 font-semibold">{category}</p>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>
        
        <div className="mt-3 text-xs text-gray-200 border-t border-gray-700 pt-2">
          <div className="flex justify-between"><span>Rating:</span> <span>{rating}/10</span></div>
          <div className="flex justify-between"><span>Activity:</span> <span>{activityLevel}</span></div>
        </div>

        {features && features.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs font-bold text-gray-300 mb-1">Features:</p>
            <div className="flex flex-wrap gap-1">
              {features.map((feature, index) => (
                <span key={index} className="px-2 py-0.5 text-xs rounded-full bg-sky-800/50 text-sky-300">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex mt-3 space-x-2">
          <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-green-500/30 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${isExpert ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}`}>
            {isExpert ? 'Expert Community' : 'General Audience'}
          </span>
        </div>
      </>
    );
  };

  const renderCategoryTooltip = (categoryData: CategoryTooltipData) => {
    const { name, servers } = categoryData;
    return (
      <>
        <h3 className="text-lg font-bold text-cyan-300">{name}</h3>
        <p className="text-sm text-gray-300 font-semibold">Galaxy Cluster</p>
        
        <div className="mt-3 border-t border-gray-700 pt-2">
          <p className="text-xs font-bold text-gray-300 mb-2">Servers (by rating):</p>
          <ul className="space-y-1 max-h-40 overflow-y-auto pr-2 text-xs">
            {servers.map((server, index) => (
              <li
                key={index}
                className="flex justify-between items-center text-gray-400 hover:text-gray-200 cursor-pointer"
                onClick={() => onServerClick?.(server.id)}
              >
                <span className="truncate mr-2">{server.name}</span>
                <span className="font-mono text-cyan-400 flex-shrink-0">{server.rating.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 p-4 transition-opacity duration-200 transform -translate-x-1/2 -translate-y-full bg-gray-900 rounded-lg shadow-2xl bg-opacity-80 backdrop-blur-sm top-[-9999px] left-[-9999px]"
      style={{
        top: position.y - 15,
        left: position.x,
        maxWidth: '280px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {isServer(data) ? renderServerTooltip(data) : renderCategoryTooltip(data)}
    </div>
  );
};