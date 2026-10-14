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
    >
      <Layer
        id="fossil-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': '#d2b47c',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            17,
            20,
            21,
            100,
            26,
            500,
            31,
          ],
          'circle-stroke-color': '#f2f0e8',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.96,
        }}
      />

      <Layer
        id="fossil-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        }}
        paint={{
          'text-color': '#101719',
        }}
      />

      <Layer
        id="fossil-points"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': ['get', 'color'],
          'circle-radius': 12,
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-color': '#f2f0e8',
          'circle-stroke-width': 1.5,
        }}
      />

      <Layer
        id="fossil-point-icons"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        layout={{
          'icon-image': ['get', 'icon'],
          'icon-size': 0.65,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        }}
        paint={{
          'icon-opacity': ['get', 'opacity'],
        }}
      />
    </Source>
  );
}