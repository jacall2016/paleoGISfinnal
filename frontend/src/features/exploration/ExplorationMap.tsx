import {  useCallback, useMemo,  useRef, useState, } from 'react';
import { useTaxonMapIcons } from './hooks/useTaxonMapIcons';
import type { FormEvent } from 'react';
import MapView, { NavigationControl, ScaleControl, } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef, } from 'react-map-gl/maplibre'; 
import type { GeoJSONSource, Map as MapLibreMap, } from 'maplibre-gl';
import type { Feature } from 'geojson';
import { LocateFixed, Search, SlidersHorizontal, } from 'lucide-react';
import type { GeographicBounds, GeographicPoint, } from './geographicBounds';
import { getRadiusBounds, INITIAL_SEARCH_BOUNDS, } from './geographicBounds';
import type { FossilOccurrence } from './fossilTypes';
import type { ExplorationSearch, TaxonomicRank, } from './filterTypes';
import { DEFAULT_AGE_FILTER } from './filterTypes';
import { useFossilOccurrences } from './hooks/useFossilOccurrences';
import FossilMapLayers from './components/FossilMapLayers';
import OccurrencePopup from './components/OccurrencePopup';
import type { PopupAnchor } from './components/OccurrencePopup';
import MapStatus from './components/MapStatus';
import { loadMarkerIcons, registerMarkerIcons } from './utils/markerIcons';
import { createOccurrenceGeoJson } from './utils/occurrenceGeoJson';
import './exploration.css';

const MAX_ZOOM = 18;
const CLUSTER_RADIUS = 48;
const CLUSTER_MAX_ZOOM = 8;
const MAX_CLUSTER_LEAVES = 1500;
const NEARBY_MARKER_RADIUS = 16;
const GEOLOGICAL_PERIODS = [
  { label: 'Cambrian', youngerMa: 485.4, olderMa: 538.8 },
  { label: 'Ordovician', youngerMa: 443.8, olderMa: 485.4 },
  { label: 'Silurian', youngerMa: 419.2, olderMa: 443.8 },
  { label: 'Devonian', youngerMa: 358.9, olderMa: 419.2 },
  { label: 'Carboniferous', youngerMa: 298.9, olderMa: 358.9 },
  { label: 'Permian', youngerMa: 251.9, olderMa: 298.9 },
  { label: 'Triassic', youngerMa: 201.4, olderMa: 251.9 },
  { label: 'Jurassic', youngerMa: 145, olderMa: 201.4 },
  { label: 'Cretaceous', youngerMa: 66, olderMa: 145 },
  { label: 'Paleogene', youngerMa: 23.03, olderMa: 66 },
  { label: 'Neogene', youngerMa: 2.58, olderMa: 23.03 },
  { label: 'Quaternary', youngerMa: 0, olderMa: 2.58 },
] as const;

type PopupSelection = {
  longitude: number;
  latitude: number;
  occurrences: FossilOccurrence[];
  zoomTarget: number;
};

function getAgeOpacity(
  occurrence: FossilOccurrence,
  search: ExplorationSearch,
): number {

  if (!search.age.enabled) {
    return 1;
  }

  if (
    occurrence.olderAgeMa === null ||
    occurrence.youngerAgeMa === null
  ) {

    return search.age.mode === 'fade' ? 0.35 : 0;
  }

  const younger = Math.min(
    search.age.youngerMa,
    search.age.olderMa,
  );

  const older = Math.max(
    search.age.youngerMa,
    search.age.olderMa,
  );

  const overlaps =
    occurrence.olderAgeMa >= younger &&
    occurrence.youngerAgeMa <= older;
  
  if (overlaps) {
    return 1;
  }

  if (
    search.age.mode === 'strict' ||
    search.age.fadeMarginMa <= 0
  ) {
    return 0;
  }

  const distance =
    occurrence.youngerAgeMa > older
      ? occurrence.youngerAgeMa - older
      : younger - occurrence.olderAgeMa;
  if (distance >= search.age.fadeMarginMa) {
    return 0;
  }

  return Math.max(
    0.08,
    1 - distance / search.age.fadeMarginMa,
  );
}

