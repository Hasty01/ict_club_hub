import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

async function testSendSticker() {
    console.log("Fetching a user snippet...");
    const { data: user } = await supabase.from('users').select('uid').limit(1).single();
    if (!user) return console.log("No user found");
    const { data: room } = await supabase.from('rooms').select('id').limit(1).single();
    if (!room) return console.log("No room found");

    console.log("Sending sticker for room", room.id, "as user", user.uid);
    const { data, error } = await supabase.from('messages').insert({
        room_id: room.id,
        sender_id: user.uid,
        content: '',
        metadata: { type: 'sticker', url: 'https://media.tenor.com/foo.gif' }
    }).select().single();

    if (error) {
        console.log("ERROR 409 REPRODUCED:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS:", data);
    }
}
testSendSticker();
