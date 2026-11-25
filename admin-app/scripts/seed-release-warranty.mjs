import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const { API_URL, SERVICE_ROLE_KEY, DB_URL, GITHUB_ENV } = process.env;
const loopback = (url) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);
if (!API_URL || !DB_URL || !SERVICE_ROLE_KEY || !GITHUB_ENV || !loopback(API_URL) || !loopback(DB_URL)) {
  throw new Error('Release fixtures require disposable local Supabase and a GitHub environment file.');
}

const supabase = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [
  ['USER', 'Release Customer'], ['OTHER_USER', 'Other Customer'], ['STAFF', 'Branch Staff'],
  ['WRONG_STAFF', 'Other Branch Staff'], ['ADMIN', 'Release Admin'],
];
const env = [];
const args = [DB_URL, '-X', '-v', 'ON_ERROR_STOP=1'];
for (const [role, name] of users) {
  const email = `release-${role.toLowerCase().replaceAll('_', '-')}@example.com`;
  const password = randomBytes(24).toString('hex');
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: name },
  });
  if (error || !data.user?.id) throw new Error(`Could not create release account ${role}.`);
  console.log(`::add-mask::${password}`);
  env.push(`E2E_${role}_EMAIL=${email}`, `E2E_${role}_PASSWORD=${password}`);
  args.push('-v', `${role.toLowerCase()}_id=${data.user.id}`);
  if (role === 'USER') env.push(`E2E_RELEASE_CUSTOMER_ID=${data.user.id}`);
}

const appointmentId = '00000000-0000-4000-8000-000000001321';
args.push('-v', `appointment_id=${appointmentId}`, '-f',
  fileURLToPath(new URL('./seed-release-warranty.sql', import.meta.url)));
execFileSync('psql', args, { stdio: 'inherit' });
appendFileSync(GITHUB_ENV, [...env, `E2E_RELEASE_APPOINTMENT_ID=${appointmentId}`, ''].join('\n'));
