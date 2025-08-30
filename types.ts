
export interface Server {
  id: string;
  name: string;
  description: string;
  rating: number;
  memberCount: number; // Derived for visualization size
  category: string;
  isExpert: boolean; // Derived from rating
  isActive: boolean; // Derived from activity level
  activityLevel: string;
  features: string[];
}

export interface Category {
  id: string;
  name: string;
  memberCount: number; // Sum of server member counts
}

// Data structure for the galaxy core tooltip
export interface CategoryTooltipData {
  name: string;
  servers: { id: string; name: string; rating: number }[];
}

// Node type for D3 force simulation
export type D3Node = {
  id: string;
  name: string;
  memberCount: number;
  type: 'server' | 'category';
  data: Server | Category;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

// Link type for D3 force simulation
export interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
}