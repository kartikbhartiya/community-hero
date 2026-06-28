'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const origin = formData.get('origin') as string;

  if (!name || !email || !password) {
    return { error: 'All fields are required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create user profile in public.users
  if (data?.user) {
    const { error: dbError } = await supabase
      .from('users')
      .upsert([{ email, name, hero_score: 0 }], { onConflict: 'email' });
    
    if (dbError) {
      console.error('Failed to insert user profile:', dbError);
    }
  }

  return { success: true, message: 'Please check your email to verify your account.' };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
