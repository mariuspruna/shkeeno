import { useEffect, useState } from 'react'
import './App.css'

type ThemeConfig = {
  primary: string
  accent: string
  surface: string
  headingFont: string
  bodyFont: string
}

const THEME_STORAGE_KEY = 'shkeeno-theme'

const fontOptions = {
  editorial: '"Cormorant Garamond", Georgia, serif',
  modern: '"Manrope", "Segoe UI", sans-serif',
  refined: '"DM Sans", "Segoe UI", sans-serif',
  classic: '"Instrument Serif", Georgia, serif',
} as const

const defaultTheme: ThemeConfig = {
  primary: '#16110f',
  accent: '#d98c6f',
  surface: '#f7efe7',
  headingFont: fontOptions.modern,
  bodyFont: fontOptions.refined,
}

const lookbookCards = [
  'Collection zero one',
  'Studio tailoring',
  'Graphic florals',
  'Pre-order capsule',
]

const responsibilities = [
  'Sustainability',
  'Code of ethics',
  'Terms & conditions',
  'Charity',
]

const menuLinks = ['New in', 'Wish list', 'Pre-order', 'Sale']

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
        <div className="wordmark">SHKEENO</div>
        <nav className="main-nav" aria-label="Primary">
          <a href="#about">About</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#responsibilities">Responsibilities</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-link" href="/admin">
          Admin
        </a>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Independent fashion label</p>
            <h1>
              Designer-led fashion with a graphic pulse and a softer edge.
            </h1>
            <p className="hero-text">
              Latin copy will live here for now, but the structure is ready for
              brand story, campaign messaging, collections and signposted
              product categories.
            </p>
            <div className="hero-actions">
              <a href="#portfolio" className="button button-solid">
                Explore portfolio
              </a>
              <a href="#about" className="button button-ghost">
                Meet the designer
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <PlaceholderBlock label="Campaign image" tall />
            <div className="floating-note">
              <span>Theme-ready layout</span>
              <strong>Primary / accent / surface</strong>
            </div>
          </div>
        </section>

        <section className="collection-ribbon" aria-label="Shopping shortcuts">
          {menuLinks.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>

        <section className="editorial-grid" id="about">
          <article className="text-panel">
            <p className="eyebrow">About shkeeno</p>
            <h2>A brand presence first, with room for commerce later.</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              posuere, tellus sit amet pulvinar dapibus, arcu nisi fermentum
              velit, vitae rhoncus nisl ipsum at nunc.
            </p>
          </article>
          <PlaceholderBlock label="Designer portrait" />
          <article className="text-panel">
            <p className="eyebrow">The designer</p>
            <h2>Diana Baptista sits at the center of the narrative.</h2>
            <p>
              Integer facilisis, libero vel eleifend ultrices, erat metus
              malesuada lectus, sed molestie felis lorem vitae erat.
            </p>
          </article>
          <PlaceholderBlock label="Texture or detail crop" />
        </section>

        <section className="statement-band">
          <p>
            SHKEENO should feel editorial, contemporary, feminine and confident
            without sliding into generic luxury language.
          </p>
        </section>

        <section className="portfolio-section" id="portfolio">
          <div className="section-heading">
            <p className="eyebrow">Portfolio</p>
            <h2>Structured like a fashion house, not a marketplace.</h2>
          </div>

          <div className="portfolio-grid">
            {lookbookCards.map((item) => (
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

        <section className="dual-columns" id="responsibilities">
          <div className="column-block">
            <p className="eyebrow">Responsibilities</p>
            <ul className="link-list">
              {responsibilities.map((item) => (
                <li key={item}>
                  <a href="/">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="column-block">
            <p className="eyebrow">Follow us on</p>
            <ul className="link-list">
              <li>
                <a href="/">Instagram</a>
              </li>
              <li>
                <a href="/">Pinterest</a>
              </li>
              <li>
                <a href="/">TikTok</a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer" id="contact">
        <div>
          <p className="eyebrow">Contact</p>
          <p>hello@shkeeno.com</p>
        </div>
        <div>
          <p className="eyebrow">Future sections</p>
          <p>Home / About / Portfolio / New in / Pre-order / Sale</p>
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
          so we can swap it later for a proper CMS or password gate.
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
            <option value={fontOptions.modern}>Manrope</option>
            <option value={fontOptions.refined}>DM Sans</option>
            <option value={fontOptions.classic}>Instrument Serif</option>
            <option value={fontOptions.editorial}>Cormorant Garamond</option>
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
            <option value={fontOptions.modern}>Manrope</option>
            <option value={fontOptions.refined}>DM Sans</option>
            <option value={fontOptions.classic}>Instrument Serif</option>
          </select>
        </div>

        <div className="preview-tile">
          <p className="eyebrow">Live preview notes</p>
          <h2>These controls update the public site immediately on this device.</h2>
          <p>
            Next step can be storing the theme in a small backend or content
            file so publishing makes it canonical.
          </p>
          <button type="button" className="button button-solid" onClick={() => setTheme(defaultTheme)}>
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
