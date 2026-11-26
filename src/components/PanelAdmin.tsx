import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import SubirFotos from './SubirFotos'
import PanelProspectos from './PanelProspectos'
import PanelAsesores from './PanelAsesores'
import './PanelAdmin.css'

type Casa = {
  id: string
  title: string
  price: number
  city: string | null
  zone: string | null
  status: string
  published: boolean
  featured: boolean
  agent_id: string | null
}

type Asesor = {
  id: string
  name: string
}

function PanelAdmin() {
  const [seccion, setSeccion] = useState<'inventario' | 'prospectos' | 'asesores'>('inventario')
  const [casas, setCasas] = useState<Casa[]>([])
  const [asesores, setAsesores] = useState<Asesor[]>([])

  const [mostrar, setMostrar] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [operacion, setOperacion] = useState('sale')
  const [tipo, setTipo] = useState('house')
  const [ciudad, setCiudad] = useState('')
  const [zona, setZona] = useState('')
  const [asesor, setAsesor] = useState('')

  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [elegidos, setElegidos] = useState<Record<string, string>>({})
  const [asignando, setAsignando] = useState<string | null>(null)
  const [publicando, setPublicando] = useState<string | null>(null)
  const [destacando, setDestacando] = useState<string | null>(null)

  // cargar el inventario
  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, title, price, city, zone,
        status, published, featured, agent_id
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
      setMsg('Error al cargar propiedades: ' + error.message)
    } else {
      setCasas(data ?? [])

      if (!data?.length) {
        setMsg('No hay propiedades para mostrar.')
      }
    }

const { data: agentes, error: errorAgentes } = await supabase
  .from('profiles')
  .select('id, name')
  .eq('role', 'agent')
  .eq('active', true)
  .order('name')

