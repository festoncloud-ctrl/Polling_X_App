import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PollSummary } from '@/lib/database.types';
import { PollList } from '@/components/polls/PollList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ProfilePage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: polls, error } = await supabase
    .rpc('get_user_polls', { user_uuid: user.id });

  if (error) {
    console.error('Error fetching user polls:', error);
    // You might want to show an error message to the user
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Polls</CardTitle>
        </CardHeader>
        <CardContent>
          {polls && polls.length > 0 ? (
            <PollList initialPolls={polls as PollSummary[]} />
          ) : (
            <p className="text-center text-muted-foreground">
              You haven't created any polls yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
