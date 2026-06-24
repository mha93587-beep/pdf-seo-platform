import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromSessionToken } from '@/lib/user-auth';
import crypto from 'crypto';

// GET: List all API keys for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getUserFromSessionToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, api_key, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Mask keys before sending to the client, e.g. ds_live_abcd...efgh
    const maskedKeys = data.map((key: any) => {
      const rawKey = key.api_key;
      const prefix = rawKey.substring(0, 12); // "ds_live_xxxx"
      const suffix = rawKey.substring(rawKey.length - 4);
      return {
        id: key.id,
        name: key.name,
        created_at: key.created_at,
        api_key: `${prefix}...${suffix}`,
      };
    });

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys', details: error.message }, { status: 500 });
  }
}

// POST: Create a new API key
export async function POST(request: Request) {
  try {
    const user = await getUserFromSessionToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    // Generate unique API key: ds_live_ + 32 bytes of secure hex (64 chars)
    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawApiKey = `ds_live_${randomHex}`;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name,
        api_key: rawApiKey,
      })
      .select('id, name, api_key, created_at')
      .single();

    if (error) {
      throw error;
    }

    // For POST response, we return the raw rawApiKey ONCE so the user can copy it!
    return NextResponse.json({
      success: true,
      key: {
        id: data.id,
        name: data.name,
        api_key: rawApiKey, // Return unmasked key only here
        created_at: data.created_at,
      }
    });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key', details: error.message }, { status: 500 });
  }
}

// DELETE: Delete an API key
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromSessionToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Delete and ensure ownership
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', parseInt(keyId))
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key', details: error.message }, { status: 500 });
  }
}
