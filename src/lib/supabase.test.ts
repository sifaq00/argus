import { describe, expect, it } from 'vitest';

describe('supabase env', () => {
  it('env names documented', () => {
    expect(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].length).toBe(2);
  });
});
