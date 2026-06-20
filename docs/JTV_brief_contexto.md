# Brief de contexto â€” JTV.app (Electron + Vite IPTV)

> Documento de traspaso para continuar trabajando en este proyecto con Claude.
> No es un resumen cronolÃ³gico â€” es el criterio de decisiÃ³n usado hasta ahora,
> para que puedas extrapolarlo a problemas nuevos, no solo repetir lo ya hecho.

## 1. QuÃ© es este proyecto

AplicaciÃ³n de escritorio Electron + Vite para IPTV. El dueÃ±o se autodefine como
"vibe coder": el proyecto creciÃ³ orgÃ¡nicamente, sin arquitectura planeada desde
el inicio. Eso explica varios de los problemas que aparecen abajo.

## 2. Estado actual (al cierre de esta sesiÃ³n)

Se completÃ³ un refactor de modularizaciÃ³n de `renderer.js` (~6,800 lÃ­neas
monolÃ­ticas) hacia mÃ³dulos ES en `renderer/`. El refactor de extracciÃ³n ya
estaba hecho cuando empezamos a trabajar juntos; lo que resolvimos fue el
**efecto colateral**: variables y funciones que vivÃ­an en scope global
implÃ­cito del monolito quedaron "huÃ©rfanas" en los mÃ³dulos extraÃ­dos,
rompiendo la app al cargar.

**DiagnÃ³stico y fix completo, en orden:**
- `appState.js` centraliza el estado compartido en un objeto `state` Ãºnico,
  con getters/setters para compatibilidad legacy.
- `eventListeners.js` era el mÃ³dulo mÃ¡s afectado â€” quedÃ³ como "fÃ³sil" del
  legacy sin actualizar sus referencias a `state.*` ni sus imports.
- Se resolviÃ³ en sub-bloques (A, A.5, B, C, D), cada uno con commit propio,
  recarga de la app y verificaciÃ³n de consola antes de avanzar al siguiente.
- ESLint (`no-undef`, configurado manualmente sin plugin de resoluciÃ³n de
  imports) se usÃ³ como herramienta de descubrimiento masivo en un punto del
  proceso, no como medida continua de salud del cÃ³digo â€” generaba falsos
  positivos para imports y scope de funciÃ³n que sÃ­ estaban bien.

**Resultado:** la app carga sin `ReferenceError`, consola limpia, 0 errores
reales reportados. **Pendiente de validar:** prueba visual manual (clic real
en tabs, bÃºsqueda, paginaciÃ³n VOD, modal de editar canal) â€” no se hizo
todavÃ­a a fecha de este documento.

## 3. Decisiones de arquitectura tomadas (y por quÃ©)

Estas son las que importan para que no se reviertan sin querer en una sesiÃ³n
nueva que no tenga este contexto:

- **`channels` se mantiene como buffer local mutable** (`let channels =
  state.channels`) en `eventListeners.js`, NO como `state.channels` directo
  en cada uso. RazÃ³n: el cÃ³digo original reasigna `channels = channels.filter(...)`
  en varios puntos para CRUD; si se migrara a `state.channels` con reasignaciÃ³n
  directa, se romperÃ­a el vÃ­nculo con el estado real (mutaciÃ³n de propiedad
  vs. reasignaciÃ³n de variable es una distinciÃ³n clave en JS aquÃ­).
- **`favPage` y `vodFavPage` son conceptos distintos**, no se deben fusionar:
  `favPage` pagina el dashboard de Live TV, `vodFavPage` pagina la grilla VOD.
  Ambos viven en `state` por separado.
- **`addFilterToChannel`** se moviÃ³ de `eventListeners.js` a
  `filterManager.js` como `bindAddFilterToChannel({ getChannels,
  getCurrentEditingChannelId, renderAll })` â€” recibiendo dependencias como
  parÃ¡metros explÃ­citos, NO por closure. Esto es el patrÃ³n a seguir para
  cualquier handler similar que se descubra suelto en el futuro: mover al
  mÃ³dulo dueÃ±o de la lÃ³gica, nunca dejarlo en `eventListeners.js` con
  variables capturadas implÃ­citamente.
