
# DCI - Permisos del sistema

## Roles

- public: visitante sin cuenta
- agent: asesor autorizado
- admin: administrador

## Propiedades

- public puede ver propiedades publicadas.
- agent puede ver y editar sus propiedades asignadas.
- admin puede administrar todas las propiedades.
- Solo admin puede asignar propiedades a otros asesores.

## Prospectos (CRM)

- public puede enviar formularios de contacto.
- public no puede consultar prospectos.
- agent puede ver y actualizar sus prospectos asignados.
- admin puede ver todos los prospectos.
- admin puede asignar prospectos a asesores.

## Cuentas

- No habrá registro público de asesores.
- Las cuentas deben ser autorizadas.
- Los roles no pueden modificarse desde el frontend.
- Admin puede desactivar accesos.

## Seguridad

- RLS obligatorio en las tablas expuestas.
- Los permisos se verifican en la base de datos.
- No usar claves secretas en el navegador.
- Los prospectos nunca serán información pública.
- Validar los formularios.
- Proteger los formularios contra spam.
