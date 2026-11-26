import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import FotoPortada from './components/FotoPortada'
import GaleriaFotos from './components/GaleriaFotos'
import FormularioContacto from './components/FormularioContacto'
import AsesorPublico from './components/AsesorPublico'
import { supabase } from './lib/supabase'
import './Catalogo.css'
import './Portal.css'

type Casa = {
  id: string
  title: string
  description: string | null
  price: number
  old_price: number | null
  city: string | null
  zone: string | null
  type: string
  operation: string
  featured: boolean
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  area_m2: number | null
}

const filtrosIniciales = {
  ciudad: '', zona: '', operacion: '', tipo: '',
  precioMin: '', precioMax: '', orden: 'recientes'
}

const tipos: Record<string, string> = {
  house: 'Casa', apartment: 'Departamento', land: 'Terreno',
  commercial: 'Local comercial', office: 'Oficina'
}

function tieneReduccion(casa: Casa): boolean {
  return casa.old_price !== null && casa.old_price > casa.price && casa.price > 0
}

function moneda(valor: number) {
  return valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function Catalogo() {
  const [casas, setCasas] = useState<Casa[]>([])
  const [destacadas, setDestacadas] = useState<Casa[]>([])
  const [rebajas, setRebajas] = useState<Casa[]>([])
  const [errorRebajas, setErrorRebajas] = useState(false)
  const [inicio, setInicio] = useState(true)
  const [errorDestacadas, setErrorDestacadas] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const solicitud = useRef(0)

  function cambiar(campo: keyof typeof filtrosIniciales, valor: string) {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
  }

  const cargar = useCallback(async (f: typeof filtrosIniciales, mostrarInicio = false) => {
    const min = f.precioMin === '' ? null : Number(f.precioMin)
    const max = f.precioMax === '' ? null : Number(f.precioMax)

    if ((min !== null && (!Number.isFinite(min) || min < 0)) ||
        (max !== null && (!Number.isFinite(max) || max <= 0))) {
      setMsg('Revisa los precios que ingresaste.')
      return
    }
    if (min !== null && max !== null && min > max) {
      setMsg('El precio mínimo no puede superar al máximo.')
      return
    }

    const actual = ++solicitud.current
    setLoading(true)
    setInicio(mostrarInicio)
    setDestacadas([])
    setRebajas([])
    setErrorRebajas(false)
    setErrorDestacadas(false)
    setMsg('')
    setAbierta(null)
    try {
      const columnas = `id, title, description, price, city, zone, type, operation,
          bedrooms, bathrooms, parking, area_m2, featured, old_price`
      let consulta = supabase
        .from('properties')
        .select(columnas)
        .eq('published', true)
        .in('status', ['available', 'reserved'])

      if (f.ciudad.trim()) consulta = consulta.ilike('city', `%${f.ciudad.trim()}%`)
      if (f.zona.trim()) consulta = consulta.ilike('zone', `%${f.zona.trim()}%`)
      if (f.operacion) consulta = consulta.eq('operation', f.operacion)
      if (f.tipo) consulta = consulta.eq('type', f.tipo)
      if (min !== null) consulta = consulta.gte('price', min)
      if (max !== null) consulta = consulta.lte('price', max)

      if (f.orden === 'menor') consulta = consulta.order('price', { ascending: true })
      else if (f.orden === 'mayor') consulta = consulta.order('price', { ascending: false })
      else consulta = consulta.order('created_at', { ascending: false })

      const [resultado, seleccion, descuentos] = await Promise.all([
        consulta.limit(50),
        mostrarInicio
          ? supabase.from('properties').select(columnas)
              .eq('published', true)
              .in('status', ['available', 'reserved'])
              .eq('featured', true)
              .order('created_at', { ascending: false })
              .limit(6)
          : Promise.resolve(null),
        mostrarInicio
          ? supabase.from('properties').select(columnas)
              .eq('published', true)
              .in('status', ['available', 'reserved'])
              .not('old_price', 'is', null)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve(null)
      ])
      const { data, error } = resultado
      if (actual !== solicitud.current) return
      if (error) throw error
      setCasas(data ?? [])
      if (seleccion?.error) {
        console.error(seleccion.error)
        setErrorDestacadas(true)
      } else {
        setDestacadas(seleccion?.data ?? [])
      }
      if (descuentos?.error) {
        console.error(descuentos.error)
        setErrorRebajas(true)
      } else {
        setRebajas((descuentos?.data ?? []).filter(tieneReduccion).slice(0, 6))
      }
      if (!data?.length) setMsg('No encontramos propiedades con esos filtros.')
    } catch (error) {
      if (actual !== solicitud.current) return
      console.error(error)
      setCasas([])
      setMsg('No pudimos cargar las propiedades. Intenta nuevamente.')
    } finally {
      if (actual === solicitud.current) setLoading(false)
    }
  }, [])

  // Cargar el catálogo al entrar, sin pedirle al cliente que busque primero.
  useEffect(() => {
    void cargar(filtrosIniciales, true)
    return () => { solicitud.current += 1 }
  }, [cargar])

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void cargar(filtros)
  }

  function limpiar() {
    setFiltros(filtrosIniciales)
    void cargar(filtrosIniciales, true)
  }

  // Reutilizar las tarjetas sin duplicar formularios abiertos.
  function renderCasas(lista: Casa[], grupo: string) {
    return lista.map(casa => {
      const clave = `${grupo}:${casa.id}`
      const anterior = casa.old_price
      const rebaja = anterior !== null && tieneReduccion(casa)
      const ahorro = rebaja ? anterior - casa.price : 0
      const porcentaje = rebaja ? ahorro / anterior * 100 : 0
      return (
              <article key={clave} className={`dci-public-card${abierta === clave ? ' dci-public-card-open' : ''}`}>
                <div className="dci-public-photo">
                  <FotoPortada propiedadId={casa.id} />
                  <span className="dci-public-tag">{casa.operation === 'sale' ? 'Venta' : 'Renta'}</span>
                  {casa.featured && <span className="dci-public-featured-tag">★ Destacada</span>}
                </div>
                <div className="dci-public-card-body">
                  <span className="dci-public-type">{tipos[casa.type] ?? casa.type}</span>
                  <h3>{casa.title}</h3>
                  <p className="dci-public-location">{[casa.city, casa.zone].filter(Boolean).join(' · ') || 'Ubicación no especificada'}</p>
                  {rebaja && <div className="dci-public-reduction">
                    <span className="dci-public-old-price">Antes: <del>{moneda(anterior)}</del></span>
                    <span className="dci-public-discount">−{porcentaje.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%</span>
                  </div>}
                  <p className="dci-public-price">{moneda(casa.price)} <small>MXN</small></p>
                  {rebaja && <p className="dci-public-savings">Ahorra {moneda(ahorro)} MXN</p>}
                  <div className="dci-public-facts">
                    {casa.bedrooms !== null && <span>{casa.bedrooms} hab.</span>}
                    {casa.bathrooms !== null && <span>{casa.bathrooms} baños</span>}
                    {casa.parking !== null && <span>{casa.parking} estac.</span>}
                    {casa.area_m2 !== null && <span>{casa.area_m2} m²</span>}
                  </div>
                  <button className="dci-public-button dci-public-details-button" type="button" aria-expanded={abierta === clave} onClick={() => setAbierta(prev => prev === clave ? null : clave)}>{abierta === clave ? 'Ocultar detalles' : 'Ver detalles'}</button>
                </div>
                {abierta === clave && <section className="dci-public-detail">
                  <h3>Detalles de la propiedad</h3>
                  <p>Operación: {casa.operation === 'sale' ? 'Venta' : 'Renta'} · {tipos[casa.type] ?? casa.type}</p>
                  <p>Habitaciones: {casa.bedrooms ?? 'No especificado'} · Baños: {casa.bathrooms ?? 'No especificado'}</p>
                  <p>Estacionamientos: {casa.parking ?? 'No especificado'} · Superficie: {casa.area_m2 !== null ? `${casa.area_m2} m²` : 'No especificada'}</p>
                  <h3>Descripción</h3><p className="dci-public-description">{casa.description || 'Esta propiedad aún no tiene descripción.'}</p>
                  <h3>Fotografías</h3><GaleriaFotos propiedadId={casa.id} />
                  <AsesorPublico key={casa.id} propiedadId={casa.id} titulo={casa.title} />
                  <div className="dci-public-contact"><FormularioContacto key={casa.id} propiedadId={casa.id} /></div>
                </section>}
              </article>
      )
    })
  }

  return (
    <main className="dci-catalogo">
      <header className="dci-public-nav">
        <div className="dci-public-wrap dci-public-nav-inner">
          <a className="dci-public-brand" href="/" aria-label="DCI Distrito Center Inmuebles, inicio">
            <span className="dci-public-logo">DCI</span>
            <span><strong>Distrito Center</strong><small>INMUEBLES</small></span>
          </a>
          <nav aria-label="Navegación principal">
            <a href="#propiedades">Propiedades</a>
            <a className="dci-public-access" href="/panel">Acceso privado</a>
          </nav>
        </div>
      </header>

      <section className="dci-public-hero">
        <div className="dci-public-wrap">
          <span className="dci-public-kicker">VENTA Y RENTA DE INMUEBLES</span>
          <h1>Encuentra un espacio<br />para tu próxima etapa.</h1>
          <p>Explora nuestro catálogo de propiedades y encuentra la opción que mejor se adapte a ti.</p>
          <a className="dci-public-hero-link" href="#buscar">Explorar propiedades <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <div className="dci-public-wrap dci-public-body">
        <form id="buscar" className="dci-public-filter" onSubmit={buscar}>
          <div className="dci-public-filter-heading">
            <div><span className="dci-public-kicker">TU BÚSQUEDA</span><h2>Encuentra tu propiedad</h2></div>
            <button type="button" className="dci-public-text-button" onClick={limpiar} disabled={loading}>Limpiar filtros</button>
          </div>
          <div className="dci-public-fields">
            <div><label htmlFor="buscar-ciudad">Ciudad</label><input id="buscar-ciudad" value={filtros.ciudad} onChange={e => cambiar('ciudad', e.target.value)} placeholder="Ej. Monterrey" /></div>
            <div><label htmlFor="buscar-zona">Zona o colonia</label><input id="buscar-zona" value={filtros.zona} onChange={e => cambiar('zona', e.target.value)} placeholder="Ej. Valle Oriente" /></div>
            <div><label htmlFor="buscar-operacion">Operación</label><select id="buscar-operacion" value={filtros.operacion} onChange={e => cambiar('operacion', e.target.value)}><option value="">Venta y renta</option><option value="sale">Venta</option><option value="rent">Renta</option></select></div>
            <div><label htmlFor="buscar-tipo">Tipo de inmueble</label><select id="buscar-tipo" value={filtros.tipo} onChange={e => cambiar('tipo', e.target.value)}><option value="">Todos los tipos</option>{Object.entries(tipos).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}</select></div>
            <div><label htmlFor="precio-min">Precio mínimo (MXN)</label><input id="precio-min" type="number" min="0" value={filtros.precioMin} onChange={e => cambiar('precioMin', e.target.value)} placeholder="Sin mínimo" /></div>
            <div><label htmlFor="precio-max">Precio máximo (MXN)</label><input id="precio-max" type="number" min="1" value={filtros.precioMax} onChange={e => cambiar('precioMax', e.target.value)} placeholder="Sin máximo" /></div>
            <div><label htmlFor="buscar-orden">Ordenar por</label><select id="buscar-orden" value={filtros.orden} onChange={e => cambiar('orden', e.target.value)}><option value="recientes">Más recientes</option><option value="menor">Menor precio</option><option value="mayor">Mayor precio</option></select></div>
            <button className="dci-public-button" type="submit" disabled={loading}>{loading ? 'Buscando…' : 'Buscar propiedades'}</button>
          </div>
        </form>

        {inicio && !loading && (destacadas.length > 0 || errorDestacadas) && (
          <section id="destacadas" className="dci-public-results dci-public-featured" aria-labelledby="titulo-destacadas">
            <div className="dci-public-results-heading">
              <div><span className="dci-public-kicker">SELECCIÓN DCI</span><h2 id="titulo-destacadas">Propiedades destacadas</h2></div>
            </div>
            {errorDestacadas && <p className="dci-public-notice" role="status">No pudimos cargar las propiedades destacadas.</p>}
            {destacadas.length > 0 && <div className="dci-public-grid">{renderCasas(destacadas, 'destacadas')}</div>}
          </section>
        )}

        {inicio && !loading && (rebajas.length > 0 || errorRebajas) && (
          <section id="rebajas" className="dci-public-results dci-public-rebajas" aria-labelledby="titulo-rebajas">
            <div className="dci-public-results-heading">
              <div><span className="dci-public-kicker">OPORTUNIDADES DCI</span><h2 id="titulo-rebajas">Bajaron de precio</h2></div>
            </div>
            {errorRebajas && <p className="dci-public-notice" role="status">No pudimos cargar las reducciones de precio.</p>}
            {rebajas.length > 0 && <div className="dci-public-grid">{renderCasas(rebajas, 'rebajas')}</div>}
          </section>
        )}

        <section id="propiedades" className="dci-public-results" aria-busy={loading}>
          <div className="dci-public-results-heading">
            <div><span className="dci-public-kicker">CATÁLOGO DCI</span><h2>{inicio ? 'Lo más nuevo' : 'Propiedades disponibles'}</h2></div>
            {!loading && <span>{inicio ? `${Math.min(casas.length, 6)} recientes` : `${casas.length}${casas.length === 50 ? ' (límite de búsqueda)' : casas.length === 1 ? ' resultado' : ' resultados'}`}</span>}
          </div>
          {loading && <p className="dci-public-notice" role="status">Cargando propiedades…</p>}
          {msg && <p className="dci-public-notice" role="status">{msg}</p>}
          {!loading && <div className="dci-public-grid">
            {renderCasas(inicio ? casas.slice(0, 6) : casas, 'catalogo')}
          </div>}
        </section>
        {inicio && !loading && casas.length > 6 && (
          <section className="dci-public-results dci-public-more">
            <div className="dci-public-results-heading">
              <div><span className="dci-public-kicker">EXPLORA EL CATÁLOGO</span><h2>Más propiedades</h2></div>
              <span>{casas.length === 50 ? 'Mostrando hasta 50 propiedades en total; usa los filtros para afinar.' : `${casas.length - 6} más`}</span>
            </div>
            <div className="dci-public-grid">{renderCasas(casas.slice(6), 'mas')}</div>
          </section>
        )}
      </div>
      <footer className="dci-public-footer"><div className="dci-public-wrap"><span>DCI Distrito Center Inmuebles</span><a href="/panel">Acceso para asesores y administradores</a></div></footer>
    </main>
  )
}

export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, '') || '/'
  if (ruta === '/reset-password') return <ResetPassword />
  if (ruta === '/panel') return (
    <main className="dci-portal">
      <header className="dci-portal-header">
        <a href="/" className="dci-portal-brand" aria-label="DCI, inicio">
          <span className="dci-portal-logo">DCI</span>
          <span><strong>Distrito Center</strong><small>INMUEBLES</small></span>
        </a>
        <a className="dci-portal-back" href="/">← Volver al catálogo</a>
      </header>
      <div className="dci-portal-content">
        <div className="dci-portal-intro">
          <span>ACCESO PRIVADO</span>
          <h1>Portal de administración</h1>
          <p>Gestiona tus propiedades y da seguimiento a tus clientes.</p>
        </div>
        <div className="dci-portal-auth"><Login /></div>
      </div>
      <footer className="dci-portal-footer">DCI Distrito Center Inmuebles · Acceso para personal autorizado</footer>
    </main>
  )
  return <Catalogo />
}