- **`updateSourceSwitcherUI`** vivÃ­a como `window.updateSourceSwitcherUI` en
  el `renderer.js` legacy (nunca migrado). Se extrajo a un mÃ³dulo nuevo
  `renderer/player/sourceSwitcher.js`, manteniendo el `window.*` legacy por
  compatibilidad. PatrÃ³n a repetir si aparecen mÃ¡s funciones "huÃ©rfanas del
  legacy" sin mÃ³dulo dueÃ±o: crear el mÃ³dulo correspondiente en vez de
  parchear en el lugar donde se descubriÃ³ el error.
- **`syncMenuScroll`** se eliminÃ³ (no existÃ­a en ningÃºn mÃ³dulo, llamada
  muerta del legacy). No se recreÃ³ â€” si hace falta a futuro, debe decidirse
  explÃ­citamente dÃ³nde vive.

## 4. Principios de proceso que funcionaron (replicar)

- **Evidencia antes que exploraciÃ³n ciega.** Nunca pedir "revisa todo el
  proyecto" â€” siempre: ejecutar, leer consola/logs real, y trabajar desde ahÃ­.
- **Verificar antes de asumir, incluso con patrones que parecen obvios.**
  Varias veces la primera hipÃ³tesis (ej. fusionar `favPage` con `vodFavPage`)
  resultÃ³ incorrecta tras verificar el cÃ³digo real.
- **Separar "investigar" de "aplicar fix".** Cada sub-bloque empezÃ³ con
  reporte de hallazgos y pausa explÃ­cita antes de tocar cÃ³digo.
- **Sub-bloques pequeÃ±os con commit + recarga + consola despuÃ©s de cada uno**,
  no un cambio masivo de una sola vez. Esto dio puntos de retorno reales y
  aislÃ³ quÃ© cambio causaba quÃ© efecto.
- **Git como red de seguridad obligatoria** antes de cualquier fix con alcance
  amplio (el proyecto no tenÃ­a git al inicio; se inicializÃ³ a mitad de
  proceso con un checkpoint limpio antes del fix masivo).
- **Distinguir entre lo "ya investigado" y lo "asumido por patrÃ³n"** â€” cuando
  un agente empieza a generalizar un hallazgo a archivos que no abriÃ³
  directamente, hay que frenarlo y pedir verificaciÃ³n real, no extrapolaciÃ³n.

## 5. Modelo usado hasta ahora

Todo este trabajo se hizo en el IDE Trae, con el modelo **MiniMax-M3**
(no Claude â€” Trae no tiene modelos de Anthropic disponibles). El criterio de
"Sonnet para ejecuciÃ³n, Opus para diseÃ±o/arquitectura" que se discutiÃ³ en
paralelo aplica si el trabajo se mueve a un entorno con Claude Code (VS Code,
Cursor, JetBrains) â€” no aplicÃ³ realmente a las sesiones de Trae documentadas
arriba.

## 6. QuÃ© falta / prÃ³ximos pasos sugeridos

1. Prueba visual manual del fix completo (ver secciÃ³n 2).
2. El usuario estÃ¡ considerando explorar Cloudflare (Pages/Workers/D1) como
   capa de infraestructura para otro proyecto suyo, TalentCRM â€” proyecto
   distinto a este, sin relaciÃ³n tÃ©cnica directa.
3. Si aparecen mÃ¡s sÃ­mbolos huÃ©rfanos en otros mÃ³dulos no auditados todavÃ­a
   (solo se hizo la auditorÃ­a completa de `eventListeners.js`), aplicar el
   mismo proceso: ESLint `no-undef` dirigido al archivo especÃ­fico, filtrar
   falsos positivos, verificar antes de fix, sub-bloques con commit.

## 7. Estado del repositorio

Sin remoto configurado (solo git local). Historial relevante:
```
2a95bbf fix: sub-bloque D - casos especiales resueltos, eventListeners.js limpio
32d8553 fix: sub-bloque C - exportar utilidades VOD desde favoritesGrid.js
dac7b1f fix: sub-bloque B - imports faltantes (renderAll, processLogo, etc.)
23c4686 fix: migrar favPage a state.favPage
d63d65b fix: sub-bloque A - state.* adicionales (eslint scan)
788e4b4 checkpoint inicial antes del fix masivo de imports/state
```
