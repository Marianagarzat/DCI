
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''

  // paginas autorizadas para usar el formulario
  const origenes = (
    Deno.env.get('DCI_ALLOWED_ORIGINS') ?? ''
  )
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }

  function responder(
    datos: Record<string, unknown>,
    status = 200
  ) {
    return new Response(JSON.stringify(datos), {
      status,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    })
  }

  if (!origin || !origenes.includes(origin)) {
    return new Response('Origen no permitido', { status: 403 })
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    })
  }

  if (req.method !== 'POST') {
    return responder({ error: 'Metodo no permitido' }, 405)
  }

  const secreto = Deno.env.get('TURNSTILE_SECRET')
  const url = Deno.env.get('SUPABASE_URL')
  const llave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!secreto || !url || !llave) {
    return responder(
      { error: 'Servidor no configurado' },
      503
    )
  }

  try {
    // limitar el tamaño de los datos recibidos
    const texto = await req.text()

    if (texto.length > 8000) {
      return responder({ error: 'Solicitud demasiado grande' }, 413)
    }

    const datos = JSON.parse(texto)

    if (!datos || typeof datos !== 'object') {
      return responder({ error: 'Datos invalidos' }, 400)
    }

    const campo = (valor: unknown) =>
      typeof valor === 'string' ? valor.trim() : ''

    const nombre = campo(datos.name)
    const email = campo(datos.email)
    const telefono = campo(datos.phone)
    const mensaje = campo(datos.message)
    const propiedad = campo(datos.property_id)
    const token = campo(datos.turnstile_token)

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    // comprobar los datos del formulario
    if (
      nombre.length < 2 ||
      nombre.length > 100 ||
      email.length > 254 ||
      telefono.length > 30 ||
      mensaje.length > 2000 ||
      !uuid.test(propiedad) ||
      !token ||
      token.length > 2048
    ) {
      return responder({ error: 'Datos invalidos' }, 400)
    }

    if (!email && !telefono) {
      return responder(
        { error: 'Escribe tu correo o telefono' },
        400
      )
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return responder({ error: 'Correo invalido' }, 400)
    }

    const digitos = telefono.replace(/\D/g, '')

    if (
      telefono &&
      (digitos.length < 8 || digitos.length > 15)
    ) {
      return responder({ error: 'Telefono invalido' }, 400)
    }

    // verificar el token de Cloudflare Turnstile
    const respuesta = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: secreto,
          response: token
        })
      }
    )

    if (!respuesta.ok) {
      throw new Error('No se pudo verificar Turnstile')
    }

    const verificacion = await respuesta.json()

    if (
      verificacion.success !== true ||
      verificacion.hostname !== new URL(origin).hostname
    ) {
      return responder(
        { error: 'Verificacion de seguridad fallida' },
        403
      )
    }

    // cliente de Supabase exclusivo del servidor
    const admin = createClient(url, llave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // confirmar que la propiedad sea publica
    const { data: casa, error: errorCasa } = await admin
      .from('properties')
      .select('id, agent_id')
      .eq('id', propiedad)
      .eq('published', true)
      .in('status', ['available', 'reserved'])
      .maybeSingle()

    if (errorCasa) throw errorCasa

    if (!casa) {
      return responder(
        { error: 'Propiedad no disponible' },
        404
      )
    }

    // asignar el prospecto solo a un asesor activo
    let asesorId: string | null = null

    if (casa.agent_id) {
      const { data: asesor, error: errorAsesor } = await admin
        .from('profiles')
        .select('id')
        .eq('id', casa.agent_id)
        .eq('role', 'agent')
        .eq('active', true)
        .maybeSingle()

      if (errorAsesor) throw errorAsesor

      asesorId = asesor?.id ?? null
    }


    // comprobar limites de solicitudes

    const claveHash = Deno.env.get('LEAD_HASH_SECRET')

    if (!claveHash) {
      return responder(
        { error: 'Servidor no configurado' },
        503
      )
    }

    // identificar al contacto sin guardar sus datos
    const contacto = email
      ? `email:${email.toLowerCase()}`
      : `phone:${digitos}`

    const encoder = new TextEncoder()

    // preparar clave HMAC
    const clave = await crypto.subtle.importKey(
      'raw',
      encoder.encode(claveHash),
      {
        name: 'HMAC',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )

    // calcular identificador privado
    const firma = await crypto.subtle.sign(
      'HMAC',
      clave,
      encoder.encode(contacto)
    )

    const hash = Array.from(new Uint8Array(firma))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // consultar el limite en Supabase
    const { data: permitido, error: errorLimite } =
      await admin.rpc('dci_check_lead_limit', {
        p_contact_hash: hash
      })

    if (errorLimite) {
      throw errorLimite
    }

    if (permitido !== true) {
      return responder(
        {
          error:
            'Demasiadas solicitudes. Intenta más tarde.'
        },
        429
      )
    }


    // guardar el prospecto en el CRM
    const { error } = await admin
      .from('leads')
      .insert({
        name: nombre,
        email: email || null,
        phone: telefono || null,
        message: mensaje || null,
        property_id: casa.id,
        agent_id: asesorId,
        status: 'new'
      })

    if (error) throw error

    return responder({
      success: true,
      message: 'Solicitud recibida correctamente'
    })
  } catch (error) {
    console.error('Error en submit-lead:', error)

    return responder(
      { error: 'No se pudo procesar la solicitud' },
      500
    )
  }
})
