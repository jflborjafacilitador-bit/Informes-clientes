import { supabase } from './supabaseClient';

// ─── Config de entorno ────────────────────────────────────────────────────────
export const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL as string;
export const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY as string;
export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL as string;
export const WHATSAPP_WEBHOOK_URL = `${N8N_BASE_URL}/webhook/whatsapp-agent`;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type WhatsappStatus = 'disconnected' | 'qr_ready' | 'connected' | 'error';

export interface WhatsappInstance {
  id: string;
  instance_name: string;
  phone_label: string;
  phone_number: string | null;
  status: WhatsappStatus;
  qr_code: string | null;
  evolution_instance_id: string | null;
  n8n_workflow_id: string | null;
  webhook_url: string | null;
  llms_context: string | null;
  ai_enabled: boolean;
  ai_model: string;
  advisor_name: string | null;      // Nombre del asesor que usa esta instancia
  assigned_user_id: string | null;  // UUID del asesor asignado
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappMessage {
  id: string;
  instance_id: string;
  phone_from: string;
  phone_name: string | null;
  message_in: string;
  message_out: string | null;
  responded_by: 'ai' | 'manual' | 'none';
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CreateInstanceData {
  instance_name: string;
  phone_label: string;
  llms_context?: string;
  ai_model?: string;
  assigned_user_id?: string | null;
  advisor_name?: string | null;
}

// Helper: convierte nombre de asesor a slug valido para Evolution API
export function slugifyAdvisor(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // elimina acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


// ─── Headers de Evolution API ────────────────────────────────────────────────
const evolutionHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_API_KEY,
});

// ─── Evolution API ────────────────────────────────────────────────────────────
export const evolutionApi = {

  // Crear instancia en Evolution API
  async createInstance(instanceName: string): Promise<void> {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: WHATSAPP_WEBHOOK_URL,
          byEvents: false,
          base64: true,
          headers: {},
          events: ['MESSAGES_UPSERT'],
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Evolution API error: ${err}`);
    }
  },

  // Actualizar Webhook para soportar Base64 en instancias existentes
  async updateWebhookBase64(instanceName: string): Promise<void> {
    const res = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        webhook: {
          url: WHATSAPP_WEBHOOK_URL,
          byEvents: false,
          base64: true,
          headers: {},
          events: ['MESSAGES_UPSERT']
        }
      })
    });
    if (!res.ok) {
      console.warn(`Evolution API warning: Failed to update webhook for ${instanceName}`);
    }
  },

  // Obtener QR para conectar
  async getQRCode(instanceName: string): Promise<string> {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: evolutionHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo obtener el QR');
    const json = await res.json();
    // v2 devuelve { code, base64 } o { qrcode: { base64 } }
    return json.base64 ?? json.qrcode?.base64 ?? json.code ?? '';
  },

  // Verificar estado de conexión
  async getConnectionState(instanceName: string): Promise<'open' | 'close' | 'connecting'> {
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: evolutionHeaders(),
      });
      if (!res.ok) return 'close';
      const json = await res.json();
      return json.instance?.state ?? json.state ?? 'close';
    } catch {
      return 'close';
    }
  },

  // Desconectar instancia
  async logoutInstance(instanceName: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
    });
  },

  // Eliminar instancia de Evolution API
  async deleteInstance(instanceName: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
    });
  },

  // Enviar mensaje de texto (para pruebas desde el panel)
  async sendTextMessage(instanceName: string, phone: string, text: string): Promise<void> {
    await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text },
      }),
    });
  },
};

// ─── Supabase Service ─────────────────────────────────────────────────────────
export const whatsappService = {

  // Obtener todas las instancias
  async getInstances(): Promise<WhatsappInstance[]> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as WhatsappInstance[];
  },

  // Obtener una instancia
  async getInstance(id: string): Promise<WhatsappInstance | null> {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as WhatsappInstance;
  },

  // Crear nueva instancia (Supabase + Evolution API)
  async createInstance(payload: CreateInstanceData): Promise<WhatsappInstance> {
    const { data: userData } = await supabase.auth.getUser();
    const instanceName = payload.instance_name.toLowerCase().replace(/\s+/g, '-');

    // 1. Crear en Evolution API
    await evolutionApi.createInstance(instanceName);

    // 2. Guardar en Supabase
    const baseContext = payload.llms_context ?? DEFAULT_LLMS_CONTEXT;
    const finalContext = baseContext.replace(
      '{ADVISOR_CATALOG}', 
      payload.advisor_name ? slugifyAdvisor(payload.advisor_name) : 'catalogo'
    ).replace(
      '{ADVISOR_NAME}',
      payload.advisor_name ?? 'Asesor'
    );

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        instance_name: instanceName,
        phone_label: payload.phone_label,
        llms_context: finalContext,
        ai_model: payload.ai_model ?? 'deepseek-chat',
        webhook_url: WHATSAPP_WEBHOOK_URL,
        status: 'disconnected',
        ai_enabled: false,
        created_by: userData.user?.id ?? null,
        assigned_user_id: payload.assigned_user_id ?? null,
        advisor_name: payload.advisor_name ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WhatsappInstance;
  },

  // Actualizar instancia
  async updateInstance(id: string, updates: Partial<WhatsappInstance>): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Eliminar instancia (Evolution API + Supabase)
  async deleteInstance(id: string, instanceName: string): Promise<void> {
    await evolutionApi.deleteInstance(instanceName).catch(() => {});
    await supabase.from('whatsapp_messages').delete().eq('instance_id', id);
    const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id);
    if (error) throw error;
  },

  // Toggle AI
  async toggleAI(id: string, enabled: boolean): Promise<void> {
    await whatsappService.updateInstance(id, { ai_enabled: enabled });
  },

  // Guardar contexto LLMS
  async saveContext(id: string, context: string): Promise<void> {
    await whatsappService.updateInstance(id, { llms_context: context });
  },

  // Obtener messages de una instancia
  async getMessages(instanceId: string, limit = 50): Promise<WhatsappMessage[]> {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', instanceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as WhatsappMessage[];
  },

  // Suscripción Realtime a cambios de instancias
  subscribeToInstances(callback: (instances: WhatsappInstance[]) => void) {
    const channel = supabase
      .channel('wa_instances_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' },
        async () => {
          const instances = await whatsappService.getInstances();
          callback(instances);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  // Suscripción Realtime a mensajes nuevos
  subscribeToMessages(instanceId: string, callback: (msg: WhatsappMessage) => void) {
    const channel = supabase
      .channel(`wa_messages_${instanceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'whatsapp_messages',
        filter: `instance_id=eq.${instanceId}`,
      }, (payload) => callback(payload.new as WhatsappMessage))
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  // Asignar asesor a una instancia (solo admin)
  async assignUser(instanceId: string, userId: string | null, advisorName?: string): Promise<void> {
    const updates: Record<string, unknown> = { assigned_user_id: userId };
    if (advisorName !== undefined) updates.advisor_name = advisorName;
    await whatsappService.updateInstance(instanceId, updates as Partial<WhatsappInstance>);
  },

  // Asignar asesor por email + nombre (busca el user_id en Supabase profiles)
  async assignAdvisor(instanceId: string, email: string | null, advisorName: string | null): Promise<void> {
    let userId: string | null = null;

    if (email) {
      // Buscar en profiles por email (tabla profiles que tiene user_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (!profile) {
        // Intentar buscar en user_metadata via función RPC si existe
        throw new Error(`No se encontró ningún usuario con email: ${email}. Verifica que esté registrado en el sistema.`);
      }
      userId = profile.id;
    }

    const updates: Record<string, unknown> = {
      assigned_user_id: userId,
      advisor_name: advisorName ?? null,
    };
    await whatsappService.updateInstance(instanceId, updates as Partial<WhatsappInstance>);
  },

