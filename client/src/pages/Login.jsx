import React, { useState } from 'react'
import { api } from '../services/api.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const useDemo = (addr) => { setEmail(addr); setPassword('password') }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      onLogin(res)
    } catch (e) {
      setError(e.message || 'Login failed')
    }
  }

  return (
    <div className="center">
      <div className="card auth-card">
        <h2 style={{marginTop:0}}>Welcome back</h2>
        <p className="muted small" style={{marginTop:4}}>Sign in to your workspace</p>

        <form onSubmit={submit} style={{marginTop:16}}>
          <div className="row">
            <label>Email</label>
            <input className="input" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="row">
            <label>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert alert-error" style={{marginBottom:12}}>{error}</div>}
          <div className="actions">
            <button className="btn btn-primary" type="submit">Sign in</button>
            <span className="muted small">password: password</span>
          </div>
        </form>

        <div className="card" style={{marginTop:16}}>
          <h3 className="small" style={{marginTop:0}}>Quick demo logins</h3>
          <div className="actions" style={{flexWrap:'wrap'}}>
            <button className="btn btn-ghost" onClick={() => useDemo('admin@acme.test')}>admin@acme.test</button>
            <button className="btn btn-ghost" onClick={() => useDemo('user@acme.test')}>user@acme.test</button>
            <button className="btn btn-ghost" onClick={() => useDemo('admin@globex.test')}>admin@globex.test</button>
            <button className="btn btn-ghost" onClick={() => useDemo('user@globex.test')}>user@globex.test</button>
          </div>
        </div>
      </div>
    </div>
  )
}
