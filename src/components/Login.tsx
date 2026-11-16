
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PanelAsesor from './PanelAsesor'

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [perfil, setPerfil] = useState<{
  id: string
  name: string
  role: string
} | null>(null)

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // iniciar sesion
  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    })

    if (error || !data.user) {
      setMsg('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    const { data: p, error: err } = await supabase
      .from('profiles')
      .select('name, role, active')
      .eq('id', data.user.id)
      .single()

    if (err || !p || !p.active) {
      await supabase.auth.signOut({ scope: 'local' })
      setMsg('Esta cuenta no tiene acceso autorizado.')
      setLoading(false)
      return
    }

    setPerfil({
  id: data.user.id,
  name: p.name,
  role: p.role
})

    setPass('')
    setLoading(false)
  }

  // recuperar contraseña
  async function recuperar() {
    if (!email.trim()) {
      setMsg('Primero escribe tu correo electrónico.')
      return
    }

    setLoading(true)
    setMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`
      }
    )

    if (error) {
      console.error(error)
      setMsg('No se pudo enviar: ' + error.message)
    } else {
      setMsg('Si la cuenta existe, recibirás un correo de recuperación.')
    }

    setLoading(false)
  }

  // cerrar sesion
  async function salir() {
    const { error } = await supabase.auth.signOut({
      scope: 'local'
    })

    if (error) {
      setMsg('No se pudo cerrar la sesión.')
      return
    }

    setPerfil(null)
    setEmail('')
    setPass('')
    setMsg('')
  }

  
if (perfil) {
  return (
    <section>
      <h2>Bienvenido, {perfil.name}</h2>
      <p>Tu rol es: {perfil.role}</p>

      <button onClick={salir}>
        Cerrar sesión
      </button>

      {perfil.role === 'agent' && (
        <PanelAsesor uid={perfil.id} />
      )}
    </section>
  )
}


  return (
    <section>
      <h2>Acceso privado DCI</h2>

      <form onSubmit={entrar}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Procesando...' : 'Iniciar sesión'}
        </button>
      </form>

      <button
        type="button"
        onClick={recuperar}
        disabled={loading}
      >
        Olvidé mi contraseña
      </button>

      {msg && <p role="alert">{msg}</p>}
    </section>
  )
}

export default Login