  // Obtener lista de usuarios para dropdown de asignacion
  async getUsers(): Promise<{ id: string; name: string; email: string }[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('email');
      
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return (data ?? []).map((u: any) => ({
      id: u.id,
      name: u.email ? u.email.split('@')[0] : u.id,
      email: u.email ?? '',
    }));
  },

  // Obtener la instancia asignada al usuario autenticado actual
  async getMyInstance(): Promise<WhatsappInstance | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('assigned_user_id', userData.user.id)
      .maybeSingle();
    if (error) return null;
    return data as WhatsappInstance | null;
  },
};

// ─── Contexto LLMS por defecto ────────────────────────────────────────────────
export const DEFAULT_LLMS_CONTEXT = `[OBJECTIVE]
Representar a Residencial Los Quetzales como un Asesor Inmobiliario Senior. Tu meta es la conversión: perfila al lead estratégicamente (uso, presupuesto, crédito, tiempo) para agendar una cita presencial. No eres un recolector de datos; eres un consultor que vende una inversión y un estilo de vida exclusivo.

[LIFESTYLE NARRATIVE - EL GANCHO]
- El Despertar: Aire limpio, vista a los volcanes y paz absoluta en Ayala.
- Planes Locales: Desayuno de cecina en el centro, tardes en Agua Hedionda o visitas al Museo Casa Zapata.
- Conectividad: Plaza Atrios a 15 min, pero con el sabor local del tamal de bagre en "La Curva".

[KNOWLEDGE BASE: INVENTARIO ACTUALIZADO 2026]

📍 MANZANA 2 (Entrega Inmediata):
- Quetzal (2 Niv): Austera $1.456M | Aust. Elite $1.545M | Equipada $1.587M | Eq. Elite $1.676M
- Quetzal Plus (3 Niv): Austera $1.768M | Aust. Elite $1.857M | Equipada $1.943M | Eq. Elite $2.032M

📍 MANZANA 3 (PREVENTA - Agosto 2026):
- Quetzal: Austera $1.503M | Aust. Elite $1.590M | Equipada $1.620M | Eq. Elite $1.689M
- Quetzal Roof Garden: Austera $1.687M | Aust. Elite $1.774M | Equipada $1.752M | Eq. Elite $1.839M
- Quetzal Plus: Austera $1.807M | Aust. Elite $1.895M | Equipada $1.966M | Eq. Elite $2.053M
- Quetzal Plus F.A. (Frente Alberca): Austera $1.837M | Aust. Elite $1.925M | Equipada $1.976M | Eq. Elite $2.083M

[DEFINICIÓN DE EQUIPAMIENTO]
- Austera: Tarja básica y ventiladores.
- Equipada: Cocina con granito, closets, persianas, cancel en baño de recámara principal.
- Elite: Incluye una recámara extra en Planta Baja (Total: hasta 4 recámaras).

[CONVERSATION LOGIC & FLOW]
- Interacción: Mensajes cortos (<20 palabras), profesionales y directos (estilo WhatsApp).
- Perfilamiento Secuencial: No satures. Haz 1 pregunta por mensaje siguiendo este orden: (¿Uso/Habitacional o Inversión? -> ¿Presupuesto? -> ¿Esquema de Crédito? -> ¿Tiempo de compra?).
- Disparadores de Recursos: Envía los links solo cuando el cliente pregunte por espacios, acabados o fotos para validar la calidad:
  * Catálogo: https://marea.pro/joseph-borja-asesor
  * Recorrido Quetzal: https://my.matterport.com/show/?m=gmCEbVbLvKr
  * Recorrido Plus: https://my.matterport.com/show/?m=Z7yHuZ1yPye
- Cierre de Cita: Al agendar, solicita confirmación de día y hora. Nota Obligatoria: "Dime el día y la hora para dejar la nota en el sistema y que el asesor te reciba con la ubicación exacta".

[REGLAS DE NEGOCIO Y OBJECIONES]
- Calificación: Si el presupuesto es < $1M, sugiere "Unamos Créditos" o créditos conyugales de forma profesional.
- Filtro de Precio: Anclaje inicial sugerido en $1.6 MDP.
- Escrituración: Informar siempre que es un gasto adicional del 5% al 7% del valor.
- Financiamiento: Infonavit (Cofinavit, Unamos), Fovissste, Bancarios, Contado (10% apartado). 
- PROHIBIDO: Infonavit Tradicional.
- Ubicación: https://maps.app.goo.gl/UyYBgGzc6p6HkLch6 (Enviar siempre que se hable de logística o visitas).

[GUARDRAILS CRÍTICOS]
1. NO PEDIR EL WHATSAPP NI TELÉFONO: Ya estás hablando con el cliente por ese canal. Pedirlo es redundante y poco profesional.
2. No inventes precios ni condiciones. Si el dato es muy específico, deriva al "compañero experto".
3. Horarios: Citas únicamente de 10:00 am a 4:00 pm, de lunes a domingo.
4. Diferencia Técnica: Quetzal (2-3 rec.) vs Quetzal Plus (3-4 rec.). El Roof Garden es exclusivo de modelos Quetzal en Manzana 3.
5. NO vendemos departamentos. SOLO vendemos CASAS. Si te preguntan por departamentos, aclara que solo vendemos casas.
6. NO manejamos precios en dólares (USD). Todos nuestros precios son en Pesos Mexicanos (MXN).
7. NO tenemos desarrollos en otras ciudades, solo en Ayala, Morelos.`;
