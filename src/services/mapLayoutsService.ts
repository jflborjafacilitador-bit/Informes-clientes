import { supabase } from './supabaseClient';

export interface MapZone {
    id: string; // unique identifier for the drawn shape
    mza: string;
    casa: string;
    points: { x: number; y: number }[]; // Coordinates relative to image width/height (0-100%)
}

export interface MapLayout {
    id: string;
    condominio: string; // e.g., 'Manzana 3'
    image_url: string; // e.g., '/Planos/mza3.png'
    width: number;
    height: number;
    zones: MapZone[];
}

export const fetchMapLayout = async (condominio: string): Promise<MapLayout | null> => {
    const { data, error } = await supabase
        .from('map_layouts')
        .select('*')
        .eq('condominio', condominio)
        .maybeSingle();

    if (error) {
        console.error('Error fetching map layout:', error);
        return null;
    }

    return data as MapLayout | null;
};

export const saveMapLayout = async (
    condominio: string,
    image_url: string,
    width: number,
    height: number,
    zones: MapZone[]
): Promise<void> => {
    const { error } = await supabase
        .from('map_layouts')
        .upsert(
            {
                condominio,
                image_url,
                width,
                height,
                zones,
            },
            { onConflict: 'condominio' }
        );

    if (error) {
        console.error('Error saving map layout:', error);
        throw error;
    }
};
