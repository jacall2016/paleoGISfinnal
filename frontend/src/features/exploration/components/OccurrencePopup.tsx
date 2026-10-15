import { useEffect, useMemo, useState } from 'react';
import { Popup } from 'react-map-gl/maplibre';

import type { FossilOccurrence } from '../fossilTypes';
import { groupOccurrences } from '../utils/occurrenceGrouping';
import { resolveTaxonIcon } from '../../../services/phyloPic/taxonIconResolver';

export type PopupAnchor =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface OccurrencePopupProps {
  longitude: number;
  latitude: number;
  occurrences: FossilOccurrence[];
  anchor?: PopupAnchor;
  canZoomIn: boolean;
  maxZoomMessage?: string;
  onClose: () => void;
  onZoomIn: () => void;
}

function formatAge(age: number | null): string | null {
  if (age === null || !Number.isFinite(age)) return null;

  return `${age.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} Ma`;
}

function getAgeLabel(occurrence: FossilOccurrence): string {
  const older = formatAge(occurrence.olderAgeMa);
  const younger = formatAge(occurrence.youngerAgeMa);

  if (older && younger) return `${younger}–${older} ago`;
  if (older) return `Older bound: ${older}`;
  if (younger) return `Younger bound: ${younger}`;

  return 'Age not available';
}

export default function OccurrencePopup({
  longitude,
  latitude,
  occurrences,
  anchor = 'bottom',
  canZoomIn,
  maxZoomMessage = 'Already at maximum zoom.',
  onClose,
  onZoomIn,
}: OccurrencePopupProps) {
  const groups = useMemo(
    () => groupOccurrences(occurrences),
    [occurrences],
  );

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    () => new Set(),
  );

  const [zoomMessage, setZoomMessage] = useState('');

  // Maps each organism group's key to its successfully resolved
  // PhyloPic image URL. Missing icons are deliberately omitted.
  const [groupIconUrls, setGroupIconUrls] = useState<
    Map<string, string>
  >(() => new Map());

  useEffect(() => {
    let cancelled = false;

    async function resolveGroupIcons() {
      const results = await Promise.all(
        groups.map(async (group) => {
          const representative = group.occurrences[0];

          if (!representative) {
            return [group.key, null] as const;
          }

          try {
            const result = await resolveTaxonIcon(representative);

            // Do not display the generic local fallback as if it
            // were an actual taxonomic silhouette.
            if (result.source !== 'phylopic') {
              return [group.key, null] as const;
            }

            return [group.key, result.imageUrl] as const;
          } catch (error) {
            console.warn(
              `Could not resolve a popup icon for "${group.scientificName}".`,
              error,
            );

            return [group.key, null] as const;
          }
        }),
      );

      if (cancelled) return;

      const nextIcons = new Map<string, string>();

      for (const [groupKey, imageUrl] of results) {
        if (imageUrl) {
          nextIcons.set(groupKey, imageUrl);
        }
      }

      setGroupIconUrls(nextIcons);
    }

    void resolveGroupIcons();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  }

  function toggleRecord(id: string) {
    setExpandedRecords((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function handleZoomClick() {
    if (!canZoomIn) {
      setZoomMessage(maxZoomMessage);
      return;
    }

    setZoomMessage('');
    onZoomIn();
  }

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor={anchor}
      offset={18}
      onClose={onClose}
      closeOnClick={false}
      maxWidth="360px"
    >
      <section className="occurrence-popup">
        <header className="occurrence-popup__header">
          <div>
            <strong className="occurrence-popup__title">
              Fossil localities
            </strong>

            <div className="occurrence-popup__summary">
              {occurrences.length} occurrence
              {occurrences.length === 1 ? '' : 's'} · {groups.length}{' '}
              organism group{groups.length === 1 ? '' : 's'}
            </div>
          </div>

          <button
            type="button"
            className="occurrence-popup__zoom"
            onClick={handleZoomClick}
            aria-label={
              canZoomIn ? 'Zoom in on these fossils' : maxZoomMessage
            }
            title={canZoomIn ? 'Zoom in' : maxZoomMessage}
          >
            +
          </button>
        </header>

        {!canZoomIn && (
          <p className="occurrence-popup__zoom-message">
            {zoomMessage || maxZoomMessage}
          </p>
        )}

        <div className="occurrence-popup__groups">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const iconUrl = groupIconUrls.get(group.key);

            return (
              <section
                className="occurrence-group"
                key={group.key}
              >
                <button
                  type="button"
                  className="occurrence-group__toggle"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isExpanded}
                >
                  <span
                    className="occurrence-group__identity"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {iconUrl && (
                      <img
                        className="occurrence-group__icon"
                        src={iconUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        style={{
                          width: '28px',
                          height: '28px',
                          objectFit: 'contain',
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <span className="occurrence-group__name">
                      <em>{group.scientificName}</em>
                    </span>
                  </span>

                  <span className="occurrence-group__count">
                    {group.count > 1 ? `×${group.count}` : '1'}
                  </span>

                  <span aria-hidden="true">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="occurrence-group__records">
                    {group.occurrences.map((occurrence) => {
                      const recordExpanded = expandedRecords.has(
                        occurrence.id,
                      );

                      return (
                        <article
                          className="occurrence-record"
                          key={occurrence.id}
                        >
                          <button
                            type="button"
                            className="occurrence-record__toggle"
                            onClick={() => toggleRecord(occurrence.id)}
                            aria-expanded={recordExpanded}
                          >
                            <span>
                              {getAgeLabel(occurrence)}
                            </span>

                            <span aria-hidden="true">
                              {recordExpanded ? '−' : '+'}
                            </span>
                          </button>

                          {recordExpanded && (
                            <div className="occurrence-record__details">
                              {occurrence.taxonRank && (
                                <p>
                                  <strong>Rank:</strong>{' '}
                                  {occurrence.taxonRank}
                                </p>
                              )}

                              {occurrence.genus && (
                                <p>
                                  <strong>Genus:</strong>{' '}
                                  {occurrence.genus}
                                </p>
                              )}

                              {occurrence.family && (
                                <p>
                                  <strong>Family:</strong>{' '}
                                  {occurrence.family}
                                </p>
                              )}

                              {(occurrence.earlyInterval ||
                                occurrence.lateInterval) && (
                                <p>
                                  <strong>Interval:</strong>{' '}
                                  {[
                                    occurrence.earlyInterval,
                                    occurrence.lateInterval,
                                  ]
                                    .filter(Boolean)
                                    .join(' – ')}
                                </p>
                              )}

                              {occurrence.collectionName && (
                                <p>
                                  <strong>Collection:</strong>{' '}
                                  {occurrence.collectionName}
                                </p>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="occurrence-popup__footer">
          Source: Paleobiology Database. Coordinates represent
          recorded localities, not reconstructed ancient geography.
        </footer>
      </section>
    </Popup>
  );
}