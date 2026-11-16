
# DCI - Diseño de base de datos

## profiles
Datos de asesores y administradores.

- id
- name
- role: admin / agent
- active
- created_at

## properties
Inventario de propiedades.

- id
- title
- description
- price
- operation: sale / rent
- type
- address
- zone
- bedrooms
- bathrooms
- parking
- area
- status: available / reserved / sold / rented
- published: true / false
- featured
- agent_id
- created_at

## property_images
Fotografías de cada propiedad.

- id
- property_id
- path
- position

## leads
Prospectos registrados en el CRM.

- id
- name
- email
- phone
- message
- property_id
- agent_id
- source
- status
- created_at

## lead_notes
Notas de seguimiento.

- id
- lead_id
- author_id
- content
- created_at

## Reglas de seguridad

- Cada usuario tendrá un identificador único.
- Solo admin podrá asignar asesores.
- Solo admin podrá modificar roles.
- Los visitantes verán únicamente propiedades publicadas.
- Los asesores solo accederán a sus datos autorizados.
- Los prospectos no serán públicos.
- Los formularios públicos se procesarán en el servidor.
- Todas las tablas expuestas tendrán RLS.
- Las fotografías tendrán reglas de acceso.
- Las claves secretas nunca estarán en React.
