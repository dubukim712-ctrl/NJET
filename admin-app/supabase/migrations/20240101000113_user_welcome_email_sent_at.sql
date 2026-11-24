alter table public.users
  add column welcome_email_sent_at timestamptz;

comment on column public.users.welcome_email_sent_at is
  'Timestamp of the one-time welcome email send attempt, claimed before contacting the email provider.';

notify pgrst, 'reload schema';
