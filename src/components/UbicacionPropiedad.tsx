import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Props = { propiedadId: string }

export default function UbicacionPropiedad({ propiedadId }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [autorizado, setAutorizado] = useState(false)
  const [msg, setMsg] = useState('')

  async function cargar() {
    setAbierto(true)
    setCargando(true)
    setListo(false)
    setMsg('')
    setAutorizado(false)
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('map_lat, map_lng')
        .eq('id', propiedadId)
        .single()
      if (error || !data) throw error ?? new Error('Propiedad no encontrada')
      setLat(data.map_lat == null ? '' : String(data.map_lat))
      setLng(data.map_lng == null ? '' : String(data.map_lng))
      setListo(true)
    } catch (error) {
      console.error(error)
      setMsg('No se pudo consultar la ubicación. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  async function guardar(quitar = false) {
    if (!listo || guardando) return
    const a = Number(lat)
    const b = Number(lng)
    if (!quitar) {
      if (!lat.trim() || !lng.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) {
        setMsg('Ingresa una latitud de -90 a 90 y una longitud de -180 a 180.')
        return
      }
      if (!autorizado) {
        setMsg('Confirma que esta ubicación está autorizada para publicarse.')
        return
      }
    } else if (!window.confirm('¿Quitar la ubicación pública de esta propiedad?')) {
      return
    }
    setGuardando(true)
    setMsg('')
    try {
      const { error } = await supabase.rpc('dci_set_property_location', {
        p_property_id: propiedadId,
        p_lat: quitar ? null : Number(a.toFixed(6)),
        p_lng: quitar ? null : Number(b.toFixed(6))
      })
      if (error) throw error
      setLat(quitar ? '' : String(Number(a.toFixed(6))))
      setLng(quitar ? '' : String(Number(b.toFixed(6))))
      setAutorizado(false)
      setMsg(quitar ? 'Ubicación eliminada correctamente.' : 'Ubicación guardada correctamente.')
    } catch (error) {
      console.error(error)
      setMsg('No se pudo guardar la ubicación. Revisa tus permisos e intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void guardar()
  }

  return (
    <section style={{ marginTop: 20, padding: 16, border: '1px solid #dbe3ed', borderRadius: 12, background: '#f5f7fa', color: '#14243a', colorScheme: 'light' }}>
      <h3 style={{ color: '#14243a', marginTop: 0 }}>Ubicación del inmueble</h3>
      {!abierto ? (
        <button type="button" onClick={() => void cargar()}>Configurar ubicación</button>
      ) : (
        <>
          <button type="button" disabled={cargando || guardando} onClick={() => setAbierto(false)}>Cerrar ubicación</button>
          {cargando && <p role="status">Cargando ubicación...</p>}
          {!cargando && !listo && <button type="button" onClick={() => void cargar()}>Reintentar</button>}
          {listo && (
            <form onSubmit={enviar} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <p>Guarda solo una ubicación autorizada para el catálogo público. Si es aproximada, elige un punto de referencia de la zona en vez del domicilio exacto.</p>
              <div>
                <label htmlFor={`lat-${propiedadId}`}>Latitud</label>
                <input id={`lat-${propiedadId}`} type="number" step="any" min="-90" max="90" placeholder="25.650000" value={lat} disabled={guardando} required onChange={e => { setLat(e.target.value); setAutorizado(false) }} />
              </div>
              <div>
                <label htmlFor={`lng-${propiedadId}`}>Longitud</label>
                <input id={`lng-${propiedadId}`} type="number" step="any" min="-180" max="180" placeholder="-100.350000" value={lng} disabled={guardando} required onChange={e => { setLng(e.target.value); setAutorizado(false) }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={autorizado} disabled={guardando} onChange={e => setAutorizado(e.target.checked)} />
                Confirmo que esta ubicación puede hacerse pública.
              </label>
              <button type="submit" disabled={guardando || !autorizado}>{guardando ? 'Guardando...' : 'Guardar ubicación'}</button>
              <button type="button" disabled={guardando} onClick={() => void guardar(true)}>Quitar ubicación</button>
            </form>
          )}
          {msg && <p role="status">{msg}</p>}
        </>
      )}
    </section>
  )
}
