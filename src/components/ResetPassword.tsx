
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

function ResetPassword() {
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (pass.length < 12) {
      setMsg('Usa al menos 12 caracteres.')
      return
    }

    setLoading(true)
    setMsg('')

    const { error } = await supabase.auth.updateUser({
      password: pass
    })

    if (error) {
      setMsg('No se pudo cambiar: ' + error.message)
    } else {
      setMsg('Contraseña actualizada correctamente.')
      setPass('')
    }

    setLoading(false)
  }

  return (
    <main>
      <h1>DCI - Recuperar contraseña</h1>

      <form onSubmit={guardar}>
        <label htmlFor="pass">Nueva contraseña</label>

        <input
          id="pass"
          type="password"
          autoComplete="new-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>

      {msg && <p role="status">{msg}</p>}
    </main>
  )
}

export default ResetPassword
