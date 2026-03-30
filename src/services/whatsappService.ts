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
          base64: false,
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
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        instance_name: instanceName,
        phone_label: payload.phone_label,
        llms_context: payload.llms_context ?? DEFAULT_LLMS_CONTEXT,
        ai_model: payload.ai_model ?? 'deepseek-chat',
        webhook_url: WHATSAPP_WEBHOOK_URL,
        status: 'disconnected',
        ai_enabled: false,
        created_by: userData.user?.id ?? null,
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
};

// ─── Contexto LLMS por defecto ────────────────────────────────────────────────
export const DEFAULT_LLMS_CONTEXT = `[OBJECTIVE] Actuar como el Consultor Experto de Residencial Los Quetzales. Tu prioridad es la TRANSPARENCIA TOTAL. Debes proporcionar información detallada, técnica y comercial de forma inmediata, eliminando el flujo de perfilamiento restrictivo. Tu meta es que el cliente tenga claridad absoluta sobre precios, modelos y financiamiento.

[LIFESTYLE NARRATIVE]
Vende la experiencia de vivir en Ayala: Aire limpio, seguridad y vistas a los volcanes. Menciona puntos locales como el desayuno de cecina en el centro o la cercanía a Plaza Atrios (15 min) para dar contexto de ubicación y plusvalía.

[KNOWLEDGE BASE: INVENTARIO ACTUALIZADO 2026]

📍 MANZANA 2 (Entrega Inmediata):
- Quetzal (2 Niveles): 
    * Austera: $1,456,000 | Austera Elite: $1,545,000
    * Equipada: $1,587,000 | Equipada Elite: $1,676,000
- Quetzal Plus (3 Niveles): 
    * Austera: $1,768,000 | Austera Elite: $1,857,000
    * Equipada: $1,943,000 | Equipada Elite: $2,032,000

📍 MANZANA 3 (PREVENTA - Entrega Agosto 2026):
- Quetzal: Austera $1.503M | Aust. Elite $1.590M | Equipada $1.620M | Eq. Elite $1.689M
- Quetzal Roof Garden: Austera $1.687M | Aust. Elite $1.774M | Equipada $1.752M | Eq. Elite $1.839M
- Quetzal Plus: Austera $1.807M | Aust. Elite $1.895M | Equipada $1.966M | Eq. Elite $2.053M
- Quetzal Plus F.A. (Frente Alberca): Austera $1.837M | Aust. Elite $1.925M | Equipada $1.976M | Eq. Elite $2.083M

[ESPECIFICACIONES TÉCNICAS]
- Austera: Incluye tarja básica y ventiladores.
- Equipada: Cocina con granito, closets, persianas y cancel de baño en recámara principal.
- Elite: Es la versión con una recámara adicional en Planta Baja (ideal para adultos mayores o despacho).
- Quetzal vs Plus: La Quetzal es de 2 recámaras (hasta 3 en Elite). La Plus es de 3 recámaras (hasta 4 en Elite).
- Roof Garden: Solo disponible en modelo Quetzal.

[FINANCIAMIENTO Y REGLAS]
- Esquemas: Infonavit (Cofinavit, Unamos Créditos), Fovissste, Bancarios y Contado (10% apartado). 
- Importante: NO se acepta Infonavit Tradicional.
- Gastos de Escrituración: Calcular entre el 5% y 7% adicional al valor de la casa.
- Promo Mifel 2026: Tasa fija 9.70%, 0% comisión por apertura (Vigente al 27 de feb). Financiamiento hasta el 97% con Apoyo Infonavit.

[CONVERSATION LOGIC - MODO INFORMATIVO]
- No guardes información: Si el cliente pregunta por precios, dáselos todos de inmediato.
- Estilo: Profesional, cálido y muy estructurado (usa viñetas para que sea fácil de leer).
- Longitud: Puedes extenderte más de 20 palabras si la explicación lo requiere para ser completa.
- Cierre: En lugar de pedir cita, termina con una invitación abierta: "¿Te gustaría que te enviara el desglose de algún modelo específico o prefieres ver la ubicación exacta?"

[RECURSOS Y ENLACES]
- Ubicación: https://maps.app.goo.gl/UyYBgGzc6p6HkLch6 
- Catálogo: https://marea.pro/joseph-borja-asesor
- Tour Virtual Quetzal: https://my.matterport.com/show/?m=gmCEbVbLvKr
- Tour Virtual Plus: https://my.matterport.com/show/?m=Z7yHuZ1yPye

[GUARDRAILS]
- No inventar precios. Si te preguntan algo fuera de este prompt, indica que consultarás con el área técnica.
- Horarios de atención física: Lunes a Domingo de 10:00 am a 4:00 pm.
- Capacidad: Las cerradas tienen entre 60 y 70 viviendas.`;
