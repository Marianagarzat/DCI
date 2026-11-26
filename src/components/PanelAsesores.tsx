import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import SubirFotoAsesor from './SubirFotoAsesor'

type Perfil = {
  agent_id: string
  account_name: string
  display_name: string
  bio: string
  whatsapp: string | null
  published: boolean
}

function TarjetaAsesor({ perfil }: { perfil: Perfil }) {
  const [nombre, setNombre] = useState(perfil.display_name)
  const [bio, setBio] = useState(perfil.bio)
  const [whatsapp, setWhatsapp] = useState(perfil.whatsapp ?? '')
  const [publicado, setPublicado] = useState(perfil.published)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState(false)
  const id = perfil.agent_id

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (guardando) return
    setMsg('')
    setError(false)
    const limpio = whatsapp.replace(/[+ ()-]/g, '')

    if (nombre.trim().length < 2 || nombre.trim().length > 100) {
      setError(true)
      setMsg('El nombre debe tener entre 2 y 100 caracteres.')
      return
    }
    if (limpio && !/^[1-9][0-9]{7,14}$/.test(limpio)) {
      setError(true)
      setMsg('Ingresa un número con código de país, sin extensiones.')
      return
    }

    setGuardando(true)
    try {
      const { error } = await supabase.rpc('dci_save_agent_profile', {
        p_agent_id: id,
        p_display_name: nombre.trim(),
        p_bio: bio.trim(),
        p_whatsapp: limpio || null,
        p_published: publicado
      })
      if (error) throw error
      setNombre(nombre.trim())
      setBio(bio.trim())
      setWhatsapp(limpio)
      setMsg('Perfil guardado correctamente.')
    } catch (err) {
      console.error(err)
      setError(true)
      setMsg('No se pudo guardar el perfil. Revisa tus permisos o intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
    <form className="dci-admin-property-form" onSubmit={guardar}>
      <h3 style={{ color: '#14243a', marginTop: 0 }}>{perfil.account_name}</h3>
      <p style={{ color: '#52637b', fontSize: '13px' }}>
        Cuenta del asesor · Información profesional pública
      </p>
      <div>
        <label htmlFor={`nombre-${id}`}>Nombre profesional</label>
        <input id={`nombre-${id}`} value={nombre} onChange={e => setNombre(e.target.value)} minLength={2} maxLength={100} required disabled={guardando} />
      </div>
      <div>
        <label htmlFor={`bio-${id}`}>Descripción profesional</label>
        <textarea id={`bio-${id}`} value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={1000} disabled={guardando} />
      </div>
      <div>
        <label htmlFor={`whatsapp-${id}`}>WhatsApp comercial (con código de país)</label>
        <input id={`whatsapp-${id}`} type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+52 ..." maxLength={30} disabled={guardando} />
        <small style={{ color: '#52637b' }}>Opcional. Usa únicamente un número comercial autorizado para publicarse.</small>
      </div>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={publicado} onChange={e => setPublicado(e.target.checked)} disabled={guardando} style={{ width: 'auto' }} />
          Publicar perfil en el catálogo
        </label>
        <small style={{ color: '#52637b' }}>Al guardar, estos datos podrán ser consultados públicamente si el asesor tiene una propiedad publicada y elegible.</small>
      </div>
      <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar perfil'}</button>
      {msg && <p role="status" style={{ color: error ? '#a52727' : '#21633f' }}>{msg}</p>}
    </form>
    <SubirFotoAsesor asesorId={id} />
    </div>
  )
}

export default function PanelAsesores() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const { data, error } = await supabase.rpc('dci_list_agent_profiles')
        if (error) throw error
        if (vigente) setPerfiles((data ?? []) as Perfil[])
      } catch (err) {
        console.error(err)
        if (vigente) setError('No se pudieron cargar los perfiles. Revisa tus permisos o intenta nuevamente.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [version])

  function actualizar() {
    if (!window.confirm('¿Actualizar la lista? Se perderán los cambios que no hayas guardado.')) return
    setCargando(true)
    setError('')
    setVersion(prev => prev + 1)
  }

  return (
    <section className="dci-admin-inventory" aria-busy={cargando}>
      <button type="button" onClick={actualizar} disabled={cargando}>Actualizar asesores</button>
      {cargando && <p role="status">Cargando asesores...</p>}
      {error && <p role="alert" style={{ color: '#a52727' }}>{error}</p>}
      {!cargando && !error && perfiles.length === 0 && <p>No hay asesores activos.</p>}
      {!cargando && !error && perfiles.map(perfil => <TarjetaAsesor key={perfil.agent_id} perfil={perfil} />)}
    </section>
  )
}
