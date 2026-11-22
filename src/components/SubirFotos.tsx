import { useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

type Foto = {
  id: string
  url: string
  alt_text: string | null
}

function SubirFotos({ propiedadId }: { propiedadId: string }) {
  const [subiendo, setSubiendo] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [msg, setMsg] = useState('')

  // Leer las fotos cuando el administrador las solicite.
  // El bucket es privado: necesitamos enlaces temporales, no URLs publicas.
  async function cargarFotos() {
    setCargando(true)

    try {
      const { data, error } = await supabase
        .from('property_images')
        .select('id, path, alt_text')
        .eq('property_id', propiedadId)
        .order('position', { ascending: true })

      if (error) throw error

      const enlaces = await Promise.all(
        (data ?? []).map(async (foto) => {
          const { data: enlace, error: errorEnlace } = await supabase.storage
            .from('property-images')
            .createSignedUrl(foto.path, 3600)

          if (errorEnlace || !enlace) {
            console.error('Error al abrir fotografía:', errorEnlace)
            return null
          }

          return {
            id: foto.id,
            url: enlace.signedUrl,
            alt_text: foto.alt_text
          }
        })
      )

      const visibles = enlaces.filter((foto): foto is Foto => foto !== null)
      setFotos(visibles)
      setMostrar(true)

      if (visibles.length !== (data ?? []).length) {
        setMsg('Algunas fotos no se pudieron mostrar. Revisa los permisos de lectura de Storage.')
      }
    } catch (error) {
      console.error('Error al cargar galería:', error)
      setMsg('No se pudo cargar la galería. Revisa la consola y los permisos de Supabase.')
    } finally {
      setCargando(false)
    }
  }

  async function subir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    const permitidos = ['image/jpeg', 'image/png', 'image/webp']

    if (!permitidos.includes(archivo.type)) {
      setMsg('Solo se permiten imágenes JPG, PNG o WebP.')
      e.target.value = ''
      return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setMsg('La imagen no puede superar los 5 MB.')
      e.target.value = ''
      return
    }

    setSubiendo(true)
    setMsg('Subiendo fotografía...')

    try {
      const extension = archivo.type === 'image/jpeg'
        ? 'jpg'
        : archivo.type === 'image/png'
          ? 'png'
          : 'webp'

      const ruta = `${propiedadId}/${crypto.randomUUID()}.${extension}`

      const { error: errorSubida } = await supabase.storage
        .from('property-images')
        .upload(ruta, archivo, {
          contentType: archivo.type,
          upsert: false
        })

      if (errorSubida) throw errorSubida

      const { data: ultima, error: errorOrden } = await supabase
        .from('property_images')
        .select('position')
        .eq('property_id', propiedadId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (errorOrden) throw errorOrden

      const posicion = (ultima?.position ?? -1) + 1

      const { error: errorRegistro } = await supabase
        .from('property_images')
        .insert({
          property_id: propiedadId,
          path: ruta,
          position: posicion,
          alt_text: archivo.name
        })

      if (errorRegistro) throw errorRegistro

      await cargarFotos()
      setMsg('Fotografía subida y registrada correctamente.')
    } catch (error) {
      console.error('Error al subir o registrar fotografía:', error)
      setMsg(
        'No se completó la carga. Revisa la consola y las políticas de Supabase. ' +
        'Si el archivo se subió, podría haber quedado sin registrar.'
      )
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ marginTop: '15px' }}>
      <h4>Fotografías</h4>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={subir}
        disabled={subiendo}
        aria-label="Seleccionar fotografía"
      />

      <p style={{ fontSize: '12px' }}>
        JPG, PNG o WebP. Máximo 5 MB por fotografía.
      </p>

      <button
        type="button"
        onClick={cargarFotos}
        disabled={cargando || subiendo}
      >
        {cargando ? 'Cargando fotos...' : 'Ver / actualizar fotografías'}
      </button>

      {mostrar && (
        <div style={{ marginTop: '12px' }}>
          {fotos.length === 0 ? (
            <p>Esta propiedad todavía no tiene fotografías registradas.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '12px',
              marginTop: '12px'
            }}>
              {fotos.map((foto) => (
                <img
                  key={foto.id}
                  src={foto.url}
                  alt={foto.alt_text || 'Fotografía de la propiedad'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {msg && <p role="status">{msg}</p>}
    </div>
  )
}

export default SubirFotos
