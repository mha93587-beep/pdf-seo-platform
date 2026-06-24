import { supabase } from './supabase';

export async function authenticateApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  let apiKey = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else {
    apiKey = request.headers.get('x-api-key') || '';
  }

  if (!apiKey) return null;

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) return null;

  return data.user_id;
}
