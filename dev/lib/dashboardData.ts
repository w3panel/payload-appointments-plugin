import type { User } from 'payload-types';

import { headers } from 'next/headers';

import { fetchWithAuth } from './api';

export async function getDashboardData() {
  try {
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
    const proto = headerStore.get('x-forwarded-proto') ?? 'http';

    if (!host) {
      throw new Error('Failed to determine request host');
    }

    const url = new URL('/api/users/me?depth=10', `${proto}://${host}`);
    const response = await fetchWithAuth(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const data: { user: User } = await response.json();

    return data.user;
  } catch (error) {
    console.error(error);
    return null;
  }
}
