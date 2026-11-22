
import { useState } from 'react'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import FotoPortada from './components/FotoPortada'
import { supabase } from './lib/supabase'
import GaleriaFotos from './components/GaleriaFotos'

type Casa = {
  id: string
  title: string
  price: number
  city: string | null
  zone: string | null
}

function App() {
  const [casas, setCasas] = useState<Casa[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // cargar propiedades publicadas
  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price, city, zone')
      .eq('published', true)
      .in('status', ['available', 'reserved'])
      .limit(10)

    if (error) {
      console.error(error)
      setMsg('Error al cargar propiedades: ' + error.message)
    } else {
      setCasas(data ?? [])

      if (!data?.length) {
        setMsg('No hay propiedades públicas disponibles.')
      }
    }

    setLoading(false)
  }

  // pantalla para recuperar contraseña
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
        <div
          key={casa.id}
          style={{
            border: '1px solid #777',
            padding: '20px',
            marginTop: '20px'
          }}
        >
        <FotoPortada propiedadId={casa.id} />

<h2>{casa.title}</h2>

<GaleriaFotos propiedadId={casa.id} />

          <p>
            {casa.city ?? 'Ciudad no especificada'}
            {' - '}
            {casa.zone ?? 'Zona no especificada'}
          </p>

          <p>
            {casa.price.toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN'
            })}
          </p>
        </div>
      ))}

      <hr />

      <Login />
    </main>
  )
}

export default App
