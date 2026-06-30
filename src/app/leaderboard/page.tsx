import type { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

export const metadata: Metadata = {
  title: 'Community Heroes Leaderboard',
  description: 'See the top citizens earning Hero Points by reporting and resolving local civic issues.',
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
