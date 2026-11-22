import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Props = {
  propiedadId: string
}

function FotoPortada({ propiedadId }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [alt, setAlt] = useState('Fotografía de la propiedad')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setUrl(null)
      setCargando(true)

      const { data: foto, error: errorFoto } = await supabase
        .from('property_images')
        .select('path, alt_text')
        .eq('property_id', propiedadId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!activo) return

      if (errorFoto) {
        console.error('Error al consultar fotografía:', errorFoto)
        setCargando(false)
        return
      }

      if (!foto) {
        setCargando(false)
        return
      }

      const { data, error } = await supabase.storage
        .from('property-images')
        .createSignedUrl(foto.path, 60 * 60)

      if (!activo) return

      if (error) {
        console.error('Error al cargar imagen:', error)
      } else {
        setUrl(data.signedUrl)
        setAlt(foto.alt_text || 'Fotografía de la propiedad')
      }

      setCargando(false)
    }

    void cargar()

    return () => {
      activo = false
    }
  }, [propiedadId])

  if (cargando) return <p>Cargando fotografía...</p>
  if (!url) return <p>Sin fotografía disponible</p>

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      style={{
        width: '100%',
        maxWidth: '420px',
        aspectRatio: '4 / 3',
        objectFit: 'cover',
        borderRadius: '8px'
      }}
    />
  )
}

export default FotoPortada