function toBounds(mapBounds: {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
}): GeographicBounds {
  return {
    west: Math.max(
      -180,
      Math.floor(mapBounds.getWest() * 100) / 100,
    ),
    south: Math.max(
      -90,
      Math.floor(mapBounds.getSouth() * 100) / 100,
    ),
    east: Math.min(
      180,
      Math.ceil(mapBounds.getEast() * 100) / 100,
    ),

    north: Math.min(
      90,
      Math.ceil(mapBounds.getNorth() * 100) / 100,
    ),
  };
}

/**
 * Choose a popup anchor based on the marker's screen position.
 * MapLibre anchors describe which edge or corner of the popup
 * touches the selected coordinate.
 */

function getAdaptivePopupAnchor(
  map: MapLibreMap | undefined,
  selection: PopupSelection,
): PopupAnchor {
  if (!map) {
    return 'bottom';
  }

  const point = map.project([
    selection.longitude,
    selection.latitude,
  ]);

  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;
  const nearLeft = point.x < 190;
  const nearRight = point.x > width - 190;
  const nearTop = point.y < 190;
  const nearBottom = point.y > height - 210;

  if (nearTop && nearLeft) return 'top-left';
  if (nearTop && nearRight) return 'top-right';
  if (nearBottom && nearLeft) return 'bottom-left';
  if (nearBottom && nearRight) return 'bottom-right';
  if (nearTop) return 'top';
  if (nearBottom) return 'bottom';
  if (nearLeft) return 'left';
  if (nearRight) return 'right';

  // In the central area, render the popup above the marker.
  return 'bottom';
}

function getOccurrenceId(
  feature: Feature,
): string | null {

  const value = feature.properties?.occurrenceId;

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}


function getOccurrenceIds(feature: Feature): string[] {
  const properties = feature.properties as
    | Record<string, unknown>
    | null;

  const value = properties?.occurrenceIds;

  // New grouped markers contain every occurrence ID.
  if (Array.isArray(value)) {
    return value
      .filter(
        (id): id is string | number =>
          typeof id === 'string' || typeof id === 'number',
      )
      .map(String);
  }

  // Be tolerant if a source serializes the array as JSON.
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (id): id is string | number =>
              typeof id === 'string' || typeof id === 'number',
          )
          .map(String);
      }
    } catch {
      // Fall back to the single occurrence ID below.
    }
  }

  // Backward compatibility with features created before grouping.
  const occurrenceId = getOccurrenceId(feature);

  return occurrenceId ? [occurrenceId] : [];
}


function uniqueOccurrences(
  occurrences: FossilOccurrence[],
): FossilOccurrence[] {

  const unique = new Map<string, FossilOccurrence>();

  for (const occurrence of occurrences) {
    if (!unique.has(occurrence.id)) {
      unique.set(occurrence.id, occurrence);
    }
  }

  return [...unique.values()];
}

