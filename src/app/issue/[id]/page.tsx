import IssueDetailClient from './IssueDetailClient';

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <IssueDetailClient id={resolvedParams.id} />;
}
