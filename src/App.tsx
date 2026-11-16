import Login from './components/Login'
import { useState } from 'react'
import { supabase } from './lib/supabase'
import ResetPassword from './components/ResetPassword'

function App() {
  const [casas, setCasas] = useState<
    { title: string; price: number; city: string; zone: string }[]
  >([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function cargar() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase
     .from('properties')
.select('title, price, city, zone')
.eq('published', true)
.in('status', ['available', 'reserved'])
.limit(10)

    if (error) {
      console.error(error)
      setMsg(error.message)
    } else {
      setCasas(data ?? [])

      if (data?.length === 0) {
        setMsg('No hay propiedades públicas disponibles.')
      }
    }

    
    setLoading(false)
  }

  // mostrar la pantalla para recuperar contraseña
  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  return (
    <main style={{ padding: '40px' }}>

      <h1>DCI Distrito Center Inmuebles</h1>
      <p>Propiedades en venta y renta</p>

      <button onClick={cargar} disabled={loading}>
        {loading ? 'Cargando...' : 'Ver propiedades'}
      </button>

      {msg && <p>{msg}</p>}

      {casas.map((casa, i) => (
        <div key={i}>
          <h2>{casa.title}</h2>
          <p>{casa.city} - {casa.zone}</p>
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