if (errorAgentes) {
  console.error(errorAgentes)
  setMsg('Error al cargar asesores: ' + errorAgentes.message)
} else {
  setAsesores(agentes ?? [])
}

    setLoading(false)
  }

  // abrir formulario y buscar asesores activos
  async function nuevo() {
    setMsg('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'agent')
      .eq('active', true)
      .order('name')

    if (error) {
      console.error(error)
      setMsg('Error al cargar asesores: ' + error.message)
      return
    }

    setAsesores(data ?? [])
    setMostrar(true)
  }

  // guardar una propiedad nueva
  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const valor = Number(precio)

    if (
      !titulo.trim() ||
      !ciudad.trim() ||
      !tipo.trim() ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      setMsg('Revisa el título, ciudad, tipo y precio.')
      return
    }

    setGuardando(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .insert({
        title: titulo.trim(),
        description: descripcion.trim(),
        price: valor,
        operation: operacion,
        type: tipo,
        city: ciudad.trim(),
        zone: zona.trim(),
        agent_id: asesor || null,
        status: 'available',
        published: false,
        featured: false
      })
      .select('id, title')
      .single()

    if (error) {
      console.error(error)
      setMsg('Error al crear propiedad: ' + error.message)
      setGuardando(false)
      return
    }

    if (!data) {
      setMsg('No se pudo confirmar que se creó la propiedad.')
      setGuardando(false)
      return
    }

    // limpiar el formulario
    setTitulo('')
    setPrecio('')
    setDescripcion('')
    setOperacion('sale')
    setTipo('house')
    setCiudad('')
    setZona('')
    setAsesor('')
    setMostrar(false)

    // actualizar inventario
    await cargar()

    setMsg('Propiedad creada correctamente como borrador.')
    setGuardando(false)
  }

  async function asignar(casa: Casa) {
    const elegido = elegidos[casa.id] ?? casa.agent_id ?? ''

    setAsignando(casa.id)
    setMsg('')

    const { error } = await supabase.rpc('dci_assign_property', {
      p_property_id: casa.id,
      p_agent_id: elegido || null
    })

    if (error) {
      console.error(error)
      setMsg('Error al asignar asesor: ' + error.message)
    } else {
      setCasas((prev) =>
        prev.map((c) =>
          c.id === casa.id
            ? { ...c, agent_id: elegido || null }
            : c
        )
      )

      setMsg('Asesor actualizado correctamente.')
    }

    setAsignando(null)
  }


  // publicar o retirar una propiedad del catalogo publico
  async function cambiarPublicacion(casa: Casa) {
    const accion = casa.published ? 'despublicar' : 'publicar'

    if (!window.confirm(`¿Seguro que deseas ${accion} "${casa.title}"?`)) {
      return
    }

    setPublicando(casa.id)
    setMsg('')

    try {
      const { error } = await supabase.rpc('dci_publish_property', {
        p_property_id: casa.id,
        p_published: !casa.published
      })

      if (error) {
        console.error(error)
        setMsg('Error al cambiar la publicación: ' + error.message)
        return
      }

      setCasas((prev) =>
        prev.map((c) =>
          c.id === casa.id
            ? { ...c, published: !casa.published }
            : c
        )
      )

      setMsg(casa.published
        ? 'Propiedad despublicada correctamente.'
        : 'Propiedad publicada correctamente.')
    } finally {
      setPublicando(null)
    }
  }

  // destacar o retirar una propiedad de la seleccion publica
  async function cambiarDestacada(casa: Casa) {
    if (destacando !== null) return

    const valor = !casa.featured
    setDestacando(casa.id)
    setMsg('')

    try {
      const { error } = await supabase.rpc('dci_feature_property', {
        p_property_id: casa.id,
        p_featured: valor
      })

      if (error) {
        setMsg('Error al actualizar destacados: ' + error.message)
        return
      }

      setCasas((prev) => prev.map((c) =>
        c.id === casa.id ? { ...c, featured: valor } : c
      ))
      setMsg(valor
        ? 'Propiedad destacada correctamente.'
        : 'Propiedad retirada de destacados.')
    } catch (error) {
      console.error(error)
      setMsg('No se pudo confirmar el cambio de destacados. Actualiza el inventario.')
    } finally {
      setDestacando(null)
    }
  }

  return (
    <section className="dci-admin">
      <aside className="dci-admin-sidebar">
        <div className="dci-admin-brand">
          <span className="dci-admin-logo">DCI</span>
          <div>
            <strong>Distrito Center</strong>
            <small>Inmuebles · Administración</small>
          </div>
        </div>
        <nav aria-label="Secciones del panel">
          <span className="dci-admin-nav-label">GESTIÓN</span>
          <button
            type="button"
            aria-pressed={seccion === 'inventario'}
            onClick={() => setSeccion('inventario')}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-8h6v8"/></svg>
            Inventario
          </button>
          <button
            type="button"
            aria-pressed={seccion === 'prospectos'}
            onClick={() => setSeccion('prospectos')}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/></svg>
            Prospectos
          </button>
          <button
            type="button"
            aria-pressed={seccion === 'asesores'}
            onClick={() => setSeccion('asesores')}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M6 18a6 6 0 0 1 12 0"/></svg>
            Asesores
          </button>
        </nav>
        <a className="dci-admin-catalogo" href="/">Ver catálogo público <span aria-hidden="true">↗</span></a>
      </aside>

      <div className="dci-admin-main">
        <header className="dci-admin-header">
          <span>DCI / ADMINISTRACIÓN</span>
          <h2>{seccion === 'inventario' ? 'Inventario de propiedades' : seccion === 'prospectos' ? 'Gestión de prospectos' : 'Gestión de asesores'}</h2>
          <p>{seccion === 'inventario'
            ? 'Administra tus inmuebles, publicaciones y asesores responsables.'
            : seccion === 'prospectos'
              ? 'Consulta y da seguimiento a los contactos de DCI.'
              : 'Configura los perfiles profesionales visibles en el catálogo.'}</p>
        </header>

        <div className="dci-admin-inventory" hidden={seccion !== 'inventario'}>

          <button
            type="button"
            onClick={cargar}
            disabled={loading || destacando !== null}
          >
            {loading ? 'Cargando...' : 'Ver todas las propiedades'}
          </button>

          <button
            type="button"
            onClick={nuevo}
            style={{ marginLeft: '10px' }}
          >
            + Agregar propiedad
          </button>

          {msg && <p role="status">{msg}</p>}

          {mostrar && (
            <form
              onSubmit={guardar}
              className="dci-admin-property-form"
            >
              <h3>Agregar nueva propiedad</h3>

              <div>
                <label htmlFor="nuevo-titulo">Título</label>
                <input
                  id="nuevo-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="TEST - Casa en San Pedro"
                  required
                />
              </div>

              <div>
                <label htmlFor="nuevo-precio">Precio (MXN)</label>
                <input
                  id="nuevo-precio"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="nuevo-operacion">Operación</label>
                <select
                  id="nuevo-operacion"
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value)}
                >
                  <option value="sale">Venta</option>
                  <option value="rent">Renta</option>
                </select>
              </div>

              <div>
                <label htmlFor="nuevo-tipo">Tipo de inmueble</label>
                <select
                  id="nuevo-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="house">Casa</option>
                  <option value="apartment">Departamento</option>
                  <option value="land">Terreno</option>
                  <option value="commercial">Local comercial</option>
                  <option value="office">Oficina</option>
                </select>
              </div>

              <div>
                <label htmlFor="nuevo-descripcion">
                  Descripción
                </label>
                <textarea
                  id="nuevo-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="Describe la propiedad..."
                />
              </div>

              <div>
                <label htmlFor="nuevo-ciudad">Ciudad</label>
                <input
                  id="nuevo-ciudad"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="nuevo-zona">Zona o colonia</label>
                <input
                  id="nuevo-zona"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="nuevo-asesor">
                  Asesor responsable
                </label>
                <select
                  id="nuevo-asesor"
                  value={asesor}
                  onChange={(e) => setAsesor(e.target.value)}
                >
                  <option value="">Sin asignar</option>

                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <p>
                La propiedad comenzará como borrador
                y no aparecerá en el catálogo público.
              </p>

              <button type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar propiedad'}
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => setMostrar(false)}
              >
                Cancelar
              </button>
            </form>
          )}

          <h3>Propiedades registradas</h3>

          {casas.map((casa) => (
            <article
        
              key={casa.id}
              className="dci-admin-property-card"
            >
              <h3>{casa.title}</h3>

              <p>{casa.city} - {casa.zone}</p>

              <p>
                {casa.price.toLocaleString('es-MX', {
                  style: 'currency',
                  currency: 'MXN'
                })}
              </p>

              <p>Estado: {casa.status}</p>

              <p>
                Publicación: {casa.published ? 'Publicada' : 'Borrador'}
              </p>

              <button
                type="button"
                onClick={() => cambiarPublicacion(casa)}
                disabled={publicando === casa.id}
              >
                {publicando === casa.id
                  ? 'Guardando...'
                  : casa.published
                    ? 'Despublicar propiedad'
                    : 'Publicar propiedad'}
              </button>

              <div style={{ marginTop: '12px' }}>
                <p>Destacada: {casa.featured ? 'Sí' : 'No'}</p>
                <button
                  type="button"
                  aria-pressed={casa.featured}
                  disabled={destacando !== null || loading || guardando}
                  onClick={() => cambiarDestacada(casa)}
                >
                  {destacando === casa.id
                    ? 'Guardando...'
                    : casa.featured
                      ? 'Quitar de destacados'
                      : '★ Destacar propiedad'}
                </button>
                {!casa.published && casa.featured && (
                  <p>Esta propiedad no será visible mientras sea borrador.</p>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                <label htmlFor={`asesor-${casa.id}`}>
                  Asesor responsable
                </label>

                <select
                  id={`asesor-${casa.id}`}
                  value={elegidos[casa.id] ?? casa.agent_id ?? ''}
                  onChange={(e) =>
                    setElegidos((prev) => ({
                      ...prev,
                      [casa.id]: e.target.value
                    }))
                  }
                >
                  <option value="">Sin asignar</option>

                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={asignando === casa.id}
                  onClick={() => asignar(casa)}
                >
                  {asignando === casa.id
                    ? 'Guardando...'
                    : 'Guardar asignación'}
                </button>
              </div>

              <SubirFotos propiedadId={casa.id} />
            </article>
          ))}

        </div>

        <div hidden={seccion !== 'prospectos'}>
          <PanelProspectos esAdmin={true} />
        </div>

        {seccion === 'asesores' && <PanelAsesores />}
      </div>
    </section>
  )
}

export default PanelAdmin
