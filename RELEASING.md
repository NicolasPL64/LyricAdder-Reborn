# Cómo hacer una release

Guía para publicar una nueva versión de LyricAdder Reborn. El flujo está automatizado con
[release-please](https://github.com/googleapis/release-please) y
[tauri-action](https://github.com/tauri-apps/tauri-action).

## Cómo funciona

```
PR mergeada a main (feat/fix)
        │
        ▼
release-please calcula la versión y abre "chore(main): release vX.Y.Z"
        │
        ▼
mergeas la PR de release
        │
        ▼
release-please crea el tag vX.Y.Z + un draft de GitHub Release
        │
        ▼
el tag dispara "Build and Release Tauri App" (main.yml)
        │
        ▼
tauri-action compila (Windows/macOS/Linux) y sube los instaladores al draft
        │
        ▼
tú revisas el draft y lo publicas → los usuarios reciben la actualización
```

## Configuración de una sola vez (importante)

Estos pasos solo hay que hacerlos una vez en GitHub:

1. **Proteger `main`**: Settings → Branches → Add rule:
   - Branch: `main`.
   - Require a pull request before merging (approvals: 1).
   - Require status checks to pass before merging: `Frontend (type-check, unit, e2e)` y `Rust (cargo test)`.
   - Require branches to be up to date before merging.
   - Marca **"Do not allow bypassing the above settings"** para que ni el owner pueda saltarse las reglas.
2. **Crear un PAT (Personal Access Token)**:
   - GitHub → Settings → Developer settings → Personal access tokens → Fine-grained.
   - Repository access: **solo este repo** (debe estar seleccionado explícitamente si el repo es privado).
   - Permissions del repo:
     - **Contents → Read and write**
     - **Pull requests → Read and write**
     - **Issues → Read and write**
     - **Actions → Read-only** (sin este permiso falla con "Resource not accessible by personal access token").
     - Si sigue fallando, añade **Workflow → Read and write**.
   - Alternativa más simple: **classic PAT** con scope `repo` (incluye todo lo anterior).
   - Cópialo y añádelo como secret `RELEASE_PLEASE_TOKEN` en Settings → Secrets and variables → Actions.
   - ⚠️ **No uses `GITHUB_TOKEN` en `release.yml`**: los eventos que crea `GITHUB_TOKEN` (tag/release) no lanzan otros workflows, y `main.yml` nunca se ejecutaría.
3. **Workflow permissions**: Settings → Actions → General → Workflow permissions → **Read and write permissions**. Marca también **"Allow GitHub Actions to create and approve pull requests"**.
4. **Secrets ya necesarios** (no crearlos de nuevo):
   - `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (firma del updater).
   - `GITHUB_TOKEN` es automático.

## Release normal (automática)

1. Escribe tus commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...` → sube menor (ej. `0.0.7` → `0.1.0`).
   - `fix: ...`, `chore: ...`, `docs: ...` → sube patch (ej. `0.0.7` → `0.0.8`).
   - `feat!: ...` o `BREAKING CHANGE:` → sube mayor.
2. Mergea los PRs a `main`. El CI (`ci.yml`) correrá los checks obligatorios (type-check, tests unit, e2e y cargo test).
3. Cuando haya cambios que publicar, release-please abrirá una PR **"chore(main): release vX.Y.Z"** con el bump de `package.json` y el `CHANGELOG.md` generado.
4. Mergea esa PR de release.
5. release-please crea el **tag** `vX.Y.Z` y un **draft release**. El tag dispara `main.yml`, que compila y sube los instaladores al draft (varios minutos).
6. Ve a **Releases** en GitHub, revisa el draft (instaladores, `latest.json`, notas) y pulsa **Publish release**.
7. Publicada, `releases/latest` apunta a ella y los usuarios con el updater la reciben.

No toques ninguna tag a mano ni edites el número de versión: lo gestiona todo el flujo.

## Casos manuales (overrides)

### Forzar una versión concreta

Añade un commit con el footer `Release-As: 1.2.3` (o hazlo en cualquier PR de la rama)
y mergea: release-please usará esa versión en vez de calcularla.

### Build de prueba para un solo usuario / versión específica

1. Bumpa `package.json` a `0.0.8` en una rama (p. ej. `dev`), haz commit.
2. Crea la tag localmente y súbela explícitamente:

   ```
   git tag v0.0.8
   git push origin v0.0.8
   ```

   ⚠️ `git push` normal **no** sube tags; usa `git push origin <tag>` o `git push --follow-tags`.
3. El build se lanza y tauri-action crea el draft. Si quieres que **solo ese usuario** lo pruebe,
   marca la release como **prerelease** o pásale el enlace directo del instalador:
   el updater ignora prereleases/drafts para `releases/latest`, así que no se ofrece en masa.

### Quitar la PR de release de en medio

Si no quieres esperar la PR de release, puedes bumpar `package.json`, crear la tag
`vX.Y.Z` y pushearla: `main.yml` compila igualmente. Release-please lo detectará como
ya publicado y continuará desde ahí.

## Solución de problemas

- **No se lanzó ningún Action al pushear una tag**: la tag no llegó al remoto
  (`git push` no sube tags) o el evento lo creó `GITHUB_TOKEN` (necesitas el PAT).
- **Error "release is not a draft" en tauri-action**: la release para ese tag ya existía
  publicada pero `releaseDraft: true`. Publica/corrige el estado o borra la release y repite.
- **Error "Resource not accessible by personal access token" en release.yml**: el PAT
  no tiene los permisos de escritura necesarios (ver sección de configuración, paso 2).
- **Error "packages field missing or empty" en ci.yml (pnpm)**: `pnpm-workspace.yaml`
  debe tener el campo `packages` (p. ej. `packages: ["."]`).
- **Error `ERR_PACKAGE_PATH_NOT_EXPORTED` de vue-tsc**: `typescript` debe estar en la
  línea 5.x (`~5.9.3`); vue-tsc todavía no soporta TypeScript 7.
- **El updater no actualiza**: recuerda **publicar** el draft; `releases/latest` solo
  apunta a releases publicadas (no drafts/prereleases).

## Repos privados

El build + creación de release **funciona** en repos privados (`GITHUB_TOKEN` y secrets
funcionan). Pero **el auto-updater NO funcionará para usuarios finales**: el endpoint
`https://github.com/<owner>/<repo>/releases/latest/download/latest.json` y los instaladores
son privados y la app no puede autenticarse → 403/404. Para distribuir actualizaciones
necesitas repo público o alojar `latest.json` + instaladores en otro sitio (S3, CDN, etc.).

## Archivos implicados

| Archivo | Qué hace |
| --- | --- |
| `.github/workflows/main.yml` | Build + subida de assets (disparado por tag `v*`). |
| `.github/workflows/ci.yml` | Checks obligatorios en PRs: type-check, unit, e2e, cargo test. |
| `.github/workflows/release.yml` | Ejecuta release-please en cada push a `main`. |
| `release-please-config.json` | Config: release-type node, draft + tag forzado. |
| `.release-please-manifest.json` | Última versión publicada (`0.0.7`). |

> **Versión**: la única fuente de verdad es `package.json`. `tauri.conf.json` ya apunta a él.
> No hace falta tocar `src-tauri/Cargo.toml` (su versión es cosmética y no afecta al release).
> **Lint**: no forma parte de los checks obligatorios del CI; `pnpm lint` funciona localmente
> (ESLint 10 + flat config) y los `no-explicit-any` están en "warn".