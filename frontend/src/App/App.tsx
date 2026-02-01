import { useViewerState } from '../hooks/useViewerState';
import { PlanViewer } from '../components/PlanViewer';
import { ActionLog } from '../components/ActionLog';
import './App.css';

function App() {
  const {
    scale,
    position,
    logs,
    setScale,
    setPosition,
    logPan,
    resetView,
  } = useViewerState();

  return (
    <div className="app">
      <header className="app-header">
        <h1>2D Plan Viewer</h1>
        <p className="instructions">
          Scroll to zoom (cursor-centered) • Click and drag to pan • Double-click to reset
        </p>
      </header>
      <main className="app-main">
        <PlanViewer
          scale={scale}
          position={position}
          setScale={setScale}
          setPosition={setPosition}
          logPan={logPan}
          resetView={resetView}
        />
        <ActionLog logs={logs} />
      </main>
    </div>
  );
}

export default App;
