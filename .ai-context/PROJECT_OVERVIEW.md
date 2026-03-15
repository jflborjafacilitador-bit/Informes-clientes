# Registro Web - Los Quetzales: AI Context Document

Este documento sirve como "memoria técnica" para cualquier asistente IA que interactúe con el código fuente de este proyecto en el futuro. Léelo antes de sugerir cambios estructurales.

## 1. Stack Tecnológico
- **Frontend / Core:** React 19 (Hooks, Functional Components), TypeScript.
- **Build Tool:** Vite 7 (con soporte estricto para PWA vía `vite-plugin-pwa`).
- **Backend / BaaS:** Supabase (PostgreSQL para Base de Datos, Auth para manejo de sesiones, Storage para imágenes).
- **Estilos:** CSS Modules y variables CSS puras (`index.css`). Diseños basados en Glassmorphism (paneles translúcidos) y estética Cyberpunk/Tech (colores neón, acentos cyan/verde/naranja).
- **Despliegue:** Hostinger vía GitHub Actions (SFTP).

## 2. Modelos de Roles y Permisos (`AuthContext.tsx`)
Existen distintos niveles de usuario que restringen el acceso a vistas (Sidebar) y funcionalidades:
- **`super_admin` / `master` / `admin`:** Acceso total (Dashboard, Clientes, Reportes, Calendario, Usuarios, Calculadora, Map Editor).
- **`escrituracion`:** Solo tiene acceso a Inventario, Calculadora y Configuración.
- **`recepcion`:** Acceso a Catering, Calendario y Configuración.

## 3. Funcionalidades Clave y "Gotchas"

### A. Mapa Interactivo (`MapEditor.tsx`)
- **Renderizado Vectorial Relativo:** El mapa utiliza una imagen de fondo (Carga desde Supabase Storage) y renderiza polígonos `<svg>` encima usando coordinadas relativas porcentuales (`0` a `100%`) para garantizar la responsividad.
- **Herramientas de Edición:** El administrador puede dibujar lotes, Mover Globalmente todos los lotes a la vez (Offset, Scale, Skew paramétrico), y **"Mover Uno x Uno"**.
- **Snapping y Guias Inteligentes:** En el modo "Uno x Uno", los polígonos tienen un imán matemático (0.5% de threshold) que busca las aristas de otros polígonos y las ajusta lanzando guías visuales punteadas de color naranja.
- **State management del Mouse:** Al editar o arrastrar polígonos, la librería de Zoom/Pan externa (`react-zoom-pan-pinch`) debe desactivar su Panning, de lo contrario colisiona con el evento SVG `MouseMove`.

### B. App Instalable (PWA)
- El archivo `vite.config.ts` utiliza Workbox. Para compilar archivos pesados como los planos del mapa, el valor `maximumFileSizeToCacheInBytes` está aumentado a `15000000` (15 MB) para no fallar el build en GitHub Actions.
- La versión manual hardcodeada debe mantenerse sincronizada en el `Sidebar.tsx` y en el `package.json`.

### C. Generación de Contratos PDF
- La ruta de Clientes permite generar contratos de compra-venta usando `jspdf` y `jspdf-autotable`.
- Estos documentos incorporan marcas de agua dinámicas e incluyen textos jurídicos con saltos de línea y cláusulas formales pre-programadas.

### D. Tracking de Sesiones de Usuario
- El sistema utiliza `Supabase Realtime Presence` para saber quién está "En Línea".
- Se realiza un *heartbeat* cada minuto en `App.tsx` para actualizar el `last_seen`.
- Las acciones críticas interactúan con la tabla `profiles` grabando el `last_action` del usuario.

## 4. Notas para Agentes IA
- Si tienes que tocar infraestructura de Despliegue, revisa OBLIGATORIAMENTE el `DEPLOYMENT_GUIDE.md` en la raíz primero.
- Mantén siempre el estilo de UI prémium: al crear modales o alertas, usa `backdrop-filter: blur()`, acentos brillantes, layouts flex/grid estrictos, y prioriza la legibilidad en fondos oscuros (`#07090E`).
- **No inventes rutas backend:** Todas las operaciones de Base de Datos usan el cliente SSR de `@supabase/supabase-js`. Preferir métodos asíncronos en carpetas abstractas (ej. `services/`).
