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
  notes: string | null
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
  const [guardandoNotas, setGuardandoNotas] = useState<string | null>(null)
  const [borradores, setBorradores] = useState<Record<string, string>>({})
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
        notes,
        agent_id,
        created_at,
        properties(title)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (errorConsulta) {
      setError('No se pudieron cargar los prospectos: ' + errorConsulta.message)
    } else {
      const encontrados = (data ?? []) as Prospecto[]
      setProspectos(encontrados)
      setBorradores(Object.fromEntries(
        encontrados.map((p) => [p.id, p.notes ?? ''])
      ))
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

  async function guardarNotas(id: string) {
    const notas = (borradores[id] ?? '').trim()

    if (notas.length > 2000) {
      setError('Las notas no pueden superar los 2000 caracteres.')
      return
    }

    setGuardandoNotas(id)
    setError('')
    setMensaje('')

    try {
      const { error: errorNotas } = await supabase.rpc(
        'dci_update_lead_notes',
        {
          p_lead_id: id,
          p_notes: notas
        }
      )

      if (errorNotas) {
        setError('No se pudieron guardar las notas: ' + errorNotas.message)
        return
      }

      setProspectos((anteriores) =>
        anteriores.map((p) =>
          p.id === id ? { ...p, notes: notas } : p
        )
      )
      setBorradores((anteriores) => ({ ...anteriores, [id]: notas }))
      setMensaje('Notas guardadas correctamente.')
    } catch {
      setError('Error de conexión al guardar las notas.')
    } finally {
      setGuardandoNotas(null)
    }
  }

  return (
    <section>
      <h2>Prospectos</h2>
      <p>Personas interesadas en las propiedades de DCI.</p>

      <button
        type="button"
        onClick={() => void cargar()}
        disabled={cargando || actualizando !== null || guardandoNotas !== null}
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
                disabled={actualizando !== null || guardandoNotas !== null}
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

            <div style={{ marginTop: '16px' }}>
              <label htmlFor={`notas-${p.id}`}>
                <strong>Notas de seguimiento</strong>
              </label>
              <br />
              <textarea
                id={`notas-${p.id}`}
                value={borradores[p.id] ?? ''}
                onChange={(e) =>
                  setBorradores((anteriores) => ({
                    ...anteriores,
                    [p.id]: e.target.value
                  }))
                }
                placeholder="Ej. Contacté al cliente; pendiente confirmar visita."
                rows={3}
                maxLength={2000}
                disabled={guardandoNotas !== null || actualizando !== null}
                style={{ width: '100%', maxWidth: '520px', boxSizing: 'border-box' }}
              />
              <br />
              <small>{(borradores[p.id] ?? '').length}/2000 caracteres</small>
              <br />
              <button
                type="button"
                disabled={
                  guardandoNotas !== null ||
                  actualizando !== null ||
                  (borradores[p.id] ?? '').trim() === (p.notes ?? '')
                }
                onClick={() => void guardarNotas(p.id)}
              >
                {guardandoNotas === p.id ? 'Guardando notas...' : 'Guardar notas'}
              </button>
            </div>

            <small>
              Recibido: {new Date(p.created_at).toLocaleString('es-MX')}
            </small>
          </article>
        )
      })}
    </section>
  )
}
