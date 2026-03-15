import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getBox(side, offset, yTop, yBott) {
    const W_HOUSE = 2.85;
    const WALK_L = 53.5;
    const WALK_R = 57.5;
    
    let xLeft, xRight;
    if (side === 'L') {
        xRight = WALK_L - (offset - 1) * W_HOUSE;
        xLeft = xRight - W_HOUSE;
    } else {
        xLeft = WALK_R + (offset - 1) * W_HOUSE;
        xRight = xLeft + W_HOUSE;
    }
    
    return [
        { x: xLeft, y: yTop },
        { x: xRight, y: yTop },
        { x: xRight, y: yBott },
        { x: xLeft, y: yBott },
    ];
}

const zones = [];

function addBlock(side, startOffset, endOffset, yTop, yBott, fNumber) {
    for (let o = startOffset; o <= endOffset; o++) {
        const num = fNumber(o);
        zones.push({
            id: `auto-${num}`,
            mza: '3',
            casa: num.toString(),
            points: getBox(side, o, yTop, yBott)
        });
    }
}

// Y constants
const Y1_TOP = 22, Y1_BOTT = 33;
const Y2_TOP = 41, Y2_BOTT = 48;
const Y3_TOP = 50, Y3_BOTT = 57;
const Y4_TOP = 68, Y4_BOTT = 79;

// Top Row
addBlock('L', 1, 14, Y1_TOP, Y1_BOTT, (o) => 63 + o);
addBlock('R', 1, 13, Y1_TOP, Y1_BOTT, (o) => 64 - o);

// Center Top
addBlock('L', 1, 5, Y2_TOP, Y2_BOTT, (o) => 41 + o);
addBlock('R', 1, 5, Y2_TOP, Y2_BOTT, (o) => 42 - o);

// Center Bottom
addBlock('L', 2, 5, Y3_TOP, Y3_BOTT, (o) => 45 + o);
addBlock('R', 1, 9, Y3_TOP, Y3_BOTT, (o) => 37 - o);

// Bottom Row
addBlock('L', 1, 16, Y4_TOP, Y4_BOTT, (o) => 17 - o);
addBlock('R', 1, 11, Y4_TOP, Y4_BOTT, (o) => 16 + o);


async function run() {
    console.log(`Generated ${zones.length} house zones. Saving to DB...`);
    const { error } = await supabase.from('map_layouts').upsert({
        condominio: 'Manzana 3',
        image_url: '/Planos/CONDOMINIO 3 AVE DE PARAISO 03-02-26.png',
        width: 1000, 
        height: 700,
        zones: zones
    });
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Successfully injected exact layout parameters into map_layouts table!');
    }
}

run();
