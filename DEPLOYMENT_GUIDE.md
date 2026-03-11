# Guía de Despliegue — Registro Los Quetzales

> **Para cualquier asistente IA o desarrollador:** Lee esto ANTES de tocar el archivo `deploy.yml` o intentar cualquier cambio de infraestructura.

---

## ¿Cómo funciona el despliegue?

El proyecto usa **GitHub Actions** para compilar y subir automáticamente al servidor cada vez que se hace un `push` a la rama `main`.

El flujo es:
1. GitHub descarga el código
2. Ejecuta `npm run build` (genera la carpeta `dist/`)
3. Sube `dist/` al servidor de Hostinger usando **`lftp` con SFTP** (NO FTP clásico)

---

## Configuración del Servidor (Hostinger)

| Dato | Valor |
|------|-------|
| Host | Secreto `SSH_HOST` en GitHub |
| Puerto | Secreto `SSH_PORT` (es **65002**, NO el 22 ni el 21) |
| Usuario | Secreto `SSH_USER` |
| Contraseña | Secreto `SSH_PASSWORD` |
| **Carpeta destino** | `./domains/registro.residenciallosquetzales.com/public_html/` |

> **IMPORTANTE:** El usuario SSH de Hostinger está en un entorno "enjaulado" (chroot). Su carpeta raíz `~/` contiene tanto `./public_html/` (del dominio principal) como `./domains/` (subdominios). La app de Los Quetzales vive en `./domains/registro.residenciallosquetzales.com/public_html/`. **NO subirla a `./public_html/`** porque es otra web diferente.

---

## Regla de Oro del `lftp`

El comando de sincronización DEBE usar el flag **`--transfer-all`**, NO `--ignore-time`.

```bash
mirror --reverse --transfer-all --overwrite --verbose --exclude-glob *.map \
  ./dist/ ./domains/registro.residenciallosquetzales.com/public_html/
```

**¿Por qué?**
- `--ignore-time` le deja la decisión al servidor sobre si el archivo "cambió". En SFTP de Hostinger, los timestamps a veces no se comparan bien y el servidor cree que los archivos son iguales cuando no lo son → **los archivos viejos permanecen**.
- `--transfer-all` sube **siempre** todos los archivos, sin comparar. Es más lento pero garantiza que los cambios lleguen.

---

## Versionado de la PWA

La versión visible en la barra lateral está **hardcodeada** en:

`src/components/layout/Sidebar.tsx` → busca el texto `v1.3.X`

Y también en `package.json` → campo `"version"`.

Cada vez que se haga un cambio importante, **actualizar ambos números** para forzar al navegador a detectar una nueva versión del Service Worker.

---

## Lo que NO hay que hacer

- ❌ No usar `SamKirkland/FTP-Deploy-Action` → Hostinger bloquea FTP en puerto 21.
- ❌ No usar `appleboy/scp-action` → La jaula SSH de Hostinger no permite SCP directo.
- ❌ No cambiar la carpeta destino a `./public_html/` → Esa es otra aplicación distinta (miorquidea.com u otro dominio primario).
- ❌ No usar `--ignore-time` en el mirror de lftp → Causa que los archivos "viejos" no se sobreescriban.
- ❌ No abrir el navegador desde el asistente IA en este equipo → Se congela.

---

## Si el sitio no se actualiza después de un deploy exitoso

1. Verificar que el Action terminó con **bolita verde** en GitHub Actions.
2. En el navegador, hacer **Ctrl+Shift+R** (hard refresh) o borrar caché.
3. Si sigue igual, ir a DevTools → Application → Storage → **Clear site data** (con "Unregister service workers" marcado) → F5.
4. Probar en un celular o dispositivo que nunca haya abierto la página para descartar caché local.

---

## Secrets de GitHub requeridos

Deben estar configurados en: `Settings → Secrets and variables → Actions`

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`  
- `SSH_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
