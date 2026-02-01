import { useRef, useState, useCallback, useEffect } from 'react';
import type { Position } from '../../types';
import './PlanViewer.css';

interface PlanViewerProps {
  scale: number;
  position: Position;
  setScale: (newScale: number, cursorX: number, cursorY: number) => void;
  setPosition: (position: Position) => void;
  logPan: (deltaX: number, deltaY: number) => void;
  resetView: (containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number) => void;
}

const ZOOM_SENSITIVITY = 0.002;

export function PlanViewer({
  scale,
  position,
  setScale,
  setPosition,
  logPan,
  resetView,
}: PlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const initializedRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [panStartPosition, setPanStartPosition] = useState<Position>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Store scale in ref for native event handler
  const scaleRef = useRef(scale);
  
  // Sync scale ref with prop (must be in effect, not during render)
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Handle mouse wheel zoom - use native listener to prevent page zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Calculate new scale based on wheel delta
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newScale = scaleRef.current * (1 + delta);

      setScale(newScale, cursorX, cursorY);
    };

    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setScale]);

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartPosition({ x: position.x, y: position.y });
    },
    [position]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      setPosition({
        x: panStartPosition.x + deltaX,
        y: panStartPosition.y + deltaY,
      });
    },
    [isPanning, panStart, panStartPosition, setPosition]
  );

  // Handle pan end
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      // Only log if there was actual movement
      if (deltaX !== 0 || deltaY !== 0) {
        logPan(deltaX, deltaY);
      }

      setIsPanning(false);
    },
    [isPanning, panStart, logPan]
  );

  // Handle mouse leave (stop panning if mouse leaves container)
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;

        if (deltaX !== 0 || deltaY !== 0) {
          logPan(deltaX, deltaY);
        }

        setIsPanning(false);
      }
    },
    [isPanning, panStart, logPan]
  );

  // Handle double click to reset
  const handleDoubleClick = useCallback(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    
    if (!container || !image) return;

    resetView(
      container.clientWidth,
      container.clientHeight,
      image.naturalWidth,
      image.naturalHeight
    );
  }, [resetView]);

  // Handle image load to center initially
  const handleImageLoad = useCallback(() => {
    // Prevent duplicate initialization in StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    setImageLoaded(true);
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    if (!container || !image) return;

    // Center the image initially
    resetView(
      container.clientWidth,
      container.clientHeight,
      image.naturalWidth,
      image.naturalHeight
    );
  }, [resetView]);

  // Prevent default drag behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: Event) => e.preventDefault();
    container.addEventListener('dragstart', preventDefault);
    
    return () => {
      container.removeEventListener('dragstart', preventDefault);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`plan-viewer ${isPanning ? 'panning' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      <img
        ref={imageRef}
        src="/foundation-plan.png"
        alt="Foundation Plan"
        className="plan-image"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          opacity: imageLoaded ? 1 : 0,
        }}
        onLoad={handleImageLoad}
        draggable={false}
      />
      <div className="zoom-indicator">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
