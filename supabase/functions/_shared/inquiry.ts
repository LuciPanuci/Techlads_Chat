import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export async function submitSiteInquiry(
  supabase: SupabaseClient,
  input: {
    siteId: string;
    sessionId: string;
    contactFormData: ContactFormData;
    routePath?: string | null;
    businessName: string;
  },
): Promise<{ confirmation: string }> {
  const name = input.contactFormData.name?.trim();
  const email = input.contactFormData.email?.trim();
  const message = input.contactFormData.message?.trim();
  const phone = input.contactFormData.phone?.trim() ?? '';

  if (!name || !email || !message) {
    throw new Error('Name, email, and message are required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid email address is required');
  }

  const { error } = await supabase.from('site_chat_inquiries').insert({
    site_id: input.siteId,
    session_id: input.sessionId,
    contact_name: name,
    contact_email: email,
    contact_phone: phone,
    message,
    route_path: input.routePath ?? null,
    status: 'new',
  });

  if (error) {
    throw new Error(`Failed to save inquiry: ${error.message}`);
  }

  await maybeSendInquiryEmail({
    businessName: input.businessName,
    siteId: input.siteId,
    sessionId: input.sessionId,
    name,
    email,
    phone,
    message,
    routePath: input.routePath ?? null,
  });

  const label = input.businessName || 'the team';
  return {
    confirmation: `Done — your message is with ${label}. They'll follow up at ${email} as soon as they can.`,
  };
}

async function maybeSendInquiryEmail(input: {
  businessName: string;
  siteId: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  routePath: string | null;
}): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const notifyEmail = Deno.env.get('SITE_CHAT_NOTIFY_EMAIL');
  const fromEmail = Deno.env.get('SITE_CHAT_FROM_EMAIL') ?? 'onboarding@resend.dev';

  if (!resendKey || !notifyEmail) {
    return;
  }

  const subject = `New chat inquiry — ${input.name}`;
  const text = [
    `New inquiry via site chatbot`,
    ``,
    `Site: ${input.siteId}`,
    `Session: ${input.sessionId}`,
    input.routePath ? `Page: ${input.routePath}` : null,
    ``,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    ``,
    `Message:`,
    input.message,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        reply_to: input.email,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn('site-chat inquiry email failed:', response.status, body);
    }
  } catch (error) {
    console.warn('site-chat inquiry email error:', error);
  }
}
