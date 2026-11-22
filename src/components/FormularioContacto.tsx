
import { useRef, useState, type FormEvent } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Props = {
  propiedadId: string
}

export default function FormularioContacto({ propiedadId }: Props) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [token, setToken] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const captcha = useRef<TurnstileInstance>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRespuesta('')

    if (!correo.trim() && !telefono.trim()) {
      setRespuesta('Ingresa un correo o un teléfono.')
      return
    }

    if (!token) {
      setRespuesta('Completa la verificación de seguridad.')
      return
    }

    setEnviando(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        'submit-lead',
        {
          body: {
            name: nombre.trim(),
            email: correo.trim(),
            phone: telefono.trim(),
            message: mensaje.trim(),
            property_id: propiedadId,
            turnstile_token: token
          }
        }
      )

      if (error) {
        if (error instanceof FunctionsHttpError) {
          let detalle = 'No se pudo enviar la solicitud.'

          try {
            const info = await error.context.json()
            if (typeof info?.error === 'string') {
              detalle = info.error
            }
          } catch {
            // Respuesta del servidor sin JSON
          }

          throw new Error(detalle)
        }

        throw new Error('Error de conexión. Intenta nuevamente.')
      }

      if (data?.success !== true) {
        throw new Error('No se pudo confirmar el envío.')
      }

      setNombre('')
      setCorreo('')
      setTelefono('')
      setMensaje('')
      setRespuesta('¡Solicitud enviada! Un asesor se pondrá en contacto contigo.')

    } catch (err) {
      setRespuesta(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error. Intenta nuevamente.'
      )
    } finally {
      setEnviando(false)
      setToken('')
      captcha.current?.reset()
    }
  }

  return (
    <section>
      <h3>Me interesa esta propiedad</h3>

      <p>
        Déjanos tus datos y un asesor de DCI te contactará.
      </p>

      <form onSubmit={enviar}>
        <div>
          <label>Nombre completo</label>
          <br />
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={100}
            required
          />
        </div>

        <div>
          <label>Correo electrónico</label>
          <br />
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            maxLength={254}
          />
        </div>

        <div>
          <label>Teléfono</label>
          <br />
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="81 1234 5678"
            maxLength={30}
          />
        </div>

        <div>
          <label>Mensaje</label>
          <br />
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Hola, quisiera más información sobre esta propiedad."
            maxLength={2000}
            rows={4}
          />
        </div>

        <p>Ingresa al menos un correo o teléfono.</p>

        {siteKey ? (
          <Turnstile
            ref={captcha}
            siteKey={siteKey}
            onSuccess={(nuevoToken) => setToken(nuevoToken)}
            onExpire={() => setToken('')}
            onError={() => setToken('')}
          />
        ) : (
          <p>Falta configurar Turnstile.</p>
        )}

        <br />

        <button
          type="submit"
          disabled={enviando || !token}
        >
          {enviando ? 'Enviando...' : 'Enviar solicitud'}
        </button>

        {respuesta && <p role="status">{respuesta}</p>}
      </form>
    </section>
  )
}
