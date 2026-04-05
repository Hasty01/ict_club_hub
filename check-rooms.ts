import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.log("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkRooms() {
    const { data, error } = await supabase.from('rooms').select('id, title, metadata');
    console.log("Rooms:", data?.map(r => r.title));
    if (error) console.log("Error:", error);
}

checkRooms();
