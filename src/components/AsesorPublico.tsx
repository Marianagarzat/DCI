import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Perfil = {
  display_name: string
  bio: string
  whatsapp: string | null
}

type Resultado =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; perfil: Perfil | null }

type Props = {
  propiedadId: string
  titulo: string
}

export default function AsesorPublico({ propiedadId, titulo }: Props) {
  const [resultado, setResultado] = useState<Resultado>({ estado: 'cargando' })

  const [foto, setFoto] = useState('')

  useEffect(() => {
    let vigente = true
    setFoto('')
    setResultado({ estado: 'cargando' })

    async function cargar() {
      try {
        const { data, error } = await supabase.rpc('dci_get_public_agent', {
          p_property_id: propiedadId
        }).maybeSingle()

        if (!vigente) return
        if (error) throw error
        setResultado({ estado: 'listo', perfil: data as Perfil | null })
        if (data) void cargarFoto()
      } catch (error) {
        if (!vigente) return
        console.error('Error al consultar asesor público:', error)
        setResultado({ estado: 'error' })
      }
    }

    async function cargarFoto() {
      try {
        const { data: ruta, error } = await supabase.rpc('dci_get_public_agent_photo', {
          p_property_id: propiedadId
        })
        if (error) throw error
        if (!vigente || typeof ruta !== 'string' || !ruta) return

        const { data, error: errorFoto } = await supabase.storage
          .from('agent-photos')
          .createSignedUrl(ruta, 300)
        if (errorFoto) throw errorFoto
        if (vigente && data?.signedUrl) setFoto(data.signedUrl)
      } catch (error) {
        if (vigente) {
          console.error('Error al consultar fotografía del asesor:', error)
          setFoto('')
        }
      }
    }

    void cargar()
    return () => { vigente = false }
  }, [propiedadId])

  if (resultado.estado === 'cargando') {
    return <p role="status">Cargando información del asesor…</p>
  }

  if (resultado.estado === 'error') {
    return <p role="status">No pudimos consultar al asesor. Puedes usar el formulario de contacto.</p>
  }

  const perfil = resultado.perfil
  if (!perfil) return null

  const iniciales = perfil.display_name.trim().split(/\s+/).slice(0, 2)
    .map(palabra => palabra.charAt(0).toUpperCase()).join('')
  const numero = perfil.whatsapp
  const mensaje = `Hola, me interesa la propiedad "${titulo}" de DCI. ¿Podrías darme más información?`
  const enlace = numero && /^[1-9][0-9]{7,14}$/.test(numero)
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    : null

  return (
    <section className="dci-public-agent" aria-label="Asesor inmobiliario">
      <span className="dci-public-kicker">TU ASESOR INMOBILIARIO</span>
      <div className="dci-public-agent-head">
        {foto ? (
          <div className="dci-public-agent-avatar" style={{ overflow: 'hidden' }}>
            <img
              src={foto}
              alt={`Fotografía de ${perfil.display_name}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }}
              onError={() => setFoto('')}
            />
          </div>
        ) : (
          <div className="dci-public-agent-avatar" aria-hidden="true">{iniciales}</div>
        )}
        <div>
          <h3>{perfil.display_name}</h3>
          <p className="dci-public-agent-role">Asesor inmobiliario DCI</p>
        </div>
      </div>
      {perfil.bio && <p className="dci-public-agent-bio">{perfil.bio}</p>}
      {enlace ? (
        <a className="dci-public-whatsapp" href={enlace} target="_blank" rel="noopener noreferrer">
          Contactar por WhatsApp
        </a>
      ) : (
        <p>Solicita más información mediante el formulario de contacto.</p>
      )}
    </section>
  )
}
