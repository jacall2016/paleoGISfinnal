import type { ExpressionSpecification } from 'maplibre-gl';
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
  
  const multipleOccurrences: ExpressionSpecification = [
    '>',
    ['get', 'occurrenceCount'],
    1,
  ];


  return (
    <Source
      id="fossil-occurrences"
      type="geojson"
      data={data}
      cluster
      clusterRadius={clusterRadius}
      clusterMaxZoom={clusterMaxZoom}
      clusterProperties={{
        occurrence_count: [
          '+',
          ['get', 'occurrenceCount'],
        ],
      }}
    >
      {/* Cluster circles shown while zoomed out */}
      <Layer
        id="fossil-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': '#d2b47c',
          'circle-radius': [
            'step',
            ['get', 'occurrence_count'],
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

      {/* Total occurrences represented by each cluster */}
      <Layer
        id="fossil-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': [
            'to-string',
            ['get', 'occurrence_count'],
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        }}
        paint={{
          'text-color': '#101719',
        }}
      />

      {/* Individual marker background */}
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

      {/* Taxon silhouette or existing fallback icon */}
      <Layer
        id="fossil-point-icons"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        layout={{
          'icon-image': ['get', 'icon'],
          'icon-size': 0.8,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'center',
        }}
        paint={{
          'icon-opacity': ['get', 'opacity'],
        }}
      />

      {/* Small count badge background at the marker's upper-left */}
      <Layer
        id="fossil-occurrence-badge"
        type="circle"
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          multipleOccurrences,
        ]}
        paint={{
          'circle-color': '#c94f36',
          'circle-radius': 8,
          'circle-translate': [-9, -9],
          'circle-stroke-color': '#f2f0e8',
          'circle-stroke-width': 1.25,
          'circle-opacity': ['get', 'opacity'],
        }}
      />

      {/* Count text inside the individual marker badge */}
      <Layer
        id="fossil-occurrence-badge-count"
        type="symbol"
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          multipleOccurrences,
        ]}
        layout={{
          'text-field': [
            'to-string',
            ['get', 'occurrenceCount'],
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-offset': [-1, -1],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-opacity': ['get', 'opacity'],
        }}
      />
    </Source>
  );
}
