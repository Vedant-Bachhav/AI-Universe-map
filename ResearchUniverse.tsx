
import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Server, Category, CategoryTooltipData } from '../types';
import { Tooltip } from './Tooltip';
import { GalaxyList } from './GalaxyList';

// Access d3 from the global scope, as it's included via CDN in index.html
declare const d3: any;

interface ResearchUniverseProps {
  data: {
    servers: Server[];
    categories: Category[];
  };
}

// Helper to generate a point in a 2D Gaussian distribution for more natural star clustering
const gaussianRandom = (mean = 0, stdev = 1) => {
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
};

// --- START OF GALAXY GENERATION LOGIC ---
const generateStarPosition = (category: any) => {
    const { radiusX, arms, armSeparation, armWidth } = category.galaxyParams;
    const centralStarRadius = Math.sqrt(category.radiusX * category.radiusY) * 0.08;
    const centralStarRadiusSq = centralStarRadius * centralStarRadius;

    let x, y, finalDistSq;

    // Keep generating positions until one is found outside the central star's radius
    do {
        // Generate a random distance from the galaxy's center
        const distanceFromCenter = Math.random() * radiusX;

        // Choose a random arm for spiral placement
        const armIndex = Math.floor(Math.random() * arms);
        const armAngleOffset = (armIndex * 2 * Math.PI) / arms;
        
        // Angle determines position on the spiral arm
        const angle = (distanceFromCenter / radiusX) * armSeparation + armAngleOffset;
        
        // Add randomness (fuzziness) to the star's position
        const fuzzinessX = gaussianRandom(0, armWidth * (distanceFromCenter / radiusX));
        const fuzzinessY = gaussianRandom(0, armWidth * (distanceFromCenter / radiusX));
        
        // Convert polar coordinates to Cartesian
        const baseX = Math.cos(angle) * distanceFromCenter;
        const baseY = Math.sin(angle) * distanceFromCenter;
        
        // Apply elliptical scaling to the Y coordinate
        const yWithEllipseRatio = baseY * (category.radiusY / category.radiusX);

        // Final coordinates with fuzziness
        x = baseX + fuzzinessX;
        y = yWithEllipseRatio + fuzzinessY;
        
        // Check if the final point is in the central star
        finalDistSq = x * x + y * y;

    } while (finalDistSq < centralStarRadiusSq);

    return { x, y };
};
// --- END OF GALAXY GENERATION LOGIC ---

