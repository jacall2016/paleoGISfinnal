import type { Dispatch, SetStateAction } from 'react';

import type { ExplorationSearch, TaxonomicRank } from '../filterTypes';

interface ExplorationSidePanelProps {
  open: boolean;
  onToggle: () => void;
  search: ExplorationSearch;
  setSearch: Dispatch<SetStateAction<ExplorationSearch>>;
  onLocate: () => void;
  onReset: () => void;
  activeFilterCount: number;
  locationMessage: string | null;
}

const TAXONOMIC_RANKS: { value: TaxonomicRank; label: string }[] = [
  { value: 'all' as TaxonomicRank, label: 'Any rank' },
  { value: 'species' as TaxonomicRank, label: 'Species' },
  { value: 'genus' as TaxonomicRank, label: 'Genus' },
  { value: 'family' as TaxonomicRank, label: 'Family' },
  { value: 'order' as TaxonomicRank, label: 'Order' },
  { value: 'class' as TaxonomicRank, label: 'Class' },
  { value: 'phylum' as TaxonomicRank, label: 'Phylum' },
];

export default function ExplorationSidePanel({
  open,
  onToggle,
  search,
  setSearch,
  onLocate,
  onReset,
  activeFilterCount,
  locationMessage,
}: ExplorationSidePanelProps) {
  function updateTaxonName(taxonName: string) {
    setSearch((current) => ({ ...current, taxonName }));
  }

  function updateTaxonRank(taxonRank: TaxonomicRank) {
    setSearch((current) => ({ ...current, taxonRank }));
  }

  function updateAge(
    field: 'youngerMa' | 'olderMa',
    value: number,
  ) {
    setSearch((current) => ({
      ...current,
      age: {
        ...current.age,
        enabled: true,
        [field]: value,
      },
    }));
  }

  function updateRadius(radiusMiles: number) {
    setSearch((current) => ({
      ...current,
      radiusMiles,
    }));
  }

  return (
    <>
      <button
        type="button"
        className="exploration-panel-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? 'Collapse search panel' : 'Expand search panel'}
      >
        {open ? 'Hide filters' : 'Show filters'}
        {activeFilterCount > 0 && (
          <span className="exploration-panel-toggle__count">
            {activeFilterCount}
          </span>
        )}
      </button>

      <aside
        className={`exploration-side-panel ${open ? 'is-open' : 'is-closed'}`}
        aria-label="Fossil search and filters"
        aria-hidden={!open}
      >
        {open && (
          <>
            <header className="exploration-side-panel__header">
              <div>
                <h2>Explore fossils</h2>
                <p>Search fossil localities and geological ages.</p>
              </div>

              <button
                type="button"
                onClick={onToggle}
                aria-label="Close filters"
                className="exploration-side-panel__close"
              >
                ×
              </button>
            </header>

            <section className="exploration-filter-section">
              <h3>Taxonomy</h3>

              <label htmlFor="fossil-taxon-name">
                Organism name
              </label>
              <input
                id="fossil-taxon-name"
                type="search"
                value={search.taxonName}
                onChange={(event) => updateTaxonName(event.target.value)}
                placeholder="e.g. Tyrannosaurus"
              />

              <label htmlFor="fossil-taxon-rank">
                Taxonomic rank
              </label>
              <select
                id="fossil-taxon-rank"
                value={search.taxonRank}
                onChange={(event) =>
                  updateTaxonRank(event.target.value as TaxonomicRank)
                }
              >
                {TAXONOMIC_RANKS.map((rank) => (
                  <option key={rank.value} value={rank.value}>
                    {rank.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="exploration-filter-section">
              <h3>Search area</h3>

              <div className="exploration-mode-options">
                <label>
                  <input
                    type="radio"
                    name="geographic-mode"
                    checked={search.geographicMode === 'viewport'}
                    onChange={() =>
                      setSearch((current) => ({
                        ...current,
                        geographicMode: 'viewport',
                      }))
                    }
                  />
                  Current map view
                </label>

                <label>
                  <input
                    type="radio"
                    name="geographic-mode"
                    checked={search.geographicMode === 'radius'}
                    onChange={() =>
                      setSearch((current) => ({
                        ...current,
                        geographicMode: 'radius',
                      }))
                    }
                  />
                  Radius around center
                </label>
              </div>

              {search.geographicMode === 'radius' && (
                <div className="exploration-range-control">
                  <label htmlFor="fossil-radius">
                    Radius: {search.radiusMiles} miles
                  </label>
                  <input
                    id="fossil-radius"
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={search.radiusMiles}
                    onChange={(event) =>
                      updateRadius(Number(event.target.value))
                    }
                  />
                </div>
              )}

              <button
                type="button"
                className="exploration-secondary-button"
                onClick={onLocate}
              >
                Use my location
              </button>

              {locationMessage && (
                <p className="exploration-side-panel__message" role="status">
                  {locationMessage}
                </p>
              )}
            </section>

            <section className="exploration-filter-section">
              <h3>Geological age</h3>

              <label className="exploration-checkbox">
                <input
                  type="checkbox"
                  checked={search.age.enabled}
                  onChange={(event) =>
                    setSearch((current) => ({
                      ...current,
                      age: {
                        ...current.age,
                        enabled: event.target.checked,
                      },
                    }))
                  }
                />
                Enable age filter
              </label>

              <div className="exploration-range-control">
                <label htmlFor="fossil-younger-age">
                  Younger boundary: {search.age.youngerMa} Ma
                </label>
                <input
                  id="fossil-younger-age"
                  type="range"
                  min={0}
                  max={539}
                  step={0.1}
                  value={search.age.youngerMa}
                  disabled={!search.age.enabled}
                  onChange={(event) =>
                    updateAge('youngerMa', Number(event.target.value))
                  }
                />
              </div>

              <div className="exploration-range-control">
                <label htmlFor="fossil-older-age">
                  Older boundary: {search.age.olderMa} Ma
                </label>
                <input
                  id="fossil-older-age"
                  type="range"
                  min={0}
                  max={539}
                  step={0.1}
                  value={search.age.olderMa}
                  disabled={!search.age.enabled}
                  onChange={(event) =>
                    updateAge('olderMa', Number(event.target.value))
                  }
                />
              </div>

              <label htmlFor="fossil-age-mode">
                Outside range
              </label>
              <select
                id="fossil-age-mode"
                value={search.age.mode}
                disabled={!search.age.enabled}
                onChange={(event) =>
                  setSearch((current) => ({
                    ...current,
                    age: {
                      ...current.age,
                      mode: event.target.value as typeof current.age.mode,
                    },
                  }))
                }
              >
                <option value="fade">Fade nearby ages</option>
                <option value="strict">Hide outside range</option>
              </select>

              {search.age.mode === 'fade' && (
                <div className="exploration-range-control">
                  <label htmlFor="fossil-fade-margin">
                    Fade margin: {search.age.fadeMarginMa} Ma
                  </label>
                  <input
                    id="fossil-fade-margin"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={search.age.fadeMarginMa}
                    disabled={!search.age.enabled}
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
                </div>
              )}
            </section>

            <footer className="exploration-side-panel__footer">
              <span>
                {activeFilterCount} active filter
                {activeFilterCount === 1 ? '' : 's'}
              </span>

              <button
                type="button"
                className="exploration-secondary-button"
                onClick={onReset}
              >
                Reset filters
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}