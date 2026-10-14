import {
  Compass,
  Map,
  Search,
  Clock3,
  Layers3,
  MapPin,
} from 'lucide-react';
import ExplorationMap from './features/exploration/ExplorationMap';

const navigation = [
  { label: 'Explore', icon: Compass, active: true },
  { label: 'Timeline', icon: Clock3, active: false },
  { label: 'Discover', icon: Search, active: false },
];

export default function App() {
  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4 sm:px-8">
        <a href="#" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[var(--color-background)]">
            <Layers3 size={22} />
          </div>

          <div>
            <h1 className="text-base font-semibold tracking-wide">
              Prehistoric Near Me
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Explore Earth's ancient life
            </p>
          </div>
        </a>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] sm:flex"
        >
          <MapPin size={16} />
          Set your location
        </button>
      </header>

      <div className="mx-auto flex max-w-[var(--content-max-width)]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] p-5 md:block">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Navigation
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  active
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium">A world transformed</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Discover the organisms that lived here long before us.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 pb-24 sm:p-6 md:pb-8 lg:p-8">
          {/* <div className="mb-6">
            <p className="text-sm font-medium text-[var(--color-accent)]">
              YOUR WINDOW INTO DEEP TIME
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Life has a long history.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              Explore ancient ecosystems, discover fossil finds, and see how
              the world around you has changed across geological time.
            </p>
          </div> */}

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
              <div className="flex items-center gap-3">
                <Map size={20} className="text-[var(--color-accent)]" />

                <div>
                  <h3 className="font-medium">Ancient Earth Explorer</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Fine fossils near you
                  </p>
                </div>
              </div>

              {/* <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
                PBDB occurrences
              </span> */}
            </div>

            <ExplorationMap />
          </div>

          {/* <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <Search size={20} className="text-[var(--color-accent)]" />
              <h3 className="mt-4 font-medium">Discover ancient life</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Search fossil occurrences and learn about the organisms
                represented by the evidence.
              </p>
            </article>

            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <Clock3 size={20} className="text-[var(--color-accent)]" />
              <h3 className="mt-4 font-medium">Travel through deep time</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Explore geological periods and eventually compare modern
                geography with reconstructed ancient continents.
              </p>
            </article>
          </div> */}
        </section>
      </div>

      {/* <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[var(--color-border)] bg-[var(--color-background)]/95 px-2 py-2 backdrop-blur md:hidden">
        {navigation.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            className={`flex min-h-12 min-w-20 flex-col items-center justify-center gap-1 rounded-lg text-xs ${
              active
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav> */}
    </main>
  );
}