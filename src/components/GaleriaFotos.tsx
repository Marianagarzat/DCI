
import { useState } from 'react'
import { supabase } from '../lib/supabase'

function GaleriaFotos({ propiedadId }: { propiedadId: string }) {
  const [fotos, setFotos] = useState<string[]>([])
  const [actual, setActual] = useState(0)
  const [abierta, setAbierta] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function mostrar() {
    if (abierta) {
      setAbierta(false)
      return
    }

    setLoading(true)
    setMsg('')

    try {
      // buscar las fotos de esta propiedad
      const { data, error } = await supabase
        .from('property_images')
        .select('path, position')
        .eq('property_id', propiedadId)
        .order('position', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        setFotos([])
        setMsg('Esta propiedad todavía no tiene fotografías.')
        return
      }

      // generar enlaces temporales a las fotos
      const rutas = data.map((foto) => foto.path)

      const { data: enlaces, error: errorLinks } =
        await supabase.storage
          .from('property-images')
          .createSignedUrls(rutas, 3600)

      if (errorLinks) throw errorLinks

      const urls = (enlaces ?? []).flatMap((foto) =>
        foto.signedUrl ? [foto.signedUrl] : []
      )

      if (urls.length === 0) {
        setMsg('No se pudieron abrir las fotografías.')
        return
      }

      setFotos(urls)
      setActual(0)
      setAbierta(true)
    } catch (error) {
      console.error(error)
      setMsg('Error al cargar las fotografías.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '15px' }}>
      <button
        type="button"
        onClick={mostrar}
        disabled={loading}
      >
        {loading
          ? 'Cargando fotos...'
          : abierta
            ? 'Ocultar galería'
            : 'Ver galería de fotografías'}
      </button>

      {msg && <p role="status">{msg}</p>}

      {abierta && fotos.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <img
            src={fotos[actual]}
            alt={`Fotografía ${actual + 1} de la propiedad`}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '8px'
            }}
          />

          <p>
            Fotografía {actual + 1} de {fotos.length}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            {fotos.map((foto, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActual(i)}
                style={{
                  padding: '2px',
                  border: i === actual
                    ? '2px solid white'
                    : '2px solid transparent'
                }}
              >
                <img
                  src={foto}
                  alt={`Ver fotografía ${i + 1}`}
                  style={{
                    width: '85px',
                    height: '65px',
                    objectFit: 'cover'
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GaleriaFotos
