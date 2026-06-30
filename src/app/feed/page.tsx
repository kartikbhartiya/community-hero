import type { Metadata } from 'next';
import FeedClient from './FeedClient';

export const metadata: Metadata = {
  title: 'Community Feed',
  description: 'Live feed of civic issues reported by your community — upvote, track status and follow resolutions in real time.',
};

export default function FeedPage() {
  return <FeedClient />;
}