export default function ExplorationMap() {
  // ---------------------------------------------------------------------------
  // State and data: keep UI controls here while pure calculations live in utils.
  // ---------------------------------------------------------------------------
  const mapRef = useRef<MapRef | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [locationMessage, setLocationMessage] =
    useState<string | null>(null);
  const [periodSelection, setPeriodSelection] =
    useState<string>('any');
  const [taxonInput, setTaxonInput] = useState('');
  const [mapReady, setMapReady] = useState(false);
const [search, setSearch] = useState<ExplorationSearch>({
    bounds: INITIAL_SEARCH_BOUNDS,
    geographicMode: 'viewport',
    radiusCenter: {
      longitude: -110,
      latitude: 40,
    },

    radiusMiles: 50,
    age: DEFAULT_AGE_FILTER,
    taxonName: '',
    taxonRank: 'all',
  });

  const [selectedPopup, setSelectedPopup] =
    useState<PopupSelection | null>(null);
  const {
    occurrences,
    loading,
    error,
    truncated,
  } = useFossilOccurrences(search);

  // ---------------------------------------------------------------------------
  // Derived map data: visibility, lookup tables, GeoJSON, and popup anchors.
  // ---------------------------------------------------------------------------

  /*
   * Apply age visibility while retaining the original occurrence
   * objects for popup details and cluster leaf lookups.
   */

  const visibleOccurrences = useMemo(
    () =>
      occurrences
        .map((occurrence) => ({
          occurrence,
          opacity: getAgeOpacity(occurrence, search),
        }))
        .filter((item) => item.opacity > 0),
    [occurrences, search],
  );

  const mapForTaxonIcons = mapReady
    ? mapRef.current?.getMap() ?? null
    : null;

  const taxonIconIds = useTaxonMapIcons(
    mapForTaxonIcons,
    visibleOccurrences,
  );

  const visibleOccurrencesById = useMemo(() => {
    const lookup = new Map<string, FossilOccurrence>();
    for (const item of visibleOccurrences) {
      lookup.set(item.occurrence.id, item.occurrence);
    }

    return lookup;
  }, [visibleOccurrences]);

  const geoJson = useMemo(
    () => createOccurrenceGeoJson(
      visibleOccurrences,
      search,
      taxonIconIds,
    ),

    [visibleOccurrences, search, taxonIconIds],
  );

  /*
   * Update search bounds when the map stops moving.
   * Do not automatically close the popup here: the popup's own
   * zoom button also causes a map movement.
   */

  const updateBoundsFromMap = useCallback(
    (event: { target: MapLibreMap }) => {
      const map = event.target;

      if (search.geographicMode === 'radius') {
        const center = map.getCenter();
        const nextCenter: GeographicPoint = {
          longitude: center.lng,
          latitude: center.lat,
        };

        const nextBounds = getRadiusBounds(
          nextCenter,
          search.radiusMiles,
        );

        setSearch((current) => {
          const unchanged =
            current.radiusCenter.longitude ===
              nextCenter.longitude &&
            current.radiusCenter.latitude ===
              nextCenter.latitude &&
            current.bounds.west === nextBounds.west &&
            current.bounds.south === nextBounds.south &&
            current.bounds.east === nextBounds.east &&
            current.bounds.north === nextBounds.north;
          if (
            current.geographicMode !== 'radius' ||
            unchanged
          ) {
            return current;
          }
          return {
            ...current,
            radiusCenter: nextCenter,
            bounds: nextBounds,
          };
        });
        return;
      }

      const nextBounds = toBounds(map.getBounds());

      setSearch((current) => {
        if (
          current.geographicMode === 'viewport' &&
          current.bounds.west === nextBounds.west &&
          current.bounds.south === nextBounds.south &&
          current.bounds.east === nextBounds.east &&
          current.bounds.north === nextBounds.north
        ) {
          return current;
        }

        return {
          ...current,
          bounds: nextBounds,
        };
      });
    },

    [search.geographicMode, search.radiusMiles],
  );

  // ---------------------------------------------------------------------------
  // Map event handlers: lifecycle, cluster/point clicks, and location requests.
  // ---------------------------------------------------------------------------

  
  const handleMapLoad = useCallback(
    (event: { target: MapLibreMap }) => {
      registerMarkerIcons(event.target);

      setMapReady(true);
      updateBoundsFromMap(event);

      void loadMarkerIcons(event.target);
    },
    [updateBoundsFromMap],
  );


  /*
   * Cluster clicks now open a popup containing the cluster's leaves.
   * Individual marker clicks collect all nearby rendered point features,
   * which helps expose occurrences with identical or close coordinates.
   */

  const handleMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      const clickedFeature = event.features?.[0];

      if (!map || !clickedFeature) {
        setSelectedPopup(null);
        return;
      }

      const properties = clickedFeature.properties as
        | Record<string, unknown>
        | null;
      const clickedIsCluster =
        properties?.cluster === true ||
        properties?.cluster === 1 ||
        properties?.cluster === 'true';
      if (
        clickedIsCluster &&
        properties?.cluster_id !== undefined
      ) {
        const source = map.getSource(
          'fossil-occurrences',
        ) as GeoJSONSource | undefined;
        if (!source) {
          return;
        }

        const clusterId = Number(properties.cluster_id);
        try {
          const [leaves, expansionZoom] = await Promise.all([
            source.getClusterLeaves(
              clusterId,
              MAX_CLUSTER_LEAVES,
              0,
            ),
            source.getClusterExpansionZoom(clusterId),
          ]);

          const clusterOccurrences = uniqueOccurrences(
            leaves.flatMap((leaf) =>
              getOccurrenceIds(leaf as Feature)
                .map((id) => visibleOccurrencesById.get(id))
                .filter(
                  (occurrence): occurrence is FossilOccurrence =>
                    occurrence !== undefined,
                ),
            ),
          );

          if (clusterOccurrences.length === 0) {

            setSelectedPopup(null);

            return;

          }

          const currentZoom = map.getZoom();

          // If expansionZoom is already reached, still offer a

          // further step until the map's maximum zoom is reached.

          const zoomTarget = Math.min(

            MAX_ZOOM,

            Math.max(

              expansionZoom,

              Math.floor(currentZoom) + 1,

            ),

          );

          setSelectedPopup({

            longitude: event.lngLat.lng,

            latitude: event.lngLat.lat,

            occurrences: clusterOccurrences,

            zoomTarget,

          });

        } catch (cause) {

          console.error(

            'Unable to retrieve the selected cluster occurrences.',

            cause,

          );

        }

        return;

      }

      /*

       * Include the clicked point and any nearby rendered points.

       * The radius is in screen pixels, not geographic degrees.

       */

      const x = event.point.x;

      const y = event.point.y;

      const radius = NEARBY_MARKER_RADIUS;

      const nearbyFeatures = map.queryRenderedFeatures(
        [
          [x - radius, y - radius],
          [x + radius, y + radius],
        ],
        {
          layers: ['fossil-points'],
        },
      );

      const candidateFeatures = [
        clickedFeature,
        ...nearbyFeatures,
      ];

      const nearbyOccurrences = uniqueOccurrences(
        candidateFeatures.flatMap((feature) =>
          getOccurrenceIds(feature as Feature)
            .map((id) => visibleOccurrencesById.get(id))
            .filter(
              (occurrence): occurrence is FossilOccurrence =>
                occurrence !== undefined,
            ),
        ),
      );

      if (nearbyOccurrences.length === 0) {
        setSelectedPopup(null);
        return;
      }

      const clickedOccurrence = nearbyOccurrences[0];
      const currentZoom = map.getZoom();

      setSelectedPopup({
        longitude: clickedOccurrence.longitude,
        latitude: clickedOccurrence.latitude,
        occurrences: nearbyOccurrences,
        zoomTarget: Math.min(
          MAX_ZOOM,
          Math.floor(currentZoom) + 1,
        ),
      });
    },

    [visibleOccurrencesById],

  );

  const handlePopupZoom = useCallback(() => {

    const map = mapRef.current?.getMap();

    if (!map || !selectedPopup) {

      return;

    }

    if (map.getZoom() >= MAX_ZOOM) {

      return;

    }

    if (selectedPopup.zoomTarget <= map.getZoom()) {

      return;

    }

    map.easeTo({

      center: [

        selectedPopup.longitude,

        selectedPopup.latitude,

      ],

      zoom: selectedPopup.zoomTarget,

      duration: 450,

    });

  }, [selectedPopup]);

  const requestUserLocation = useCallback(() => {

    if (!navigator.geolocation) {

      setLocationMessage(

        'Location is not available in this browser. You can still explore by moving the map.',

      );

      return;

    }

    setLocationMessage('Requesting your location…');

    navigator.geolocation.getCurrentPosition(

      (position) => {

        const center: GeographicPoint = {

          longitude: position.coords.longitude,

          latitude: position.coords.latitude,

        };

        const bounds = getRadiusBounds(

          center,

          search.radiusMiles,

        );

        setSearch((current) => ({

          ...current,

          geographicMode: 'radius',

          radiusCenter: center,

          bounds,

        }));

        setSelectedPopup(null);

        setLocationMessage('Searching around your location.');

        mapRef.current?.flyTo({

          center: [center.longitude, center.latitude],

          zoom: 8,

          duration: 900,

        });

      },

      () => {

        setLocationMessage(

          'Location permission was unavailable. Move the map to choose an area instead.',

        );

      },

      {

        enableHighAccuracy: false,

        timeout: 10000,

        maximumAge: 60000,

      },

    );

  }, [search.radiusMiles]);

  const submitTaxonSearch = useCallback(

    (event: FormEvent<HTMLFormElement>) => {

      event.preventDefault();

      setSearch((current) => ({

        ...current,

        taxonName: taxonInput.trim(),

      }));

      setSelectedPopup(null);

    },

    [taxonInput],

  );

  const changePeriod = useCallback((value: string) => {

    setPeriodSelection(value);

    if (value === 'any') {

      setSearch((current) => ({

        ...current,

        age: {

          ...current.age,

          enabled: false,

        },

      }));

      return;

    }

    if (value === 'custom') {

      setSearch((current) => ({

        ...current,

        age: {

          ...current.age,

          enabled: true,

        },

      }));

      return;

    }

    const period = GEOLOGICAL_PERIODS.find(

      (candidate) => candidate.label === value,

    );

    if (period) {

      setSearch((current) => ({

        ...current,

        age: {

          ...current.age,

          enabled: true,

          youngerMa: period.youngerMa,

          olderMa: period.olderMa,

        },

      }));

    }

  }, []);

  // ---------------------------------------------------------------------------

  // Filter actions: update one part of search state at a time.

  // ---------------------------------------------------------------------------

  const updateAge = useCallback(

    (

      field: 'youngerMa' | 'olderMa',

      value: string,

    ) => {

      const parsed = Number(value);

      if (

        !Number.isFinite(parsed) ||

        parsed < 0 ||

        parsed > 539

      ) {

        return;

      }

      setPeriodSelection('custom');

      setSearch((current) => ({

        ...current,

        age: {

          ...current.age,

          enabled: true,

          [field]: parsed,

        },

      }));

    },

    [],

  );

  const updateGeographicMode = useCallback(

    (mode: 'viewport' | 'radius') => {

      const map = mapRef.current?.getMap();

      if (mode === 'radius' && map) {

        const center = map.getCenter();

        const radiusCenter: GeographicPoint = {

          longitude: center.lng,

          latitude: center.lat,

        };

        setSearch((current) => ({

          ...current,

          geographicMode: mode,

          radiusCenter,

          bounds: getRadiusBounds(

            radiusCenter,

            current.radiusMiles,

          ),

        }));

      } else if (map) {

        setSearch((current) => ({

          ...current,

          geographicMode: mode,

          bounds: toBounds(map.getBounds()),

        }));

      } else {

        setSearch((current) => ({

          ...current,

          geographicMode: mode,

        }));

      }

      setSelectedPopup(null);

    },

    [],

  );

  const changeRadius = useCallback(

    (radiusMiles: number) => {

      setSearch((current) => ({

        ...current,

        radiusMiles,

        bounds:

          current.geographicMode === 'radius'

            ? getRadiusBounds(

                current.radiusCenter,

                radiusMiles,

              )

            : current.bounds,

      }));

    },

    [],

  );

  const resetFilters = useCallback(() => {

    setTaxonInput('');

    setPeriodSelection('any');

    setSearch((current) => ({

      ...current,

      age: { ...DEFAULT_AGE_FILTER },

      taxonName: '',

      taxonRank: 'all',

    }));

    setSelectedPopup(null);

  }, []);

  const activeFilterCount =

    Number(search.age.enabled) +

    Number(Boolean(search.taxonName.trim())) +

    Number(search.geographicMode === 'radius');

  const map = mapRef.current?.getMap();

  const popupCanZoom =

    Boolean(map) &&

    Boolean(selectedPopup) &&

    map!.getZoom() < MAX_ZOOM &&

    selectedPopup!.zoomTarget > map!.getZoom();

  const popupAnchor = selectedPopup

    ? getAdaptivePopupAnchor(map, selectedPopup)

    : 'bottom';

  // ---------------------------------------------------------------------------

  // Render: map, status, and the expandable exploration/filter panel.

  // ---------------------------------------------------------------------------

  return (

    <div className="exploration-experience">

      <div

        className={`exploration-shell ${

          filterPanelOpen ? 'panel-open' : 'panel-closed'

        }`}

      >

        <div className="exploration-map">

          <MapView

            ref={mapRef}

            initialViewState={{

              longitude: -110,

              latitude: 40,

              zoom: 4,

            }}

            mapStyle="https://tiles.openfreemap.org/styles/liberty"

            minZoom={1}

            maxZoom={MAX_ZOOM}

            style={{

              width: '100%',

              height: '100%',

            }}

            onLoad={handleMapLoad}

            onMoveEnd={updateBoundsFromMap}

            onClick={handleMapClick}

            interactiveLayerIds={[

              'fossil-clusters',

              'fossil-points',

            ]}

          >

            <NavigationControl position="top-right" />

            <ScaleControl position="bottom-left" />

            {/* Keep the data source mounted even if decorative icons fail to load. */}

            <FossilMapLayers

              data={geoJson}

              clusterRadius={CLUSTER_RADIUS}

              clusterMaxZoom={CLUSTER_MAX_ZOOM}

            />

            {selectedPopup && (

              <OccurrencePopup

                key={selectedPopup.occurrences

                  .map((occurrence) => occurrence.id)

                  .join('|')}

                longitude={selectedPopup.longitude}

                latitude={selectedPopup.latitude}

                occurrences={selectedPopup.occurrences}

                anchor={popupAnchor}

                canZoomIn={popupCanZoom}

                maxZoomMessage="Already at maximum zoom."

                onClose={() => setSelectedPopup(null)}

                onZoomIn={handlePopupZoom}

              />

            )}

          </MapView>

          <MapStatus

            loading={loading}

            error={error}

            totalOccurrences={occurrences.length}

            visibleOccurrences={visibleOccurrences.length}

            truncated={truncated}

            hasAgeFilter={search.age.enabled}

          />

          <button

            type="button"

            className="panel-toggle"

            onClick={() =>

              setFilterPanelOpen((open) => !open)

            }

            aria-expanded={filterPanelOpen}

            aria-controls="exploration-side-panel"

          >

            <SlidersHorizontal

              size={17}

              aria-hidden="true"

            />

            <span>

              {filterPanelOpen ? 'Hide panel' : 'Explore'}

            </span>

            {activeFilterCount > 0 && (

              <span className="active-filter-count">

                {activeFilterCount}

              </span>

            )}

          </button>

        </div>

        <aside

          id="exploration-side-panel"

          className={`exploration-side-panel ${

            filterPanelOpen ? 'is-open' : ''

          }`}

          aria-hidden={!filterPanelOpen}

        >

          <div className="side-panel-header">

            <div>

              <p className="eyebrow">

                PREHISTORIC NEAR ME

              </p>

              <h1>Explore ancient life</h1>

              <p className="side-panel-subtitle">

                Find fossil discoveries by place, time, and taxonomy.

              </p>

            </div>

            <button

              type="button"

              className="panel-close-button"

              onClick={() => setFilterPanelOpen(false)}

              aria-label="Close exploration panel"

            >

              ×

            </button>

          </div>

          <div className="side-panel-content">

            <details className="filter-category" open>

              <summary>

                <span>Taxonomy</span>

                <span className="category-value">

                  {search.taxonName || 'All taxa'}

                </span>

              </summary>

              <form

                className="taxon-search side-taxon-search"

                onSubmit={submitTaxonSearch}

              >

                <label htmlFor="taxon-search-input">

                  Name

                </label>

                <div className="search-input-row">

                  <Search size={16} aria-hidden="true" />

                  <input

                    id="taxon-search-input"

                    value={taxonInput}

                    onChange={(event) =>

                      setTaxonInput(event.target.value)

                    }

                    placeholder="Species, genus, or family"

                  />

                </div>

                <label htmlFor="taxon-rank">

                  Search rank

                </label>

                <select

                  id="taxon-rank"

                  value={search.taxonRank}

                  onChange={(event) =>

                    setSearch((current) => ({

                      ...current,

                      taxonRank: event.target.value as TaxonomicRank,

                    }))

                  }

                >

                  <option value="all">Any rank</option>

                  <option value="species">Species</option>

                  <option value="genus">

                    Genus and descendants

                  </option>

                  <option value="family">

                    Family and descendants

                  </option>

                  <option value="order">

                    Order and descendants

                  </option>

                  <option value="class">

                    Class and descendants

                  </option>

                  <option value="phylum">

                    Phylum and descendants

                  </option>

                </select>

                <button

                  type="submit"

                  className="control-button control-button-primary"

                >

                  <Search size={15} />

                  Search fossils

                </button>

              </form>

            </details>

            <details className="filter-category" open>

              <summary>

                <span>Search area</span>

                <span className="category-value">

                  {search.geographicMode === 'radius'

                    ? `${search.radiusMiles} mi radius`

                    : 'Map view'}

                </span>

              </summary>

              <div className="category-fields">

                <label htmlFor="geographic-mode">

                  Area method

                </label>

                <select

                  id="geographic-mode"

                  value={search.geographicMode}

                  onChange={(event) =>

                    updateGeographicMode(

                      event.target.value as 'viewport' | 'radius',

                    )

                  }

                >

                  <option value="viewport">

                    Visible map area

                  </option>

                  <option value="radius">

                    Radius around map center

                  </option>

                </select>

                {search.geographicMode === 'radius' && (

                  <div className="range-control">

                    <div className="range-label-row">

                      <label htmlFor="search-radius">

                        Search radius

                      </label>

                      <output htmlFor="search-radius">

                        {search.radiusMiles} mi

                      </output>

                    </div>

                    <input

                      id="search-radius"

                      type="range"

                      min="10"

                      max="500"

                      step="10"

                      value={search.radiusMiles}

                      onChange={(event) =>

                        changeRadius(Number(event.target.value))

                      }

                    />

                    <div className="range-scale">

                      <span>10 mi</span>

                      <span>500 mi</span>

                    </div>

                    <small>

                      Centered on the map center. Use “Search near me”

                      to center on your location.

                    </small>

                  </div>

                )}

                <button

                  type="button"

                  className="control-button location-button"

                  onClick={requestUserLocation}

                >

                  <LocateFixed size={16} />

                  Search near me

                </button>

                {locationMessage && (

                  <p className="location-message" role="status">

                    {locationMessage}

                  </p>

                )}

              </div>

            </details>

            <details className="filter-category" open>

              <summary>

                <span>Geological time</span>

                <span className="category-value">

                  {search.age.enabled

                    ? `${search.age.youngerMa}–${search.age.olderMa} Ma`

                    : 'Any time'}

                </span>

              </summary>

              <div className="category-fields">

                <label htmlFor="period-filter">

                  Period

                </label>

                <select

                  id="period-filter"

                  value={periodSelection}

                  onChange={(event) =>

                    changePeriod(event.target.value)

                  }

                >

                  <option value="any">Any time</option>

                  {GEOLOGICAL_PERIODS.map((period) => (

                    <option

                      key={period.label}

                      value={period.label}

                    >

                      {period.label}

                    </option>

                  ))}

                  <option value="custom">

                    Custom age range

                  </option>

                </select>

                {search.age.enabled && (

                  <>

                    <div className="range-control">

                      <div className="range-label-row">

                        <label htmlFor="younger-age">

                          Younger boundary

                        </label>

                        <output htmlFor="younger-age">

                          {search.age.youngerMa.toLocaleString()} Ma

                        </output>

                      </div>

                      <input

                        id="younger-age"

                        type="range"

                        min="0"

                        max={Math.max(1, search.age.olderMa)}
                        step="0.1"
                        value={Math.min(
                          search.age.youngerMa,
                          search.age.olderMa,
                        )}
                        onChange={(event) =>
                          updateAge(
                            'youngerMa',
                            event.target.value,
                          )
                        }
                      />
                      <div className="range-scale">
                        <span>Present</span>
                        <span>{search.age.olderMa} Ma</span>
                      </div>
                    </div>
                    <div className="range-control">
                      <div className="range-label-row">
                        <label htmlFor="older-age">
                          Older boundary
                        </label>
                        <output htmlFor="older-age">
                          {search.age.olderMa.toLocaleString()} Ma
                        </output>
                      </div>
                      <input
                        id="older-age"
                        type="range"
                        min={Math.min(
                          search.age.youngerMa,
                          search.age.olderMa,
                        )}
                        max="539"
                        step="0.1"
                        value={Math.max(
                          search.age.youngerMa,
                          search.age.olderMa,
                        )}
                        onChange={(event) =>
                          updateAge(
                            'olderMa',
                            event.target.value,
                          )
                        }
                      />
                      <div className="range-scale">
                        <span>{search.age.youngerMa} Ma</span>
                        <span>539 Ma</span>
                      </div>
                    </div>
                    <label htmlFor="age-mode">
                      Outside selected range
                    </label>
                    <select
                      id="age-mode"
                      value={search.age.mode}
                      onChange={(event) =>
                        setSearch((current) => ({
                          ...current,
                          age: {
                            ...current.age,
                            mode: event.target.value as 'fade' | 'strict',
                          },
                        }))
                      }
                    >
                      <option value="fade">
                        Fade nearby ages
                      </option>
                      <option value="strict">
                        Strictly filter
                      </option>
                    </select>
                    {search.age.mode === 'fade' && (
                      <div className="range-control">
                        <div className="range-label-row">
                          <label htmlFor="fade-margin">
                            Fade distance
                          </label>
                          <output htmlFor="fade-margin">
                            {search.age.fadeMarginMa} Ma
                          </output>
                        </div>
                        <input
                          id="fade-margin"
                          type="range"
                          min="5"
                          max="50"
                          step="5"
                          value={search.age.fadeMarginMa}
                          onChange={(event) =>
                            setSearch((current) => ({
                              ...current,
                              age: {
                                ...current.age,
                                fadeMarginMa: Number(event.target.value),
                              },
                            }))
                          }
                        />
                        <div className="range-scale">
                          <span>5 Ma</span>
                          <span>50 Ma</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </details>
            <details className="filter-category">
              <summary>
                <span>Map key</span>
                <span className="category-value">Markers</span>
              </summary>
              <div className="category-fields map-key-content">
                <p>
                  <span className="legend-dot" />
                  Color represents taxonomic relationships for the active
                  search.
                </p>
                <p>
                  <span className="legend-dot legend-dot-icon">
                    ✦
                  </span>
                  Icon represents a broad organism group when
                  classification is available.
                </p>
                <small>
                  Diet is not inferred. Diet icons will only be added
                  when supported by curated or verified trait data.
                </small>
              </div>
            </details>
            <button
              type="button"
              className="control-button control-button-reset reset-panel-button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
          <div className="side-panel-footer">
            Data source: Paleobiology Database
          </div>
        </aside>
      </div>
      {search.geographicMode === 'radius' &&
        !loading &&
        !error && (
          <p className="search-summary">
            Within {search.radiusMiles} miles of{' '}
            {search.radiusCenter.latitude.toFixed(2)},{' '}
            {search.radiusCenter.longitude.toFixed(2)} · approximate
            radius filtering
          </p>
        )}
    </div>
  );
}