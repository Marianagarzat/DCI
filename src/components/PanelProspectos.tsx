import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Estado = 'new' | 'contacted' | 'qualified' | 'closed'

type Propiedad = {
  title: string
}

type Prospecto = {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  status: Estado
  agent_id: string | null
  created_at: string
  properties: Propiedad | Propiedad[] | null
}

const estados: { valor: Estado; nombre: string }[] = [
  { valor: 'new', nombre: 'Nuevo' },
  { valor: 'contacted', nombre: 'Contactado' },
  { valor: 'qualified', nombre: 'Calificado' },
  { valor: 'closed', nombre: 'Cerrado' }
]

export default function PanelProspectos() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    setMensaje('')

    const { data, error: errorConsulta } = await supabase
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

    if (errorConsulta) {
      setError('No se pudieron cargar los prospectos: ' + errorConsulta.message)
    } else {
      setProspectos((data ?? []) as Prospecto[])
    }

    setCargando(false)
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function cambiarEstado(id: string, estado: Estado) {
    setActualizando(id)
    setError('')
    setMensaje('')

    try {
      const { error: errorCambio } = await supabase.rpc(
        'dci_change_lead_status',
        {
          p_lead_id: id,
          p_status: estado
        }
      )

      if (errorCambio) {
        setError('No se pudo cambiar el estado: ' + errorCambio.message)
        return
      }

      setProspectos((anteriores) =>
        anteriores.map((p) =>
          p.id === id ? { ...p, status: estado } : p
        )
      )
      setMensaje('Estado actualizado correctamente.')
    } catch {
      setError('Error de conexión. Intenta otra vez.')
    } finally {
      setActualizando(null)
    }
  }

  return (
    <section>
      <h2>Prospectos</h2>
      <p>Personas interesadas en las propiedades de DCI.</p>

      <button
        type="button"
        onClick={() => void cargar()}
        disabled={cargando || actualizando !== null}
      >
        {cargando ? 'Cargando...' : 'Actualizar prospectos'}
      </button>

      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}
      {cargando && <p>Cargando prospectos...</p>}

      {!cargando && !error && prospectos.length === 0 && (
        <p>No hay prospectos para mostrar.</p>
      )}

      {!cargando && prospectos.map((p) => {
        const propiedad = Array.isArray(p.properties)
          ? p.properties[0]?.title
          : p.properties?.title

        return (
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

            <div>
              <label htmlFor={`estado-${p.id}`}>
                <strong>Estado: </strong>
              </label>
              <select
                id={`estado-${p.id}`}
                value={p.status}
                disabled={actualizando !== null}
                onChange={(e) => {
                  void cambiarEstado(p.id, e.target.value as Estado)
                }}
              >
                {estados.map((estado) => (
                  <option key={estado.valor} value={estado.valor}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
              {actualizando === p.id && <span> Guardando...</span>}
            </div>

            <p><strong>Propiedad:</strong> {propiedad ?? 'Sin información'}</p>
            <p><strong>Correo:</strong> {p.email ?? 'No proporcionado'}</p>
            <p><strong>Teléfono:</strong> {p.phone ?? 'No proporcionado'}</p>
            <p><strong>Mensaje:</strong> {p.message ?? 'Sin mensaje'}</p>
            <p><strong>Asesor:</strong> {p.agent_id ? 'Asignado' : 'Sin asignar'}</p>
            <small>
              Recibido: {new Date(p.created_at).toLocaleString('es-MX')}
            </small>
          </article>
        )
      })}
    </section>
  )
}
