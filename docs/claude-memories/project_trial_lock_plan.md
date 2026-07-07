---
name: trial-lock-plan
description: "Plan de evolución del Trial Lock — licenciamiento con Supabase + PayPal, UUID de máquina, doble verificación"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a9aedc-fa93-4c83-ad3e-2e7b76568a26
---

## Trial Lock — Plan de licenciamiento

**Identificador de máquina:** UUID de placa base (`wmic csproduct get UUID`), atado a cada licencia.

**Servicio de licencias:** Opción C — Supabase (proyecto nuevo por crear).
- Tabla `licenses(uuid, email, paypal_txn, created_at)`.
- Edge Function recibe webhook de PayPal, guarda el registro.
- La app consulta Supabase con su UUID → si existe → se desbloquea automáticamente.
- **Automatizado** como flujo principal, **manual** como método redundante/emergencia.

**Doble verificación del trial (pendiente):**
- Registro de Windows (`HKCU\Software\prnt\driver_config`) — ya implementado.
- Campo cifrado en `jtv_data.json` — por implementar.
- Opcionalmente `birthtime` de `jtv_data.json` como tercera capa.

**UX de pago:**
- En la app, el usuario ve un botón de pago con PayPal (reemplaza autenticación con Google).
- El botón abre el browser por defecto del sistema en una ventana/pestaña nueva, directo al URL de la pasarela de pago de PayPal.

**Why:** El trial actual depende solo de una llave de registro fácilmente borrable. Se necesita un sistema de licenciamiento real atado a pago.

**How to apply:** Al implementar, crear proyecto Supabase nuevo para JTV, configurar tabla + Edge Function + integración PayPal. No iniciar implementación hasta que el usuario lo indique.
