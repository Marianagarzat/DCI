
import { useState } from 'react'
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
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // cargar propiedades publicadas
  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, title, description, price,
        city, zone, type, operation,
        bedrooms, bathrooms, parking, area_m2
      `)
      .eq('published', true)
      .in('status', ['available', 'reserved'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error(error)
      setMsg('Error al cargar propiedades: ' + error.message)
    } else {
      setCasas(data ?? [])
      setAbierta(null)

      if (!data?.length) {
        setMsg('No hay propiedades públicas disponibles.')
      }
    }

    setLoading(false)
  }

  // abrir o cerrar los detalles
  function verDetalles(id: string) {
    setAbierta(abierta === id ? null : id)
  }

  // mostrar recuperación de contraseña
  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  return (
    <main style={{ padding: '40px' }}>
      <h1>DCI Distrito Center Inmuebles</h1>
      <p>Propiedades en venta y renta</p>

      <button
        type="button"
        onClick={cargar}
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'Ver propiedades'}
      </button>

      {msg && <p role="status">{msg}</p>}

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
