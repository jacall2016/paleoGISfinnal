import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Configure MapLibre's worker explicitly so Vite can bundle it correctly.
setWorkerUrl(workerUrl);

// Keep the resolved URL available when diagnosing local worker-loading issues.
if (import.meta.env.DEV) {
  console.debug('[MapLibre worker URL]', workerUrl);
}