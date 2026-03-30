# Registro Web - Los Quetzales: AI Context Document
**Última actualización:** 2026-03-30 | **Versión actual:** `1.6.28`

Este documento sirve como "memoria técnica" para cualquier asistente IA que interactúe con el código fuente de este proyecto en el futuro. Léelo antes de sugerir cambios estructurales.

---

## 🔴 SESIÓN ACTIVA — Leer Primero

### Estado al 30/03/2026 (~00:30 CST)
- El panel de **WhatsApp** (`WhatsApp.tsx`) fue rediseñado con un layout moderno de *Chat Bubbles* (`ChatMonitorDrawer`) separado de la configuración de instancia.
- **Automatización**: Se resolvió el error de Webhook; los mensajes de n8n hacia Evolution API ya llevan el payload raw en el Formato correcto (validado a través de inyecciones a la Rest API).
- **Despliegue**: Se corrigió `deploy.yml` para transferir los _Secrets_ de variables de entorno (`VITE_N8N_BASE_URL`, etc), habilitando el indicador de estado Conectado oficial y AI en producción en Hostinger.
- **Knowledge Base (IA Context)**: El prompt predeterminado (`DEFAULT_LLMS_CONTEXT`) fue actualizado al compendio de Drive enfocado en *Transparencia Total* para el bot Deepseek.

### MCP n8n Configurado
- **Server URL:** `https://n8n-prueba1-n8n.exigs1.easypanel.host/mcp-server/http`
- **Workflow / Trigger Principal:** Webhooks de Evolution API v2 (`MESSAGES_UPSERT`).

### Próximos pasos acordados
- [ ] Afinar los _Nodes_ dentro de n8n (vía MCP o terminal) para mejorar el flujo condicional del chatbot.
- [ ] Habilitar funcionalmente el envío manual desde el Input del `ChatMonitorDrawer` panel para la intervención humana táctica.

---

## 1. Stack Tecnológico
- **Frontend / Core:** React 19 (Hooks, Functional Components), TypeScript.
- **Build Tool:** Vite 7 (con soporte estricto para PWA vía `vite-plugin-pwa`).
- **Backend / BaaS:** Supabase (PostgreSQL para Base de Datos, Auth para manejo de sesiones, Storage para imágenes).
- **Estilos:** CSS Modules y variables CSS puras (`index.css`). Diseños basados en Glassmorphism (paneles translúcidos) y estética Cyberpunk/Tech (colores neón, acentos cyan/verde/naranja).
- **Despliegue:** Hostinger vía GitHub Actions (SFTP).
- **Automatizaciones:** n8n (self-hosted en EasyPanel) — **NUEVO, integrado en sesión 2026-03-29**

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
- **OBLIGATORIO - REGLA DE DESPLIEGUE:** Cada vez que modifiques código y lo subas al servidor/GitHub (con git push), **DEBES** actualizar el número de versión (ej. 1.6.0 -> 1.6.1) en `package.json` y `Sidebar.tsx`. Es la única forma en la que el usuario puede notar si el build terminó exitosamente. Nunca olvides actualizar la versión.

### C. Generación de Contratos PDF
- La ruta de Clientes permite generar contratos de compra-venta usando `jspdf` y `jspdf-autotable`.
- Estos documentos incorporan marcas de agua dinámicas e incluyen textos jurídicos con saltos de línea y cláusulas formales pre-programadas.

### D. Tracking de Sesiones y Notificaciones
- El sistema utiliza `Supabase Realtime Presence` para saber quién está "En Línea".
- Las acciones críticas interactúan con la tabla `profiles` grabando el `last_action` del usuario.
- **Notificaciones en Tiempo Real:** La campana superior lee de la tabla `notifications` agrupada mediante Websockets. Actualmente se disparan alertas automáticas (`auth.users`) al ser asignado como asesor de un prospecto desde `Clientes.tsx` o al haber un cambio de inventario.

### E. Mapeo URL y Calculadora (Integration Map -> Calc)
- Los tooltips del mapa pasan parámetros contextuales por la query URL (`?manzana=2&modelo=QUETZAL...`) que `Calculadora.tsx` parsea automáticamente para prellenar los selects.
- **Normalización de Texto:** La base de datos del mapa y la de los precios base no siempre coinciden ortográficamente (Ej. 'QUETZAL ROOF' vs 'QUETZAL C/ROOF GARDEN'). La calculadora posee una capa de *fuzzy matching* básico o limpieza de substrings para remapear estos valores al inicializar la visa.

### F. Motor Unificado de Estatus de Inventario
- Existen tres flujos de la verdad para conocer si una casa está libre: lo que dice el CSV importado de Google Sheets, lo que sobreescribió un humano, y el contador estadístico del Dashboard. Todos ellos **deben** resolverse usando el serivicio `inventarioEstatusService.ts -> resolveEstatus()`, que es la única fuente de la verdad para transformar strings como "Entregada", "Apartada" en los flags canónicos (`DISPONIBLE`, `EN_PROCESO`, `VENDIDA`).

### G. Integración de WhatsApp y Chatbot IA (Evolution API + n8n)
- **Instancias Múltiples:** La app soporta múltiples teléfonos usando Evolution API. El Webhook principal está atado a n8n para procesamiento de DeepSeek.
- **UI Distribuida:** En la pantalla web se maneja un `InstanceDrawer` para llaves de configuración, y un `ChatMonitorDrawer` moderno para leer los mensajes en tiempo real con diseño de burbujas (_auto-scroll_ implementado).
- **Estado In-Sync:** Supabase Realtime detecta los Webhooks registrados por n8n y vuelve a pintar la UI sin refrescar.

## 4. Notas para Agentes IA
- Si tienes que tocar infraestructura de Despliegue, revisa OBLIGATORIAMENTE el `DEPLOYMENT_GUIDE.md` en la raíz primero.
- Mantén siempre el estilo de UI prémium: al crear modales o alertas, usa `backdrop-filter: blur()`, acentos brillantes, layouts flex/grid estrictos, y prioriza la legibilidad en fondos oscuros (`#07090E`).
- **No inventes rutas backend:** Todas las operaciones de Base de Datos usan el cliente SSR de `@supabase/supabase-js`. Preferir métodos asíncronos en carpetas abstractas (ej. `services/`).
- **MCP de n8n disponible:** Al iniciar una sesión nueva, el MCP `n8n-mcp` debería estar activo en Antigravity. Úsalo para ver y crear workflows de automatización. Si no aparece, revisa `C:\Users\Dynabook\.gemini\antigravity\mcp_config.json`.