export const ResearchUniverse: React.FC<ResearchUniverseProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // FIX: Initialize useRef with null. Calling useRef() with no arguments can lead to unexpected behavior.
  const zoomRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<{ data: Server | CategoryTooltipData | null; pos: { x: number; y: number } }>({ data: null, pos: { x: 0, y: 0 } });
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const galaxyData = useMemo(() => {
    if (!data) return null;

    const categoriesWithLayout = data.categories.map(category => {
      const memberCount = category.memberCount;
      const baseRadius = Math.sqrt(memberCount) * 0.7;
      return {
        ...category,
        type: 'category' as const,
        data: category,
        initialRotation: Math.random() * 360,
        radiusX: baseRadius * (Math.random() * 0.4 + 1.1), // more elliptical
        radiusY: baseRadius * (Math.random() * 0.4 + 0.8),
        // Parameters for spiral arm generation
        galaxyParams: {
            arms: Math.floor(Math.random() * 3) + 2, // 2-4 arms
            armSeparation: Math.random() * 4 + 4, // How tightly wound
            armWidth: baseRadius * 0.15,
            radiusX: baseRadius,
        },
      };
    });

    const serversWithLayout = data.servers.map(server => {
      const category = categoriesWithLayout.find(c => c.name === server.category)!;
      const { x, y } = generateStarPosition(category);
      
      return {
        ...server,
        type: 'server' as const,
        data: server,
        relX: x,
        relY: y,
      };
    });
    
    return { categories: categoriesWithLayout, servers: serversWithLayout };
  }, [data]);

  const sortedGalaxies = useMemo(() => {
    if (!galaxyData) return [];
    return galaxyData.categories
      .map(category => ({
        id: category.id,
        name: category.name,
        serverCount: galaxyData.servers.filter(s => s.category === category.name).length
      }))
      .sort((a, b) => b.serverCount - a.serverCount);
  }, [galaxyData]);

  const focusOnServer = (serverId: string) => {
    if (!galaxyData || !svgRef.current || !zoomRef.current) return;

    const server = galaxyData.servers.find(s => s.id === serverId);
    if (!server) return;
    
    const category = galaxyData.categories.find(c => c.name === server.category) as any;
    if (!category || category.x === undefined || category.y === undefined) return;

    // Calculate server's absolute position considering galaxy center and rotation
    const angleRad = category.initialRotation * (Math.PI / 180);
    const rotatedX = server.relX * Math.cos(angleRad) - server.relY * Math.sin(angleRad);
    const rotatedY = server.relX * Math.sin(angleRad) + server.relY * Math.cos(angleRad);
    const absoluteX = category.x + rotatedX;
    const absoluteY = category.y + rotatedY;

    const { width, height } = svgRef.current.getBoundingClientRect();
    const scale = 2.5; // Desired zoom level

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-absoluteX, -absoluteY);

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, transform);

    // Close the tooltip after initiating the zoom
    setTooltip({ data: null, pos: { x: 0, y: 0 } });
    setActiveTooltipId(null);
  };

  const focusOnGalaxy = (categoryId: string) => {
    if (!galaxyData || !svgRef.current || !zoomRef.current) return;

    const category = galaxyData.categories.find(c => c.id === categoryId) as any;
    if (!category || category.x === undefined || category.y === undefined) return;
    
    const { width, height } = svgRef.current.getBoundingClientRect();
    const radius = Math.max(category.radiusX, category.radiusY);
    // Calculate scale to fit the galaxy with some padding (2.5x radius)
    const scale = Math.min(width, height) / (radius * 2.5);

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-category.x, -category.y);

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, transform);
  };


  useEffect(() => {
    if (!galaxyData || !svgRef.current || !containerRef.current) return;

    const { categories, servers } = galaxyData;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    // Handle clicks on the background to close tooltips
    svg.on('click', () => {
      setTooltip({ data: null, pos: { x: 0, y: 0 } });
      setActiveTooltipId(null);
    });

    const defs = svg.append('defs');
    // More intense core gradient
    const coreGradient = defs.append('radialGradient').attr('id', 'galaxy-core-gradient');
    coreGradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFFFFF').attr('stop-opacity', '1');
    coreGradient.append('stop').attr('offset', '20%').attr('stop-color', '#FFFDE4').attr('stop-opacity', '0.9');
    coreGradient.append('stop').attr('offset', '100%').attr('stop-color', '#FDE047').attr('stop-opacity', '0.1');

    const simulation = d3.forceSimulation(categories)
        .force('charge', d3.forceManyBody().strength(-2000))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius((d: any) => Math.max(d.radiusX, d.radiusY) * 1.1))
        .stop();

    // Manually run the simulation ticks to compute the static layout
    for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
        simulation.tick();
    }

    // --- Dynamic Filters for Galaxy Cores ---
    categories.forEach((category: any) => {
        const centralStarRadius = Math.sqrt(category.radiusX * category.radiusY) * 0.08;
        const stdDeviation = Math.max(4, centralStarRadius * 0.6); // Proportional blur
        const coreGlow = defs.append('filter')
            .attr('id', `galaxy-core-glow-${category.id}`)
            .attr('x', '-150%').attr('y', '-150%')
            .attr('width', '400%').attr('height', '400%'); // Generous filter area

        coreGlow.append('feGaussianBlur').attr('stdDeviation', stdDeviation).attr('result', 'blur1');
        coreGlow.append('feGaussianBlur').attr('stdDeviation', stdDeviation / 3).attr('result', 'blur2');
        const feMerge = coreGlow.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'blur1');
        feMerge.append('feMergeNode').attr('in', 'blur2');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    });
    
    for(let i = 1; i <= 10; i++) {
        const serverGlow = defs.append('filter').attr('id', `server-glow-${i}`);
        serverGlow.append('feGaussianBlur').attr('stdDeviation', i * 0.6 + 1).attr('result', 'coloredBlur');
        const feServerMerge = serverGlow.append('feMerge');
        feServerMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feServerMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // --- Static Background Stars ---
    const bgContainer = svg.insert('g', ':first-child').attr('id', 'background-container');
    const starLayers = [
      { count: 80, size: [0.5, 1.5] },
      { count: 50, size: [1, 2.5] },
    ];
    starLayers.forEach((layer, i) => {
        const group = bgContainer.append('g').attr('id', `bg-layer-${i}`);
        for (let j = 0; j < layer.count; j++) {
            const size = Math.random() * (layer.size[1] - layer.size[0]) + layer.size[0];
            group.append('circle')
                .attr('cx', Math.random() * width * 2 - width) // spread wider to avoid empty areas on resize
                .attr('cy', Math.random() * height * 2 - height)
                .attr('r', size)
                .attr('fill', '#FFF')
                .attr('opacity', Math.random() * 0.5 + 0.1);
        }
    });

    const mainContainer = svg.append('g');
    
    const galaxyGroups = mainContainer.append('g')
      .selectAll('g.galaxy-group')
      .data(categories, (d: any) => d.id)
      .join('g')
      .attr('class', 'galaxy-group')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    
    galaxyGroups.each(function(category: any) {
        const group = d3.select(this);
        const galaxyServers = servers.filter(s => s.category === category.name);
        
        const galaxyDisc = group.append('g')
            .attr('class', 'galaxy-disc')
            .attr('transform', `rotate(${category.initialRotation})`);

        // Dynamically adjust blur to make smaller galaxies more concentrated and visible.
        const blurAmount = Math.max(15, Math.min(25, category.radiusX * 0.6));

        galaxyDisc.append('ellipse')
            .attr('rx', category.radiusX)
            .attr('ry', category.radiusY)
            .style('fill', '#f0f8ff') // Shift to a slightly whiter tone for more brightness
            .style('opacity', 0.18) // Increased opacity for better visibility from a distance
            .style('filter', `blur(${blurAmount}px)`);

        galaxyDisc.append('g')
          .selectAll('circle.server-node')
          .data(galaxyServers)
          .join('circle')
          .attr('class', 'server-node')
          .attr('cx', d => d.relX)
          .attr('cy', d => d.relY)
          .attr('r', d => Math.max(0.4, Math.log(d.memberCount) / 5))
          .attr('fill', d => d.isActive ? (d.isExpert ? '#e879f9' : '#5eead4') : '#9ca3af')
          .attr('opacity', d => Math.random() * 0.4 + 0.6)
          .style('cursor', 'pointer')
          .attr('filter', d => `url(#server-glow-${Math.round(d.rating)})`)
          .on('click', (event: MouseEvent, d: any) => {
              event.stopPropagation();
              const currentId = d.id;
              if (activeTooltipId === currentId) {
                  // Clicked the same one again, hide it
                  setTooltip({ data: null, pos: { x: 0, y: 0 } });
                  setActiveTooltipId(null);
              } else {
                  // Clicked a new one, show it
                  const [svgX, svgY] = d3.pointer(event, document.body);
                  setTooltip({ data: d.data, pos: { x: svgX, y: svgY } });
                  setActiveTooltipId(currentId);
              }
          });
        
        const centralStarRadius = Math.sqrt(category.radiusX * category.radiusY) * 0.08;

        // Visible core star
        group.append('circle')
          .attr('r', centralStarRadius)
          .style('fill', 'url(#galaxy-core-gradient)')
          .style('filter', `url(#galaxy-core-glow-${category.id})`) // Use dynamic filter
          .style('pointer-events', 'none');
        
        // Invisible click target for the core
        group.append('circle')
          .attr('r', centralStarRadius * 1.2) // Slightly larger for easier clicking
          .style('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent, d: any) => {
            event.stopPropagation();
            const currentId = d.id;
            if (activeTooltipId === currentId) {
                setTooltip({ data: null, pos: { x: 0, y: 0 } });
                setActiveTooltipId(null);
            } else {
                const serversInCategory = servers
                  .filter(s => s.category === d.name)
                  .sort((a, b) => b.rating - a.rating)
                  .map(s => ({ id: s.id, name: s.name, rating: s.rating }));
                
                const categoryTooltipData: CategoryTooltipData = {
                  name: d.name,
                  servers: serversInCategory,
                };

                const [svgX, svgY] = d3.pointer(event, document.body);
                setTooltip({ data: categoryTooltipData, pos: { x: svgX, y: svgY } });
                setActiveTooltipId(currentId);
            }
          });

        // Dynamic font size calculation to ensure text fits inside the star
        const textLength = category.name.length;
        const diameter = centralStarRadius * 2;
        // Heuristic: target width is 90% of diameter. Avg char width is ~0.55 * font-size.
        let fontSize = (diameter * 0.9) / (textLength * 0.55);
        // Clamp for readability
        fontSize = Math.min(16, Math.max(6, fontSize));

        group.append('text')
          .text(category.name)
          .attr('fill', 'black')
          .attr('font-size', `${fontSize}px`)
          .attr('font-weight', 'bold')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .style('pointer-events', 'none');
    });

    // --- ZOOM, PAN, AND VIEW LOGIC ---

    // Calculate the bounding box of the entire universe to frame it correctly.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    categories.forEach((d: any) => {
        const radius = Math.max(d.radiusX, d.radiusY);
        minX = Math.min(minX, d.x - radius);
        minY = Math.min(minY, d.y - radius);
        maxX = Math.max(maxX, d.x + radius);
        maxY = Math.max(maxY, d.y + radius);
    });
    
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    zoomRef.current = zoom; // Store the zoom behavior in the ref

    // Set pan boundaries to prevent scrolling into infinite empty space.
    if (isFinite(boundsWidth) && isFinite(boundsHeight)) {
        const panPaddingX = boundsWidth * 0.5;
        const panPaddingY = boundsHeight * 0.5;
        zoom.translateExtent([
            [minX - panPaddingX, minY - panPaddingY],
            [maxX + panPaddingX, maxY + panPaddingY]
        ]);
    }
    
    zoom.on('zoom', (event: any) => {
      mainContainer.attr('transform', event.transform);
    });
    
    svg.call(zoom as any);

    // Calculate and apply the initial transform to fit the universe within the viewport.
    const padding = 1.2; // 20% padding around the content
    const scale = isFinite(boundsWidth) && boundsWidth > 0 ? Math.min(
        width / (boundsWidth * padding),
        height / (boundsHeight * padding),
        2 // Max initial zoom to prevent extreme zoom-in for small datasets
    ) : 1;

    const translateX = width / 2 - (minX + boundsWidth / 2) * scale;
    const translateY = height / 2 - (minY + boundsHeight / 2) * scale;
    
    const initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    svg.call(zoom.transform, initialTransform);

    // A simple, non-disruptive resize handler.
    const handleResize = () => {
        const { width, height } = containerRef.current!.getBoundingClientRect();
        svg.attr('width', width).attr('height',height);
        // Update the zoom behavior's knowledge of the viewport size.
        zoom.extent([[0, 0], [width, height]]);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        simulation.stop();
        window.removeEventListener('resize', handleResize);
    };
  }, [galaxyData]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <Tooltip data={tooltip.data} position={tooltip.pos} onServerClick={focusOnServer} />
      <GalaxyList galaxies={sortedGalaxies} onGalaxyClick={focusOnGalaxy} />
    </div>
  );
};
