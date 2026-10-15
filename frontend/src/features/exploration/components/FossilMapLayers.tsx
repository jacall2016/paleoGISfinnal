
import { Layer, Source } from 'react-map-gl/maplibre';

import type { FossilFeatureCollection } from '../utils/occurrenceGeoJson';

interface FossilMapLayersProps {
  data: FossilFeatureCollection;
  clusterRadius?: number;
  clusterMaxZoom?: number;
}

export default function FossilMapLayers({
  data,
  clusterRadius = 48,
  clusterMaxZoom = 8,
}: FossilMapLayersProps) {
  return (
    <Source
      id="fossil-occurrences"
      type="geojson"
      data={data}
      cluster
      clusterRadius={clusterRadius}
      clusterMaxZoom={clusterMaxZoom}
      clusterProperties={{
        occurrence_count: ['+', ['get', 'occurrenceCount']],
      }}
    >
      {/* Cluster backgrounds */}
      <Layer
        id="fossil-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': '#d2b47c',
          'circle-radius': 18,
          'circle-opacity': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        }}
      />

      {/* Cluster occurrence counts */}
      <Layer
        id="fossil-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': ['to-string', ['get', 'occurrence_count']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{
          'text-color': '#101719',
        }}
      />

      {/* Colored backgrounds behind individual fossil icons */}
      <Layer
        id="fossil-point-backgrounds"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-radius': 12,
          'circle-color': ['coalesce', ['get', 'color'], '#d2b47c'],
          'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
        }}
      />

      {/* PhyloPic icons on top of the colored backgrounds */}
      <Layer
        id="fossil-points"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        layout={{
          'icon-image': ['get', 'icon'],
          'icon-size': 0.4,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        }}
        paint={{
          'icon-opacity': ['coalesce', ['get', 'opacity'], 1],
        }}
      />
    </Source>
  );
}
