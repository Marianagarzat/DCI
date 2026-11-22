
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Prospecto = {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  status: string
  agent_id: string | null
  created_at: string
  properties: { title: string } | { title: string }[] | null
}

export default function PanelProspectos() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        message,
        status,
        agent_id,
        created_at,
        properties(title)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }

    setProspectos((data ?? []) as Prospecto[])
    setCargando(false)
  }

  useEffect(() => {
    void cargar()
  }, [])

  function nombreEstado(estado: string) {
    if (estado === 'new') return 'Nuevo'
    if (estado === 'contacted') return 'Contactado'
    if (estado === 'qualified') return 'Calificado'
    if (estado === 'closed') return 'Cerrado'
    return estado
  }

  return (
    <section>
      <h2>Prospectos</h2>

      <p>
        Personas interesadas en las propiedades de DCI.
      </p>

      <button onClick={cargar} disabled={cargando}>
        Actualizar prospectos
      </button>

      {cargando && <p>Cargando prospectos...</p>}

      {error && (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}

      {!cargando && !error && prospectos.length === 0 && (
        <p>No hay prospectos para mostrar.</p>
      )}

      {!cargando && !error && prospectos.map((p) => (
        <article
          key={p.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: '10px',
            padding: '16px',
            marginTop: '16px'
          }}
        >
          <h3>{p.name}</h3>

          <p>
            <strong>Estado:</strong> {nombreEstado(p.status)}
          </p>

          <p>
            <strong>Propiedad:</strong>{' '}
            {Array.isArray(p.properties)
  ? (p.properties[0]?.title ?? 'Sin información')
  : (p.properties?.title ?? 'Sin información')}
          </p>

          <p>
            <strong>Correo:</strong>{' '}
            {p.email ?? 'No proporcionado'}
          </p>

          <p>
            <strong>Teléfono:</strong>{' '}
            {p.phone ?? 'No proporcionado'}
          </p>

          <p>
            <strong>Mensaje:</strong>{' '}
            {p.message ?? 'Sin mensaje'}
          </p>

          <p>
            <strong>Asesor:</strong>{' '}
            {p.agent_id ? 'Asignado' : 'Sin asignar'}
          </p>

          <small>
            Recibido:{' '}
            {new Date(p.created_at).toLocaleString('es-MX')}
          </small>
        </article>
      ))}
    </section>
  )
}
