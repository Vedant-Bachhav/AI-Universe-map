import React, { useState, useEffect } from 'react';
import { ResearchUniverse } from './components/ResearchUniverse';
import { getUniverseData } from './services/mockData';
import type { Server, Category } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<{ servers: Server[]; categories: Category[] } | null>(null);

  useEffect(() => {
    setData(getUniverseData());
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {data && data.servers.length > 0 ? (
        <ResearchUniverse data={data} />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-white">
          Loading Universe...
        </div>
      )}
    </div>
  );
};

export default App;
