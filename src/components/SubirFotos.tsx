import { useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

function SubirFotos({ propiedadId }: { propiedadId: string }) {
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState('')

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
      const extension =
        archivo.type === 'image/jpeg'
          ? 'jpg'
          : archivo.type === 'image/png'
            ? 'png'
            : 'webp'

      const ruta = `${propiedadId}/${crypto.randomUUID()}.${extension}`

      // 1. Guardar el archivo en Supabase Storage.
      const { error: errorSubida } = await supabase.storage
        .from('property-images')
        .upload(ruta, archivo, {
          contentType: archivo.type,
          upsert: false
        })

      if (errorSubida) throw errorSubida

      // 2. Averiguar en qué posición va la foto.
      const { data: ultima, error: errorOrden } = await supabase
        .from('property_images')
        .select('position')
        .eq('property_id', propiedadId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (errorOrden) throw errorOrden

      // 3. Registrar la foto en la tabla.
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

      setMsg('Fotografía subida y registrada correctamente.')
    } catch (error) {
      console.error('Error al subir o registrar fotografía:', error)
      setMsg(
        'No se completó la carga. Revisa la consola del navegador y las políticas de Supabase. ' +
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

      {msg && <p role="status">{msg}</p>}
    </div>
  )
}

export default SubirFotos
