create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  normalized_email text not null,
  reason text not null,
  order_ref text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  source text not null default 'contact_form',
  inbound_email_sent boolean not null default false,
  last_error text,
  replied_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

create index if not exists contact_messages_email_created_idx
  on public.contact_messages (normalized_email, created_at desc);

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  body text not null,
  from_email text not null,
  to_email text not null,
  reply_to_email text,
  resend_email_id text,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists contact_message_replies_message_idx
  on public.contact_message_replies (message_id, created_at desc);

alter table public.contact_messages enable row level security;
alter table public.contact_message_replies enable row level security;
