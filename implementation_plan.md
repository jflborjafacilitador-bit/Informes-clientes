# Restauración y Optimización del Agente WhatsApp & Landing

El usuario reporta que:
1. El workflow de n8n **desapareció** o está inactivo.
2. La Landing Page **no** envía el mensaje de WhatsApp.
3. El frontend muestra éxito, pero los clientes no aparecen en el registro.
4. Se requiere soporte para **notas de voz (audio)** e **imágenes**.
5. Hay preocupación por textos demasiado largos y poca fluidez en las respuestas de la IA.

## Análisis Técnico

1. **Dashboard vacío de clientes:** Al probar la landing de producción, la versión hospedada en Vercel aún ejecuta el antiguo método `supabase.rpc('register_lead')`. Como dicha función fue eliminada para cumplir con la nueva arquitectura en sesiones anteriores, el request falla por detrás y el cliente nunca se guarda. **No se han pusheado los cambios a GitHub para que Vercel reconstruya.**
2. **Falta del workflow:** Las consultas a la API de n8n (`mcp_n8n-mcp_search_workflows`) muestran 0 workflows. El entorno de n8n está vacío o el proyecto previo se eliminó.
3. **Multimedia (Visión y Audio):** El webhook de Evolution API incluye un payload binario (`message.audioMessage` o `message.imageMessage`). Para soportarlo dentro de n8n necesitamos descargar el archivo mediante el nodo HTTP Request y procesarlo con OpenAI Whisper/Vision ANTES del nodo del Agente IA y enrutar su texto.
4. **Fluidez Humana y Longitud:** El LLM Context ya se actualizó localmente (línea 396: "Mensajes cortos (<20 palabras), profesionales"). Falta asegurar que esta configuración se sincronice al *insertar/actualizar* instancias locales y se inyecte al prompt del Agente n8n.

---

> [!IMPORTANT]
> **Aprobación del Plan Requerida**
> Antes de ejecutar los cambios, revisa las acciones y confirma si estás de acuerdo con proceder. Especialmente, nota que los audios e imágenes requerirán nodos extra en tu n8n con tu apiKey de OpenAI.

## Proposed Changes

### 1. Sistema Frontend (Landing)
Subiremos a producción el parche que cambia el registro `RPC` a un `INSERT` directo de Supabase, lo cual solucionará de inmediato la caída del formulario público.

#### [MODIFY] [src/pages/UserLanding.tsx](file:///c:/Users/Dynabook/OneDrive/Escritorio/Quetzalez/Aplicaciones/Registro%20web/src/pages/UserLanding.tsx)
- Se confirmará que los campos como `tipo_financiamiento: formData.presupuesto` están insertando correctamente el valor del presupuesto para que sean visibles en el recuadro del asesor.

#### [MODIFY] [GitHub Push]
- Haré un `git commit` y `git push` de manera autónoma en este contenedor para que tu Vercel detecte los cambios y actualice la Landing de forma oficial.

---

### 2. Sincronización de Base de Datos
#### [MODIFY] [src/pages/Clientes.tsx](file:///c:/Users/Dynabook/OneDrive/Escritorio/Quetzalez/Aplicaciones/Registro%20web/src/pages/Clientes.tsx)
- Modificación menor si es necesario para asegurarse de que carguen los leads propios (aunque actualmente se basan en el `asesor_id` correctamente asignado).

---

### 3. Workflow de Respuesta Inteligente (n8n)
#### [NEW] [wf_multimedia.json](file:///c:/Users/Dynabook/OneDrive/Escritorio/Quetzalez/Aplicaciones/Registro%20web/wf_multimedia.json)
Crearemos y *empujaremos* (haremos un push mediante API usando nuestro script de control) un nuevo Workflow a tu cuenta de n8n que incluirá:

1. **Reconocimiento de Texto (Switch):** Filtra si el webhook de WhatsApp entrante es archivo de imagen/audio o texto plano.
2. **Reconocimiento de Audio (Whisper):** Extraerá el mensaje `document` o `audioMessage`, descargará el binario y lo transcribirá a texto usando OpenAI.
3. **Reconocimiento de Imágenes (Vision):** Enviaremos la imagen descargada hacia GPT-4o-mini con rol de Vision para que la describa en el contexto de la venta.
4. **Agente IA principal:** Recibe la instrucción de texto plano, ya sea transcrita, enviada directamente, o de los detalles explícitos de la imagen.

## Open Questions

> [!WARNING]
> ¿Estás de acuerdo con el despliegue automático hacia Vercel y n8n?
> Toma en cuenta que el uso del modelo Whisper y Vision consume una fracción de saldo de tu cuenta de OpenAI (OpenAI API key), de la misma cuenta que actualmente factura los textos de los Asesores. 

## Verification Plan

### Automated Tests
- Correr el script `npx ts-node push_to_n8n.cjs` para asegurar la creación del workflow y atrapar su `id`.
- Revisar en `git status` que se haya creado correctamente el commit de producción.

### Manual Verification
- Te indicaré entrar a tu URL local o a Producción, registrar un cliente prueba, y confirmar que ya aparece en la tabla de leads ("Clientes") y que envió correctamente el saludo en WhatsApp (mediante el nuevo webhook).
