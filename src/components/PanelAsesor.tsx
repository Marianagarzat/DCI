
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Casa = {
  id: string
  title: string
  description: string | null
  price: number
  city: string
  zone: string
  status: string
  published: boolean
}

function PanelAsesor({ uid }: { uid: string }) {
  const [casas, setCasas] = useState<Casa[]>([])
  const [editando, setEditando] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [msg, setMsg] = useState('')

  // cargar propiedades asignadas al asesor
  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select('id, title, description, price, city, zone, status, published')
      .eq('agent_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error(error)
      setMsg('Error al cargar propiedades: ' + error.message)
    } else {
      setCasas(data ?? [])

      if (!data?.length) {
        setMsg('No tienes propiedades asignadas.')
      }
    }

    setLoading(false)
  }

  // abrir el formulario de edicion
  function editar(casa: Casa) {
    setEditando(casa.id)
    setTitulo(casa.title)
    setPrecio(String(casa.price))
    setDescripcion(casa.description ?? '')
    setMsg('')
  }

  // guardar cambios de una propiedad
  async function guardar(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()

    const valor = Number(precio)

    if (!titulo.trim() || !Number.isFinite(valor) || valor <= 0) {
      setMsg('Escribe un título y un precio válido.')
      return
    }

    setGuardando(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .update({
        title: titulo.trim(),
        price: valor,
        description: descripcion.trim()
      })
      .eq('id', id)
      .eq('agent_id', uid)
      .select('id, title, price, description')
      .maybeSingle()

    if (error) {
      console.error(error)
      setMsg('Error al guardar: ' + error.message)
    } else if (!data) {
      setMsg('No se modificó la propiedad. Revisa tus permisos.')
    } else {
      setCasas((prev) =>
        prev.map((casa) =>
          casa.id === id
            ? {
                ...casa,
                title: data.title,
                price: data.price,
                description: data.description
              }
            : casa
        )
      )

      setEditando(null)
      setMsg('Cambios guardados correctamente.')
    }

    setGuardando(false)
  }

  // comprobar que un asesor no edite propiedades ajenas
  async function probarSeguridad() {
    setProbando(true)
    setMsg('Comprobando permisos...')

    try {
      // confirmar que la sesion es de un asesor activo
      const { data: sesion, error: authError } =
        await supabase.auth.getUser()

      if (authError || !sesion.user || sesion.user.id !== uid) {
        setMsg('No se pudo verificar la sesión del asesor.')
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('profiles')
        .select('role, active')
        .eq('id', uid)
        .maybeSingle()

      if (perfilError || perfil?.role !== 'agent' || !perfil.active) {
        setMsg('Esta prueba requiere una cuenta de asesor activa.')
        return
      }

      // buscar la propiedad publica de prueba
      const { data: otra, error: buscarError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('title', 'TEST - Casa pública')
        .is('agent_id', null)
        .maybeSingle()

      if (buscarError) {
        console.error(buscarError)
        setMsg('Error al buscar la propiedad de prueba.')
        return
      }

      if (!otra) {
        setMsg('No se encontró TEST - Casa pública.')
        return
      }

      // intentar editar una propiedad no asignada
      // enviamos su titulo actual
      const { data, error } = await supabase
        .from('properties')
        .update({ title: otra.title })
        .eq('id', otra.id)
        .select('id')

      if (error) {
        if (error.code === '42501') {
          setMsg('Prueba correcta: Supabase bloqueó la edición.')
        } else {
          console.error(error)
          setMsg('Error inesperado. Revisa la consola.')
        }
        return
      }

      if (data?.length === 0) {
        setMsg('Prueba correcta: 0 propiedades modificadas.')
      } else {
        setMsg('ALERTA: se permitió editar una propiedad ajena.')
      }
    } catch (error) {
      console.error(error)
      setMsg('Ocurrió un error durante la prueba.')
    } finally {
      setProbando(false)
    }
  }

  return (
    <section style={{ padding: '20px' }}>
      <h2>Panel del asesor</h2>
      <p>Mis propiedades asignadas</p>

      <button onClick={cargar} disabled={loading}>
        {loading ? 'Cargando...' : 'Cargar mis propiedades'}
      </button>

      <button
        type="button"
        onClick={probarSeguridad}
        disabled={probando}
        style={{ marginLeft: '10px' }}
      >
        {probando ? 'Probando...' : 'Probar seguridad'}
      </button>

      {msg && <p role="status">{msg}</p>}

      {casas.map((casa) => (
        <article
          key={casa.id}
          style={{
            border: '1px solid #777',
            padding: '15px',
            marginTop: '15px'
          }}
        >
          {editando === casa.id ? (
            <form onSubmit={(e) => guardar(e, casa.id)}>
              <h3>Editar propiedad</h3>

              <div>
                <label htmlFor="titulo">Título</label>
                <input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="precio">Precio (MXN)</label>
                <input
                  id="precio"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  placeholder="Describe la propiedad..."
                />
              </div>

              <button type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <h3>{casa.title}</h3>

              <p>{casa.city} - {casa.zone}</p>

              {casa.description && (
                <p>{casa.description}</p>
              )}

              <p>
                {casa.price.toLocaleString('es-MX', {
                  style: 'currency',
                  currency: 'MXN'
                })}
              </p>

              <p>Estado: {casa.status}</p>

              <p>
                {casa.published ? 'Publicada' : 'No publicada'}
              </p>

              <button onClick={() => editar(casa)}>
                Editar propiedad
              </button>
            </>
          )}
        </article>
      ))}
    </section>
  )
}

export default PanelAsesor
