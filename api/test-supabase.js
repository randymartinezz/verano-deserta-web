const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('events')
    .select('name, slug, venue')
    .limit(1)
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: 'Failed to connect to database.' });
  }

  return res.status(200).json({
    success: true,
    event: {
      name: data.name,
      slug: data.slug,
      venue: data.venue,
    },
  });
};
