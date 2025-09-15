import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'

export default function Notes({ session, onLogout }) {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const headers = useMemo(() => ({ Authorization: `Bearer ${session.token}` }), [session])

  const load = async () => {
    setError('')
    try {
      const res = await api('/notes', { headers })
      setNotes(res)
    } catch (e) {
      if (e.status === 401) onLogout()
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await api('/notes', { method: 'POST', headers, body: { title, content } })
      setTitle('')
      setContent('')
      setNotes([res, ...notes])
    } catch (e) {
      if (e.status === 402 && e.data?.error === 'note_limit_reached') {
        setMessage('Free plan limit reached. Upgrade to Pro to add more notes.')
      } else {
        setError(e.message)
      }
    }
  }

  const del = async (id) => {
    await api(`/notes/${id}`, { method: 'DELETE', headers })
    setNotes(notes.filter(n => n._id !== id))
  }

  const upgrade = async () => {
    try {
      const payload = parseJwt(session.token)
      const slug = payload.tenantSlug
      await api(`/tenants/${slug}/upgrade`, { method: 'POST', headers })
      setMessage('Upgraded to Pro. You can now add unlimited notes.')
    } catch (e) {
      setError(e.message)
    }
  }

  const downgrade = async () => {
    try {
      const payload = parseJwt(session.token)
      const slug = payload.tenantSlug
      await api(`/tenants/${slug}/downgrade`, { method: 'POST', headers })
      setMessage('Downgraded to Free. Limit is now 3 notes.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="container">
      <div className="grid grid-2">
        <div className="card">
          <h2>Notes</h2>
          <p className="muted small">Create and manage your notes</p>

          {message && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>{message}</div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
          )}

          <form onSubmit={create} style={{ marginTop: 12 }}>
            <div className="row">
              <label>Title</label>
              <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="row">
              <label>Content</label>
              <input className="input" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit">Add note</button>
              {/* {message && message.includes('Upgrade') && (
                <button className="btn btn-upgrade" type="button" onClick={upgrade}>Upgrade to Pro</button>
              )} */}
            </div>
          </form>
        </div>


      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Your notes</h3>
          {session.role === 'admin' && (
            <div className="actions">
              <button className="btn btn-upgrade" type="button" onClick={upgrade}>Upgrade</button>
              <button className="btn btn-ghost" type="button" onClick={downgrade}>Downgrade</button>
            </div>
          )}
        </div>
        <div className="notes-grid" style={{ marginTop: 12 }}>
          {notes.map(n => (
            <NoteCard key={n._id} note={n} onDelete={() => del(n._id)} onSave={async (title, content) => {
              const updated = await api(`/notes/${n._id}`, { method: 'PUT', headers, body: { title, content } })
              setNotes(prev => prev.map(x => x._id === n._id ? updated : x))
            }} />
          ))}
          {notes.length === 0 && <div className="muted small">No notes yet.</div>}
        </div>
      </div>
    </div>
  )
}

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

function NoteCard({ note, onDelete, onSave }) {
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(note.title)
  const [content, setContent] = React.useState(note.content)

  const save = async () => {
    await onSave(title, content)
    setEditing(false)
  }

  return (
    <div className="card note">
      {editing ? (
        <>
          <input className="input" style={{ marginBottom: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn btn-ghost" onClick={() => { setTitle(note.title); setContent(note.content); setEditing(false) }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="note-title">{note.title}</div>
          <div className="note-content">{note.content}</div>
          <div className="actions" style={{ position: 'absolute', right: 10, top: 10, gap: 6 }}>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-danger" onClick={onDelete}>Delete</button>
          </div>
        </>
      )}
    </div>
  )
}