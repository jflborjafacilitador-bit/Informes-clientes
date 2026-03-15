import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function generateMza2Stubs() {
    console.log('Fetching Google Sheet CSV...');
    const res = await fetch('https://docs.google.com/spreadsheets/d/1R6Qx34NT-_An1gs5qjMCcxPRmc5Ns1gp/export?format=csv');
    const text = await res.text();
    
    const rows = text.split('\n');
    const mza2Casas = [];

    for (let line of rows) {
        const cols = line.split(',');
        const mza = cols[1] ? cols[1].trim() : '';
        const casa = cols[2] ? cols[2].trim() : '';
        const cond = cols[3] ? cols[3].trim().toUpperCase() : '';
        
        if (mza === '2' && !isNaN(Number(mza)) && cond.includes('TUCAN')) {
            mza2Casas.push({ mza, casa });
        }
    }
    
    console.log(`Encontradas ${mza2Casas.length} casas en Manzana 2 (Tucán).`);

    let row = 0;
    let col = 0;
    
    const zones = mza2Casas.map((c) => {
        const bx = 10 + (col * 8);
        const by = 10 + (row * 6);
        
        col++;
        if (col >= 10) {
            col = 0;
            row++;
        }
        
        const points = [
            { x: bx, y: by },
            { x: bx + 4, y: by },
            { x: bx + 4, y: by + 4 },
            { x: bx, y: by + 4 }
        ];

        return {
            id: `auto_mza2_${c.casa}_${Date.now()}`,
            mza: c.mza,
            casa: c.casa,
            points
        };
    });

    const payload = {
        condominio: 'Manzana 2',
        image_url: '/Planos/CONDOMINIO 2 TUCAN.png',
        width: 1000,
        height: 1000,
        zones: zones
    };

    const { error: upsertError } = await supabase
        .from('map_layouts')
        .upsert(payload, { onConflict: 'condominio' });

    if (upsertError) {
        console.error('Error saving map layout stubs:', upsertError);
    } else {
        console.log(`¡Éxito! Se insertaron ${zones.length} polígonos base para Manzana 2 en Supabase.`);
    }
}

generateMza2Stubs();
