interface MapStatusProps {
  loading: boolean;
  error: string | null;
  totalOccurrences: number;
  visibleOccurrences: number;
  truncated: boolean;
  hasAgeFilter: boolean;
}

export default function MapStatus({
  loading,
  error,
  totalOccurrences,
  visibleOccurrences,
  truncated,
  hasAgeFilter,
}: MapStatusProps) {
  return (
    <div
      className="map-status"
      aria-live="polite"
      aria-atomic="true"
    >
      {loading && (
        <p className="map-status__message">
          Loading fossil occurrences…
        </p>
      )}

      {error && (
        <p className="map-status__message map-status__message--error">
          Unable to load fossils: {error}
        </p>
      )}

      {!loading && !error && totalOccurrences === 0 && (
        <p className="map-status__message">
          No fossil occurrences found in this search area.
        </p>
      )}

      {!loading &&
        !error &&
        totalOccurrences > 0 &&
        visibleOccurrences === 0 && (
          <p className="map-status__message">
            No occurrences match the current visibility filters.
          </p>
        )}

      {!error && totalOccurrences > 0 && (
        <p className="map-status__count">
          Showing {visibleOccurrences.toLocaleString()} of{' '}
          {totalOccurrences.toLocaleString()} loaded occurrences
          {hasAgeFilter ? ' · geological age filter active' : ''}
        </p>
      )}

      {truncated && (
        <p className="map-status__message map-status__message--warning">
          The result limit was reached. Zoom in or narrow your search
          to explore additional localities.
        </p>
      )}
    </div>
  );
}