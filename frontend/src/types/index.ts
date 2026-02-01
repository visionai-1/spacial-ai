export type ActionType = 'zoom_in' | 'zoom_out' | 'pan' | 'reset';

export interface LogEntry {
  id: string;
  timestamp: Date;
  action: ActionType;
  details: {
    scale?: number;
    previousScale?: number;
    deltaX?: number;
    deltaY?: number;
  };
}

export interface Position {
  x: number;
  y: number;
}

export interface ViewerState {
  scale: number;
  position: Position;
  logs: LogEntry[];
}
