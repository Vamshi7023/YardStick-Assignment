import React from 'react'

export default function Nav({ onLogout, role }) {
  return (
    <div className="topbar container">
      <div className="brand">
        <span className="dot" />
        <span>SaaS Notes</span>
        <span className="badge small">Multi-tenant</span>
      </div>
      <div className="actions">
        <span className="badge">Role: {role}</span>
        <button className="btn btn-ghost" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
