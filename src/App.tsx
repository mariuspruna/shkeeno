import { useEffect, useState } from 'react'
import './App.css'

type ThemeConfig = {
  primary: string
  accent: string
  surface: string
  headingFont: string
  bodyFont: string
}

type NavGroup = {
  label: string
  href?: string
  items?: Array<{ label: string; href: string }>
}

const THEME_STORAGE_KEY = 'shkeeno-theme'

const fontOptions = {
  refined: '"DM Sans", "Segoe UI", sans-serif',
} as const

const defaultTheme: ThemeConfig = {
  primary: '#121212',
  accent: '#007f7a',
  surface: '#f5f4ef',
  headingFont: fontOptions.refined,
  bodyFont: fontOptions.refined,
}

const navGroups: NavGroup[] = [
  { label: 'Home', href: '#home' },
  {
    label: 'About',
    items: [
      { label: 'Shkeeno', href: '#about-shkeeno' },
      { label: 'The designer', href: '#the-designer' },
      { label: 'The idea', href: '#the-idea' },
    ],
  },
  {
    label: 'Responsabilities',
    items: [
      { label: 'Sustainability', href: '#sustainability' },
      { label: 'Code of ethics', href: '#code-of-ethics' },
      { label: 'Terms & conditions', href: '#terms-and-conditions' },
      { label: 'Charity', href: '#charity' },
    ],
  },
  {
    label: 'Menu',
    items: [
      { label: 'New in', href: '#new-in' },
      { label: 'Wish list', href: '#wish-list' },
      { label: 'Pre-order', href: '#pre-order' },
      { label: 'Sale', href: '#sale' },
    ],
  },
  { label: 'Portfolio', href: '#portfolio' },
  {
    label: 'Follow us on',
    items: [
      { label: 'Instagram ↗', href: '/' },
      { label: 'Pinterest ↗', href: '/' },
      { label: 'TikTok ↗', href: '/' },
      { label: 'Facebook ↗', href: '/' },
    ],
  },
  { label: 'Need help', href: '#need-help' },
  { label: 'Contacts', href: '#contacts' },
]

const portfolioCards = [
  'Collection zero one',
  'Studio tailoring',
  'Graphic florals',
  'Pre-order capsule',
]

function loadTheme() {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (!stored) {
    return defaultTheme
  }

  try {
    return { ...defaultTheme, ...JSON.parse(stored) } as ThemeConfig
  } catch {
    return defaultTheme
  }
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-surface', theme.surface)
  root.style.setProperty('--font-heading', theme.headingFont)
  root.style.setProperty('--font-body', theme.bodyFont)
}

function PlaceholderBlock({
  label,
  tall = false,
}: {
  label: string
  tall?: boolean
}) {
  return (
    <div className={`placeholder-block${tall ? ' tall' : ''}`}>
      <span>{label}</span>
    </div>
  )
}

