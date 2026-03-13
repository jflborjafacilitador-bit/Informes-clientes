import { supabase } from './supabaseClient';

export type EstatusManual = 'DISPONIBLE' | 'EN_PROCESO' | 'VENDIDA';

export interface EstatusOverride {
    mza: string;
    casa: string;
    condominio: string;
    estatus: EstatusManual;
    updated_at: string;
}

/** Clave única para identificar una casa en el mapa de overrides */
export const casaKey = (mza: string, casa: string) => `${mza}||${casa}`;

/** Carga todos los overrides de estatus guardados en Supabase */
export const fetchEstatusOverrides = async (): Promise<Map<string, EstatusManual>> => {
    const { data, error } = await supabase
        .from('inventario_estatus')
        .select('mza, casa, estatus');

    if (error) {
        console.error('Error cargando estatus overrides:', error);
        return new Map();
    }

    const map = new Map<string, EstatusManual>();
    (data ?? []).forEach((row: any) => {
        map.set(casaKey(row.mza, row.casa), row.estatus as EstatusManual);
    });
    return map;
};

/** Guarda o actualiza el estatus de una casa en Supabase */
export const upsertEstatus = async (
    mza: string,
    casa: string,
    condominio: string,
    estatus: EstatusManual,
    userId: string
): Promise<void> => {
    const { error } = await supabase
        .from('inventario_estatus')
        .upsert(
            {
                mza,
                casa,
                condominio,
                estatus,
                updated_at: new Date().toISOString(),
                updated_by: userId,
            },
            { onConflict: 'mza,casa' }
        );

    if (error) {
        console.error('Error guardando estatus:', error);
        throw error;
    }
};
