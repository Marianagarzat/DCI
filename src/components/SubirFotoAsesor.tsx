import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

const extensiones: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

export default function SubirFotoAsesor({ asesorId }: { asesorId: string }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [foto, setFoto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const ocupado = useRef(false)
  const bucket = 'agent-photos'

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const { data: ruta, error } = await supabase.rpc('dci_get_admin_agent_photo', {
          p_agent_id: asesorId
        })
        if (error) throw error
        if (!vigente) return
        if (!ruta) {
          setFoto('')
          return
        }
        const { data, error: errorUrl } = await supabase.storage
          .from(bucket).createSignedUrl(ruta, 300)
        if (errorUrl) throw errorUrl
        if (vigente) setFoto(data.signedUrl)
      } catch (err) {
        console.error('Error al consultar fotografía:', err)
        if (vigente) {
          setFoto('')
          setError(true)
          setMsg('No se pudo cargar la fotografía. Intenta actualizarla.')
        }
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [asesorId, version])

  function seleccionar(e: ChangeEvent<HTMLInputElement>) {
    const seleccion = e.target.files?.[0] ?? null
    setArchivo(null)
    setMsg('')
    setError(false)
    if (!seleccion) return
    if (!extensiones[seleccion.type] || seleccion.size === 0 || seleccion.size > 2 * 1024 * 1024) {
      setError(true)
      setMsg('Selecciona una imagen JPG, PNG o WebP de máximo 2 MB.')
      e.target.value = ''
      return
    }
    setArchivo(seleccion)
  }

  function actualizar() {
    setFoto('')
    setCargando(true)
    setVersion(v => v + 1)
  }

  async function guardar() {
    if (!archivo || ocupado.current || cargando) return
    ocupado.current = true
    setSubiendo(true)
    setError(false)
    setMsg('')
    let vinculada = false
    let subida = false
    try {
      const ruta = `${asesorId}/${crypto.randomUUID()}.${extensiones[archivo.type]}`
      const { error: errorSubida } = await supabase.storage.from(bucket).upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false
      })
      if (errorSubida) throw errorSubida
      subida = true

      const { error: errorVinculo } = await supabase.rpc('dci_set_agent_photo', {
        p_agent_id: asesorId,
        p_photo_path: ruta
      })
      if (errorVinculo) throw errorVinculo
      vinculada = true
      setArchivo(null)
      if (entrada.current) entrada.current.value = ''
      setMsg('Fotografía guardada correctamente.')
      actualizar()
    } catch (err) {
      console.error('Error al guardar fotografía:', err)
      setError(true)
      setMsg(subida
        ? 'Se subió el archivo, pero no se pudo confirmar el vínculo. Guarda primero el perfil y actualiza la fotografía antes de reintentar.'
        : 'No se pudo subir la fotografía. Revisa los permisos o la conexión.')
      // No borrar archivos cuando no se conoce el resultado del vínculo.
      if (!vinculada) actualizar()
    } finally {
      ocupado.current = false
      setSubiendo(false)
    }
  }

  return (
    <section className="dci-admin-property-form" aria-busy={cargando || subiendo}>
      <h3 style={{ color: '#14243a', marginTop: 0 }}>Fotografía profesional</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {foto ? (
          <img src={foto} alt="Fotografía profesional del asesor" width={88} height={88}
            style={{ borderRadius: '50%', objectFit: 'cover', background: '#e2e9f1' }}
            onError={() => setFoto('')} />
        ) : (
          <div aria-hidden="true" style={{ width: 88, height: 88, borderRadius: '50%', background: '#e2e9f1', display: 'grid', placeItems: 'center', color: '#24466b', fontSize: 28 }}>DCI</div>
        )}
        <p style={{ color: '#52637b' }}>{cargando ? 'Cargando fotografía...' : foto ? 'Fotografía actual' : 'Sin fotografía visible'}</p>
      </div>
      <p style={{ color: '#52637b', fontSize: 13 }}>Guarda primero el perfil profesional. Publica únicamente fotografías autorizadas por el asesor.</p>
      <div>
        <label htmlFor={`foto-asesor-${asesorId}`}>Seleccionar fotografía (JPG, PNG o WebP, máximo 2 MB)</label>
        <input ref={entrada} id={`foto-asesor-${asesorId}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionar} disabled={subiendo || cargando} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={guardar} disabled={!archivo || subiendo || cargando}>{subiendo ? 'Guardando...' : 'Guardar fotografía'}</button>
        <button type="button" disabled={subiendo || cargando} onClick={() => { setMsg(''); setError(false); actualizar() }}>Actualizar fotografía</button>
      </div>
      {msg && <p role="status" style={{ color: error ? '#a52727' : '#21633f' }}>{msg}</p>}
    </section>
  )
}
