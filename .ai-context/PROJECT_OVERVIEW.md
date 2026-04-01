# Registro Web - Los Quetzales: AI Context Document
**Última actualización:** 2026-04-01 | **Versión actual:** `1.6.35`

Este documento sirve como "memoria técnica" para cualquier asistente IA que interactúe con el código fuente de este proyecto en el futuro. Léelo antes de sugerir cambios estructurales.

---

## 🔴 SESIÓN ACTIVA — Leer Primero

### Estado al 01/04/2026 (~18:30 CST)

#### Cambios críticos aplicados en esta sesión:
- **RLS Supabase:** Se creó la migración `20260401_fix_rls_clients.sql` que permite al rol `master` hacer SELECT e INSERT en la tabla `clients`. **PENDIENTE: aplicar manualmente en el SQL Editor de Supabase Dashboard.**
- **Botón "Nuevo Contacto":** Ahora visible también para el rol `master` (`Clientes.tsx`).
- **Google Sheets:** Integrado el webhook del Apps Script desplegado en ambos flujos de registro:
  - `NewClientModal.tsx` → POST a Google Sheets tras INSERT manual.
  - `UserLanding.tsx` → POST a Google Sheets tras INSERT desde landing.
  - **URL del Apps Script:** `https://script.google.com/macros/s/AKfycbzygK0jaoBPd2bIbXR2Ypv-b_mGUCnZb5nXiYh629XQ-Dfhv9EVn9jwm5cpm6_9AvTNQA/exec`
  - **Prueba exitosa:** `{"success":true}` confirmado vía PowerShell.
- **n8n Workflow `iJkJqQsNI6u4BXu6` actualizado (16 nodos, activo):**
  - **Multimedia:** Soporte de audio (Whisper `whisper-1`) e imágenes (GPT-4o Vision `gpt-4o-mini`).
  - **Flujo multimedia:** Evolution API → Detectar tipo → Descargar Base64 → OpenAI → AI Agent.
  - **API OpenAI:** `sk-proj-youuPPrk-…` integrada como Bearer token en nodos HTTP de Whisper y GPT-4o.
  - **Landing page:** El webhook `/webhook/landing-agent` envía siempre el mensaje de bienvenida **desde el número específico del asesor dueño de la landing**, sin importar si el botón `ai_enabled` está apagado.
  - **WhatsApp directo:** Solo responde si `ai_enabled = true` en la base de datos.

#### Flujo n8n actualizado:
```
WhatsApp entrante
   → Ignorar si es de la IA (fromMe = true) o grupo
   → ¿Es audio? → Descargar Base64 → Whisper → AI Agent → Enviar WA
   → ¿Es imagen? → Descargar Base64 → GPT-4o Vision → AI Agent → Enviar WA
   → Texto → Verificar ai_enabled (RPC Supabase) → (si ON) → AI Agent → Enviar WA

Landing Page (SIEMPRE, independiente de ai_enabled)
   → AI Agent → Enviar WA desde número del asesor dueño de la landing
```

### MCP n8n Configurado
- **Server URL:** `https://n8n-prueba1-n8n.exigs1.easypanel.host/mcp-server/http`
- **Workflow / Trigger Principal:** ID `iJkJqQsNI6u4BXu6` — Webhooks de Evolution API v2 (`MESSAGES_UPSERT`).
- **Landing webhook:** `/webhook/landing-agent` (POST desde `UserLanding.tsx`).

### Pendientes críticos acordados
- [ ] **Aplicar migración RLS** en el SQL Editor de Supabase: `supabase/migrations/20260401_fix_rls_clients.sql`
- [ ] Verificar que el registro de TEST en Google Sheets aparece en la hoja correcta.
- [ ] Probar registro end-to-end: landing → Supabase → Google Sheets → WhatsApp de bienvenida.

---

## 1. Stack Tecnológico
- **Frontend / Core:** React 19 (Hooks, Functional Components), TypeScript.
- **Build Tool:** Vite 7 (con soporte estricto para PWA vía `vite-plugin-pwa`).
- **Backend / BaaS:** Supabase (PostgreSQL para Base de Datos, Auth para manejo de sesiones, Storage para imágenes).
- **Estilos:** CSS Modules y variables CSS puras (`index.css`). Diseños basados en Glassmorphism (paneles translúcidos) y estética Cyberpunk/Tech (colores neón, acentos cyan/verde/naranja).
- **Despliegue:** Hostinger vía GitHub Actions (SFTP).
- **Automatizaciones:** n8n (self-hosted en EasyPanel) + Evolution API v2 + OpenAI (Whisper + GPT-4o).

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
- **OBLIGATORIO - REGLA DE DESPLIEGUE:** Cada vez que modifiques código y lo subas al servidor/GitHub (con git push), **DEBES** actualizar el número de versión (ej. 1.6.0 -> 1.6.1) en `package.json`. La versión se lee dinámicamente en `Sidebar.tsx` vía `import pkg from '../../package.json'`. Nunca olvides actualizar la versión.

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

