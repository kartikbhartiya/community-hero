import type { Metadata } from 'next';
import ReportForm from '@/components/ReportForm';

export const metadata: Metadata = {
  title: 'Report an Issue',
  description: 'Report a local civic issue in seconds — add a photo, location and description. AI verifies, classifies and routes it to the right department.',
};

export default function ReportPage() {
  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <ReportForm />
    </div>
  );
}
