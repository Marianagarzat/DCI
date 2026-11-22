
import { useState, type FormEvent } from 'react'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import FotoPortada from './components/FotoPortada'
import GaleriaFotos from './components/GaleriaFotos'
import { supabase } from './lib/supabase'

type Casa = {
  id: string
  title: string
  description: string | null
  price: number
  city: string | null
  zone: string | null
  type: string
  operation: string
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  area_m2: number | null
}

function App() {
  const [casas, setCasas] = useState<Casa[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)

  const [ciudad, setCiudad] = useState('')
  const [operacion, setOperacion] = useState('')
  const [tipo, setTipo] = useState('')
  const [precioMax, setPrecioMax] = useState('')

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // buscar propiedades con filtros
  async function cargar() {
    const max = precioMax === '' ? null : Number(precioMax)

    if (
      max !== null &&
      (!Number.isFinite(max) || max <= 0)
    ) {
      setMsg('Escribe un precio máximo válido.')
      return
    }

    setLoading(true)
    setMsg('')

    let consulta = supabase
      .from('properties')
      .select(`
        id, title, description, price,
        city, zone, type, operation,
        bedrooms, bathrooms, parking, area_m2
      `)
      .eq('published', true)
      .in('status', ['available', 'reserved'])

    if (ciudad.trim()) {
      consulta = consulta.ilike(
        'city',
        `%${ciudad.trim()}%`
      )
    }

    if (operacion) {
      consulta = consulta.eq('operation', operacion)
    }

    if (tipo) {
      consulta = consulta.eq('type', tipo)
    }

    if (max !== null) {
      consulta = consulta.lte('price', max)
    }

    const { data, error } = await consulta
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
      setMsg('Error al buscar: ' + error.message)
    } else {
      setCasas(data ?? [])
      setAbierta(null)

      if (!data?.length) {
        setMsg('No encontramos propiedades con esos filtros.')
      }
    }

    setLoading(false)
  }

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void cargar()
  }

  function limpiar() {
    setCiudad('')
    setOperacion('')
    setTipo('')
    setPrecioMax('')
    setCasas([])
    setAbierta(null)
    setMsg('Filtros limpiados. Presiona Buscar propiedades.')
  }

  function verDetalles(id: string) {
    setAbierta(abierta === id ? null : id)
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  return (
    <main style={{ padding: '40px' }}>
      <h1>DCI Distrito Center Inmuebles</h1>
      <p>Propiedades en venta y renta</p>

      <form
        onSubmit={buscar}
        style={{
          border: '1px solid #777',
          padding: '20px',
          marginTop: '20px'
        }}
      >
        <h2>Buscar propiedades</h2>

        <div>
          <label htmlFor="buscar-ciudad">Ciudad</label>
          <input
            id="buscar-ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Ej. Monterrey"
          />
        </div>

        <div>
          <label htmlFor="buscar-operacion">Operación</label>
          <select
            id="buscar-operacion"
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
          >
            <option value="">Venta y renta</option>
            <option value="sale">Venta</option>
            <option value="rent">Renta</option>
          </select>
        </div>

        <div>
          <label htmlFor="buscar-tipo">Tipo de inmueble</label>
          <select
            id="buscar-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="house">Casa</option>
            <option value="apartment">Departamento</option>
            <option value="land">Terreno</option>
            <option value="commercial">Local comercial</option>
            <option value="office">Oficina</option>
          </select>
        </div>

        <div>
          <label htmlFor="buscar-precio">Precio máximo (MXN)</label>
          <input
            id="buscar-precio"
            type="number"
            min="1"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            placeholder="Ej. 5000000"
          />
        </div>

        <div style={{ marginTop: '15px' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar propiedades'}
          </button>

          <button
            type="button"
            onClick={limpiar}
            disabled={loading}
            style={{ marginLeft: '10px' }}
          >
            Limpiar filtros
          </button>
        </div>
      </form>

      {msg && <p role="status">{msg}</p>}

      <h2>Propiedades disponibles</h2>

      {casas.map((casa) => (
        <article
          key={casa.id}
          style={{
            border: '1px solid #777',
            padding: '20px',
            marginTop: '20px'
          }}
        >
          <FotoPortada propiedadId={casa.id} />

          <h2>{casa.title}</h2>

          <p>
            {casa.city ?? 'Ciudad no especificada'}
            {' - '}
            {casa.zone ?? 'Zona no especificada'}
          </p>

          <h3>
            {casa.price.toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN'
            })}
          </h3>

          <button
            type="button"
            onClick={() => verDetalles(casa.id)}
          >
            {abierta === casa.id
              ? 'Ocultar detalles'
              : 'Ver detalles'}
          </button>

          {abierta === casa.id && (
            <section style={{ marginTop: '20px' }}>
              <h3>Detalles de la propiedad</h3>

              <p>
                Operación: {
                  casa.operation === 'sale'
                    ? 'Venta'
                    : 'Renta'
                }
              </p>

              <p>Tipo: {casa.type}</p>

              <p>
                Habitaciones: {
                  casa.bedrooms ?? 'No especificado'
                }
              </p>

              <p>
                Baños: {
                  casa.bathrooms ?? 'No especificado'
                }
              </p>

              <p>
                Estacionamientos: {
                  casa.parking ?? 'No especificado'
                }
              </p>

              <p>
                Superficie: {
                  casa.area_m2 !== null
                    ? `${casa.area_m2} m²`
                    : 'No especificada'
                }
              </p>

              <h3>Descripción</h3>

              <p>
                {casa.description ||
                  'Esta propiedad aún no tiene descripción.'}
              </p>

              <h3>Fotografías</h3>

              <GaleriaFotos propiedadId={casa.id} />
            </section>
          )}
        </article>
      ))}

      <hr />

      <Login />
    </main>
  )
}

export default App
