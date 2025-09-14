import React, { useEffect, useState } from 'react'
import Login from './Login.jsx'
import Notes from './Notes.jsx'
import Nav from './Nav.jsx'

function getSession() {
  const raw = localStorage.getItem('session')
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

function setSession(s) {
  if (!s) localStorage.removeItem('session')
  else localStorage.setItem('session', JSON.stringify(s))
}

export default function App() {
  const [session, setSess] = useState(getSession())

  useEffect(() => { setSession(session) }, [session])

  if (!session) {
    return <Login onLogin={setSess} />
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <Nav onLogout={() => setSess(null)} role={session.role} />
      <Notes session={session} onLogout={() => setSess(null)} />
    </div>
  )
}
