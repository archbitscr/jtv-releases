# PERFIL DE CONTEXTO DEL PROYECTO: JTV.app

## 1. ADN y Propósito del Proyecto
- **Visión General:** JTV.app es una aplicación de escritorio multiplataforma diseñada para la visualización y streaming de canales de televisión (IPTV), películas y series.
- **Objetivos de Negocio:** Ofrecer un reproductor de medios e IPTV ligero, rápido y autohospedado que permita a los usuarios cargar catálogos y organizar su contenido multimedia sin depender de reproductores externos complejos.
- **Alcance Actual vs. Futuro:** Cuenta con una interfaz inicial de catálogo de series y películas (v2), código de scraping de eventos e indexadores. En el futuro se planea implementar un reproductor integrado nativo y sincronización de listas M3U.

## 2. Stack Tecnológico y Arquitectura
- **Core Stack:**
  - Electron v30.0.0
  - HTML5 / CSS3 / Vanilla JavaScript
  - Vite v5.0.0 (Para el bundle y desarrollo ágil)
- **Arquitectura de Software:** Estructura clásica de Electron con separación estricta de responsabilidades:
  - `main.js`: Control del proceso principal.
  - `preload.cjs`: Carga de módulos de sistema protegidos.
  - `renderer.js`: Control de la interfaz e interacción del usuario en la ventana del navegador.
- **Flujo de Datos:** El renderizador solicita recursos y realiza scraping local usando APIs Node expuestas por `preload.cjs`.

## 3. Estructura del Directorio y Mapeo de Código
- **Árbol de Directorios Comentado:**
  - `main.js`: Lógica principal del ciclo de vida de Electron.
  - `preload.cjs`: Script puente de seguridad CommonJS.
  - `renderer.js`: Lógica del lado cliente. Maneja renderizado dinámico del DOM.
  - `style.css`: Estilos de la interfaz principal.
  - `scratch_*.js`: Scripts experimentales para scraping y ordenación de categorías y eventos de vídeo.
- **Entry Points:**
  - Proceso Principal: `main.js`
  - Renderer: `index.html` (interconectado con `renderer.js` y `style.css`)

## 4. Modelo y Estructura de Datos
- **Modelo de datos:** Estructura de catálogos basada en JSON para organizar canales, películas y series clasificadas por categorías.
- **Servicios de Terceros:** Scraping directo desde fuentes de streaming e IPTV y decodificación de listas M3U locales/remotas.

## 5. Estándares de Desarrollo y Guías de Estilo
- **Reglas de Codificación:** Código JS modular clásico, promesas nativas para peticiones asíncronas, manipulación directa y eficiente del DOM.
- **Librería de Componentes y UI:** Interfaz limpia construida con Vanilla CSS (`style.css`), enfocada en la visualización tipo parrilla/mosaico de contenido multimedia (estilo catálogo OTT).

## 6. Workflow y Comandos Útiles
- `npm run start`: Inicia la aplicación de Electron localmente.
- `npm run dev`: Lanza el servidor de desarrollo de Vite.
- `npm run build`: Empaqueta la aplicación para distribución multiplataforma con `electron-builder`.

## 7. Historial de Decisiones Arquitectónicas (ADR)
- **Vanilla JS en lugar de React/Vue:** Se optó por una arquitectura de Vanilla JS ligera para el front-end con el fin de optimizar el tiempo de carga del catálogo de IPTV y mantener el consumo de recursos al mínimo absoluto en equipos de baja especificación.
