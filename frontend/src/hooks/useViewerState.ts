import { useState, useCallback, useRef } from 'react';
import type { LogEntry, Position, ActionType } from '../types';

const MAX_SCALE = 20; // Allows deep zoom into details (2000%)
const ZOOM_LOG_DEBOUNCE_MS = 300;

export function useViewerState() {
  const [scale, setScaleState] = useState(1);
  const [position, setPositionState] = useState<Position>({ x: 0, y: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Use refs to track previous values for logging
  const prevScaleRef = useRef(scale);
  
  // Store base scale for calculating dynamic min scale
  const baseScaleRef = useRef(1);
  
  // Refs for debounced zoom logging
  const zoomStartScaleRef = useRef<number | null>(null);
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((action: ActionType, details: LogEntry['details']) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      details,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  const setScale = useCallback((newScale: number, cursorX: number, cursorY: number) => {
    // Min scale: 25% of original size
    const minScale = 0.25;
    const clampedScale = Math.min(MAX_SCALE, Math.max(minScale, newScale));
    const prevScale = prevScaleRef.current;
    
    if (clampedScale === prevScale) return;
    
    // Track start of zoom session
    if (zoomStartScaleRef.current === null) {
      zoomStartScaleRef.current = prevScale;
    }
    
    // Calculate new position to keep cursor point stationary
    const scaleRatio = clampedScale / prevScale;
    
    setPositionState((prevPosition) => {
      const newX = cursorX - (cursorX - prevPosition.x) * scaleRatio;
      const newY = cursorY - (cursorY - prevPosition.y) * scaleRatio;
      return { x: newX, y: newY };
    });

    // Update scale immediately (keeps zoom smooth)
    setScaleState(clampedScale);
    prevScaleRef.current = clampedScale;

    // Clear existing debounce timer
    if (zoomDebounceRef.current) {
      clearTimeout(zoomDebounceRef.current);
    }
    
    // Set new debounce timer for logging
    const startScale = zoomStartScaleRef.current;
    zoomDebounceRef.current = setTimeout(() => {
      const action: ActionType = clampedScale > startScale ? 'zoom_in' : 'zoom_out';
      addLog(action, {
        previousScale: startScale,
        scale: clampedScale,
      });
      zoomStartScaleRef.current = null;
    }, ZOOM_LOG_DEBOUNCE_MS);
  }, [addLog]);

  const setPosition = useCallback((newPosition: Position) => {
    setPositionState(newPosition);
  }, []);

  const logPan = useCallback((deltaX: number, deltaY: number) => {
    addLog('pan', { deltaX, deltaY });
  }, [addLog]);

  const resetView = useCallback((containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number) => {
    // Clear any pending zoom log
    if (zoomDebounceRef.current) {
      clearTimeout(zoomDebounceRef.current);
      zoomDebounceRef.current = null;
    }
    zoomStartScaleRef.current = null;
    
    // Start at 100% scale (natural image size)
    const initialScale = 1;
    baseScaleRef.current = initialScale;
    
    // Center the image in the container at 100% scale
    const centerX = (containerWidth - imageWidth) / 2;
    const centerY = (containerHeight - imageHeight) / 2;
    
    setScaleState(initialScale);
    prevScaleRef.current = initialScale;
    setPositionState({ x: centerX, y: centerY });
    addLog('reset', { scale: initialScale });
  }, [addLog]);

  // Fixed min scale at 25%
  const minScale = 0.25;

  return {
    scale,
    position,
    logs,
    setScale,
    setPosition,
    logPan,
    resetView,
    minScale,
    maxScale: MAX_SCALE,
  };
}
