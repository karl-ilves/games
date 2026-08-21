import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://cnsnjwpisglrwhiuvsds.supabase.co', 'sb_publishable_JTlpAA_4JKG0HPkPvjCuCg_ehfT6hQz');

async function test() {
    const { data, error } = await supabase.from('user_progress').select('*').limit(1);
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("DB Data:", data);
    }
}
test();
