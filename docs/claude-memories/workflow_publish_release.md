---
name: workflow-publish-release
description: "Flujo completo de publicación de releases para AutoUpdater: build, electron-builder publish y publicar draft en GitHub Releases"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c9a7f527-5a0a-439f-aeb6-b44aa0d2087c
---

# Flujo de Publicación de Releases para AutoUpdater

Cuando el usuario pida hacer un release, build y push de una nueva versión para que el botón "Check for Updates" la descargue:

1. **Bump de versión:**
   - `package.json` y `package-lock.json` (`version`).
   - `docs/BITACORAS_DE_MEJORAS.md` (cabecera de política y nueva sección).
   - `contexto_de_perfil.md` (árbol de directorios).

2. **Commit y push de código fuente:**
   - `git add <archivos modificados>`
   - `git commit -m "Release vX.Y.Z: ..."`
   - `git push origin master` (sube los commits a GitHub, pero **no** crea el release de binarios).

3. **Subida de artefactos a GitHub con `electron-builder`:**
   - Obtener el token de `.env` (`GH_TOKEN`).
   - Ejecutar:
     ```powershell
     $token = (Get-Content .env | Where-Object { $_ -match '^GH_TOKEN=' }) -replace '^GH_TOKEN=', ''
     $env:GH_TOKEN = $token.Trim()
     npx electron-builder --publish always
     ```
   - Esto compila los `.exe`, genera `latest.yml`, `.blockmap` y los sube a GitHub Releases.

4. **Publicar el Release (Undraft):**
   - **IMPORTANTE:** `electron-builder` crea la release en GitHub como **DRAFT** (`draft: true`).
   - Mientras esté como borrador, GitHub **no** la expone en `/releases/latest`, por lo que el botón "Check for Updates" en versiones anteriores dirá "Up to date" y no descargará la actualización.
   - Es **obligatorio** pasar el borrador a público llamando al endpoint PATCH de GitHub API:
     ```javascript
     PATCH https://api.github.com/repos/archbitscr/jtv-releases/releases/:id
     { "draft": false }
     ```
   - Verificar que `https://api.github.com/repos/archbitscr/jtv-releases/releases/latest` devuelva la nueva versión como pública con sus 4 artefactos (`.exe`, `.blockmap`, `portable.exe`, `latest.yml`).
