import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../types';
import './ActionLog.css';

interface ActionLogProps {
  logs: LogEntry[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatActionType(action: LogEntry['action']): string {
  switch (action) {
    case 'zoom_in':
      return 'Zoom In';
    case 'zoom_out':
      return 'Zoom Out';
    case 'pan':
      return 'Pan';
    case 'reset':
      return 'Reset';
    default:
      return action;
  }
}

function formatDetails(entry: LogEntry): string {
  const { action, details } = entry;
  
  switch (action) {
    case 'zoom_in':
    case 'zoom_out':
      if (details.scale !== undefined && details.previousScale !== undefined) {
        return `${Math.round(details.previousScale * 100)}% → ${Math.round(details.scale * 100)}%`;
      }
      return '';
    case 'pan':
      if (details.deltaX !== undefined && details.deltaY !== undefined) {
        return `Δx: ${Math.round(details.deltaX)}px, Δy: ${Math.round(details.deltaY)}px`;
      }
      return '';
    case 'reset':
      return 'View centered at 100%';
    default:
      return '';
  }
}

function getActionIcon(action: LogEntry['action']): string {
  switch (action) {
    case 'zoom_in':
      return '🔍+';
    case 'zoom_out':
      return '🔍-';
    case 'pan':
      return '✋';
    case 'reset':
      return '🎯';
    default:
      return '•';
  }
}

export function ActionLog({ logs }: ActionLogProps) {
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = tableBodyRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="action-log">
      <h2 className="action-log-title">Action Log</h2>
      <div className="action-log-container">
        <table className="action-log-table">
          <thead>
            <tr>
              <th className="col-time">Time</th>
              <th className="col-action">Action</th>
              <th className="col-details">Details</th>
            </tr>
          </thead>
        </table>
        <div className="action-log-body-wrapper">
          <table className="action-log-table">
            <tbody ref={tableBodyRef}>
              {logs.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={3}>
                    <div className="empty-message">
                      No actions yet. Try zooming, panning, or double-clicking to reset.
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className={`log-entry action-${entry.action}`}>
                    <td className="col-time">{formatTime(entry.timestamp)}</td>
                    <td className="col-action">
                      <span className="action-icon">{getActionIcon(entry.action)}</span>
                      {formatActionType(entry.action)}
                    </td>
                    <td className="col-details">{formatDetails(entry)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="action-log-footer">
        {logs.length} action{logs.length !== 1 ? 's' : ''} logged
      </div>
    </div>
  );
}
