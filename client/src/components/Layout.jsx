import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/questions', label: 'Questions' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/plan', label: 'Prep Plan' },
  { to: '/admin', label: 'Admin' },
]

function Layout() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="brand">
            TechPrep
          </NavLink>
          <nav className="nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/login" className="button">
            Log in
          </NavLink>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
