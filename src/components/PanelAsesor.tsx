
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PanelProspectos from './PanelProspectos'

type Casa = {
  id: string
  title: string
  description: string | null
  price: number
  city: string | null
  zone: string | null
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  area_m2: number | null
  status: string
  published: boolean
}

function PanelAsesor({ uid }: { uid: string }) {
  const [casas, setCasas] = useState<Casa[]>([])
  const [editando, setEditando] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [zona, setZona] = useState('')
  const [habitaciones, setHabitaciones] = useState('')
  const [banos, setBanos] = useState('')
  const [estacionamientos, setEstacionamientos] = useState('')
  const [metros, setMetros] = useState('')

  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [msg, setMsg] = useState('')

  // cargar las propiedades asignadas
  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, title, description, price,
        city, zone, bedrooms, bathrooms,
        parking, area_m2, status, published
      `)
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

  // abrir el formulario con los datos actuales
  function editar(casa: Casa) {
    setEditando(casa.id)

    setTitulo(casa.title)
    setPrecio(String(casa.price))
    setDescripcion(casa.description ?? '')
    setCiudad(casa.city ?? '')
    setZona(casa.zone ?? '')
    setHabitaciones(String(casa.bedrooms ?? ''))
    setBanos(String(casa.bathrooms ?? ''))
    setEstacionamientos(String(casa.parking ?? ''))
    setMetros(String(casa.area_m2 ?? ''))

    setMsg('')
  }

  // convertir un campo numerico opcional
  function numero(valor: string) {
    if (valor.trim() === '') {
      return null
    }

    return Number(valor)
  }

  // guardar los cambios
  async function guardar(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()

    const valor = Number(precio)
    const hab = numero(habitaciones)
    const ban = numero(banos)
    const est = numero(estacionamientos)
    const area = numero(metros)

    if (
      !titulo.trim() ||
      !ciudad.trim() ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      setMsg('Revisa el título, ciudad y precio.')
      return
    }

    const cantidades = [hab, ban, est]

    if (
      cantidades.some(
        (n) => n !== null && (!Number.isInteger(n) || n < 0)
      )
    ) {
      setMsg('Habitaciones, baños y estacionamientos deben ser números enteros positivos o cero.')
      return
    }

    if (
      area !== null &&
      (!Number.isFinite(area) || area <= 0)
    ) {
      setMsg('Los metros cuadrados deben ser mayores que cero.')
      return
    }

    setGuardando(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .update({
        title: titulo.trim(),
        price: valor,
        description: descripcion.trim(),
        city: ciudad.trim(),
        zone: zona.trim(),
        bedrooms: hab,
        bathrooms: ban,
        parking: est,
        area_m2: area
      })
      .eq('id', id)
      .eq('agent_id', uid)
      .select(`
        id, title, price, description,
        city, zone, bedrooms, bathrooms,
        parking, area_m2
      `)
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
            ? { ...casa, ...data }
            : casa
        )
      )

      setEditando(null)
      setMsg('Cambios guardados correctamente.')
    }

    setGuardando(false)
  }

  // prueba temporal de permisos
  async function probarSeguridad() {
    setProbando(true)
    setMsg('Comprobando permisos...')

    try {
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
        setMsg('La prueba requiere una cuenta de asesor activa.')
        return
      }

      const { data: otra, error: buscarError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('title', 'TEST - Casa pública')
        .is('agent_id', null)
        .maybeSingle()

      if (buscarError || !otra) {
        setMsg('No se encontró la propiedad de prueba.')
        return
      }

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
      setMsg('Error durante la prueba.')
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
                />
              </div>

              <div>
                <label htmlFor="ciudad">Ciudad</label>
                <input
                  id="ciudad"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="zona">Zona</label>
                <input
                  id="zona"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="habitaciones">Habitaciones</label>
                <input
                  id="habitaciones"
                  type="number"
                  min="0"
                  step="1"
                  value={habitaciones}
                  onChange={(e) => setHabitaciones(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="banos">Baños</label>
                <input
                  id="banos"
                  type="number"
                  min="0"
                  step="1"
                  value={banos}
                  onChange={(e) => setBanos(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="estacionamientos">
                  Estacionamientos
                </label>
                <input
                  id="estacionamientos"
                  type="number"
                  min="0"
                  step="1"
                  value={estacionamientos}
                  onChange={(e) => setEstacionamientos(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="metros">Metros cuadrados</label>
                <input
                  id="metros"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={metros}
                  onChange={(e) => setMetros(e.target.value)}
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

              <p>Habitaciones: {casa.bedrooms ?? 'No especificado'}</p>
              <p>Baños: {casa.bathrooms ?? 'No especificado'}</p>
              <p>Estacionamientos: {casa.parking ?? 'No especificado'}</p>
              <p>Superficie: {casa.area_m2 ?? 'No especificada'} m²</p>

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

      <hr style={{ margin: '32px 0' }} />

      <PanelProspectos esAdmin={false} />
    </section>
  )
}

export default PanelAsesor