### G. Integración de WhatsApp y Chatbot IA (Evolution API + n8n + OpenAI)
- **Instancias Múltiples:** La app soporta múltiples teléfonos usando Evolution API. El Webhook principal está atado a n8n para procesamiento con DeepSeek (respuestas de texto) y OpenAI (multimedia).
- **Multimedia:** El workflow de n8n detecta audio/imagen automáticamente. Audio → Whisper API, Imagen → GPT-4o Vision. El texto procesado se pasa al AI Agent como contexto enriquecido.
- **Landing Page Flow (CRÍTICO):** Los registros de landing SIEMPRE disparan el mensaje de bienvenida desde el número WhatsApp del asesor dueño de esa landing, sin importar el estado del botón `ai_enabled`. Esto garantiza que el asesor pueda apagar su IA para conversaciones manuales sin cortar los mensajes de bienvenida automáticos.
- **AI Enabled:** Controlado por la función RPC `is_ai_enabled` en Supabase. El workflow de WhatsApp directo la consulta antes de responder.
- **UI Distribuida:** En la pantalla web se maneja un `InstanceDrawer` para llaves de configuración, y un `ChatMonitorDrawer` moderno para leer los mensajes en tiempo real con diseño de burbujas (_auto-scroll_ implementado).

### H. Google Sheets Sync (NUEVO - v1.6.35)
- **Apps Script URL:** `https://script.google.com/macros/s/AKfycbzygK0jaoBPd2bIbXR2Ypv-b_mGUCnZb5nXiYh629XQ-Dfhv9EVn9jwm5cpm6_9AvTNQA/exec`
- **Google Sheet ID:** `1bmXQsH-U6HQAyVi-im2mZTqK7RvGrBaakxaXlrBas1s`
- **Campos enviados:** `fecha, nombre, telefono, correo, presupuesto, financiamiento, asesor, estado, notas`.
- **Integración:** Fire-and-forget (no bloquea el flujo). Se llama desde `NewClientModal.tsx` (registro manual) y `UserLanding.tsx` (registro por landing).
- **Content-Type:** DEBE ser `text/plain` (no `application/json`) para evitar errores CORS del Apps Script.

## 4. Credenciales, URLs y Configuración
| Servicio | URL / Valor |
|---|---|
| Supabase | `https://mxucntphfihiyctxiffs.supabase.co` |
| n8n | `https://n8n-prueba1-n8n.exigs1.easypanel.host` |
| Evolution API | `https://n8n-prueba1-evolution-api.exigs1.easypanel.host` |
| Evolution API Key | `429683C4C977415CAAFCCE10F7D57E11` |
| Instancia WA 1 | `ventas-digital` (Joseph Borja) |
| Instancia WA 2 | `admin-prueba` (Marlon Brandon) |
| Google Sheets | `1bmXQsH-U6HQAyVi-im2mZTqK7RvGrBaakxaXlrBas1s` |
| Apps Script | Ver sección H |

## 5. Notas para Agentes IA
- Si tienes que tocar infraestructura de Despliegue, revisa OBLIGATORIAMENTE el `DEPLOYMENT_GUIDE.md` en la raíz primero.
- Mantén siempre el estilo de UI prémium: al crear modales o alertas, usa `backdrop-filter: blur()`, acentos brillantes, layouts flex/grid estrictos, y prioriza la legibilidad en fondos oscuros (`#07090E`).
- **No inventes rutas backend:** Todas las operaciones de Base de Datos usan el cliente SSR de `@supabase/supabase-js`. Preferir métodos asíncronos en carpetas abstractas (ej. `services/`).
- **MCP de n8n disponible:** Al iniciar una sesión nueva, el MCP `n8n-mcp` debería estar activo en Antigravity. Úsalo para ver y crear workflows de automatización. Si no aparece, revisa `C:\Users\Dynabook\.gemini\antigravity\mcp_config.json`.
- **RLS Supabase:** El rol `anon` solo puede INSERT en `clients` cuando `origen = 'landing_propia'`. El rol `authenticated` solo puede INSERT con `origen = 'propio'` y `asesor_id = auth.uid()`. Los roles `admin`, `master`, `super_admin`, `gerente` pueden SELECT todos los registros.
