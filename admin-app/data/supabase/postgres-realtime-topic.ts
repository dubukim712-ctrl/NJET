const topicSession = Math.random().toString(36).slice(2);
let nextSubscription = 0;

export function postgresRealtimeTopic(name: string) {
  // The shared Supabase client reuses topics while asynchronous cleanup is pending.
  return name + ':' + topicSession + ':' + ++nextSubscription;
}