function FrontPage() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="nav-row">
          <a className="wordmark" href="#home">
            SHKEENO
          </a>

          <nav className="main-nav" aria-label="Primary">
            {navGroups.map((group) =>
              group.items ? (
                <div className="nav-group" key={group.label}>
                  <button type="button" className="nav-trigger">
                    {group.label}
                  </button>
                  <div className="nav-dropdown">
                    {group.items.map((item) => (
                      <a key={item.label} href={item.href}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a key={group.label} href={group.href} className="nav-link">
                  {group.label}
                </a>
              ),
            )}
          </nav>

          <a className="admin-link" href="/admin">
            Admin
          </a>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">Independent fashion label</p>
            <h1>Designer-led fashion shaped by confidence, structure and identity.</h1>
            <p className="hero-text">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              posuere tellus sit amet pulvinar dapibus, arcu nisi fermentum
              velit, vitae rhoncus nisl ipsum at nunc.
            </p>
          </div>
          <div className="hero-media">
            <PlaceholderBlock label="Wide campaign image" tall />
          </div>
        </section>

        <section className="content-grid" id="about-shkeeno">
          <article className="text-panel">
            <p className="eyebrow">About shkeeno</p>
            <h2>A brand presence first, with room for commerce later.</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
              facilisis, libero vel eleifend ultrices, erat metus malesuada
              lectus, sed molestie felis lorem vitae erat.
            </p>
          </article>
          <PlaceholderBlock label="Designer portrait" />
          <article className="text-panel" id="the-designer">
            <p className="eyebrow">The designer</p>
            <h2>Diana Baptista sits at the center of the narrative.</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean
              iaculis nisi ac justo laoreet, nec convallis sapien faucibus.
            </p>
          </article>
          <article className="text-panel" id="the-idea">
            <p className="eyebrow">The idea</p>
            <h2>Contemporary, feminine and confident without visual noise.</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla
              facilisi. In sed mi ac turpis cursus convallis sit amet ac arcu.
            </p>
          </article>
        </section>

        <section className="portfolio-section" id="portfolio">
          <div className="section-heading">
            <p className="eyebrow">Portfolio</p>
            <h2>Structured like a fashion house, not a marketplace.</h2>
          </div>

          <div className="portfolio-grid">
            {portfolioCards.map((item) => (
              <article key={item} className="portfolio-card">
                <PlaceholderBlock label={item} />
                <div className="card-meta">
                  <h3>{item}</h3>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>

      <footer className="footer" id="contacts">
        <div className="footer-block">
          <p className="eyebrow">Responsabilities</p>
          <div className="footer-links">
            <a href="/" id="sustainability">Sustainability</a>
            <a href="/" id="code-of-ethics">Code of ethics</a>
            <a href="/" id="terms-and-conditions">Terms & conditions</a>
            <a href="/" id="charity">Charity</a>
          </div>
        </div>
        <div className="footer-block" id="need-help">
          <p className="eyebrow">Need help</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Contact,
            delivery, returns and pre-order support will live here.
          </p>
        </div>
        <div className="footer-block">
          <p className="eyebrow">Follow us on</p>
          <div className="footer-links">
            <a href="/">Instagram ↗</a>
            <a href="/">Pinterest ↗</a>
            <a href="/">TikTok ↗</a>
            <a href="/">Facebook ↗</a>
          </div>
        </div>
        <div className="footer-block">
          <p className="eyebrow">Contacts</p>
          <div className="footer-links">
            <a href="mailto:hello@shkeeno.com">hello@shkeeno.com</a>
            <a href="/">London, United Kingdom</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AdminPage({
  theme,
  setTheme,
}: {
  theme: ThemeConfig
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="eyebrow">/admin</p>
        <h1>Theme controls</h1>
        <p>
          First pass only. This is intentionally unprotected for now and set up
          so we can replace it later with a proper CMS or password gate.
        </p>
        <a className="button button-ghost" href="/">
          Back to site
        </a>
      </aside>

      <section className="admin-panel">
        <div className="control-group">
          <label htmlFor="primary">Primary</label>
          <input
            id="primary"
            type="color"
            value={theme.primary}
            onChange={(event) =>
              setTheme((current) => ({ ...current, primary: event.target.value }))
            }
          />
        </div>

        <div className="control-group">
          <label htmlFor="accent">Accent</label>
          <input
            id="accent"
            type="color"
            value={theme.accent}
            onChange={(event) =>
              setTheme((current) => ({ ...current, accent: event.target.value }))
            }
          />
        </div>

        <div className="control-group">
          <label htmlFor="surface">Surface</label>
          <input
            id="surface"
            type="color"
            value={theme.surface}
            onChange={(event) =>
              setTheme((current) => ({ ...current, surface: event.target.value }))
            }
          />
        </div>

        <div className="control-group">
          <label htmlFor="heading-font">Heading font</label>
          <select
            id="heading-font"
            value={theme.headingFont}
            onChange={(event) =>
              setTheme((current) => ({
                ...current,
                headingFont: event.target.value,
              }))
            }
          >
            <option value={fontOptions.refined}>DM Sans</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="body-font">Body font</label>
          <select
            id="body-font"
            value={theme.bodyFont}
            onChange={(event) =>
              setTheme((current) => ({
                ...current,
                bodyFont: event.target.value,
              }))
            }
          >
            <option value={fontOptions.refined}>DM Sans</option>
          </select>
        </div>

        <div className="preview-tile">
          <p className="eyebrow">Live preview notes</p>
          <h2>These controls update the public site immediately on this device.</h2>
          <p>
            Next step can be storing the theme in a small backend or content
            file so publishing makes it canonical.
          </p>
          <button
            type="button"
            className="button button-solid"
            onClick={() => setTheme(defaultTheme)}
          >
            Reset defaults
          </button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const isAdmin = window.location.pathname === '/admin'

  useEffect(() => {
    const nextTheme = loadTheme()
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  }, [theme])

  return isAdmin ? (
    <AdminPage theme={theme} setTheme={setTheme} />
  ) : (
    <FrontPage />
  )
}

export default App
