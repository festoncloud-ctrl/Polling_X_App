"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Poll } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, Loader2, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PollWithResults extends Poll {
  results: { option: string; votes: number }[];
  user_vote?: number | null;
  has_voted: boolean;
}

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollWithResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [voting, setVoting] = useState(false);
  const supabase = createClient();

  const pollId = params.id as string;

  const fetchPoll = useCallback(async () => {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*, results:results_view(*)')
        .eq('id', pollId)
        .single();

      if (pollError) {
        console.error('Error fetching poll:', pollError);
        toast.error("Poll not found");
        router.push('/polls');
        return;
      }

      let userVote = null;
      let hasVoted = false;
      if (user) {
        const { data: voteData } = await supabase
          .from('votes')
          .select('option_index')
          .eq('poll_id', pollId)
          .eq('user_id', user.id)
          .single();

        if (voteData) {
          userVote = voteData.option_index;
          hasVoted = true;
        }
      }

      const pollWithResults: PollWithResults = {
        ...pollData,
        results: pollData.results || [],
        user_vote: userVote,
        has_voted: hasVoted,
      };

      setPoll(pollWithResults);
      setShowThankYou(hasVoted);
    } catch (error) {
      console.error('Error fetching poll:', error);
      toast.error("Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [pollId, user, supabase, router]);

  useEffect(() => {
    if (pollId) {
      fetchPoll();

      const channel = supabase
        .channel(`poll_${pollId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'polls', filter: `id=eq.${pollId}` },
          (payload) => {
            setPoll((prevPoll) => {
              if (prevPoll) {
                return { ...prevPoll, ...payload.new };
              }
              return prevPoll;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [pollId, fetchPoll, supabase]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to vote");
      return;
    }

    if (!poll || selectedOption === null) return;

    setVoting(true);

    try {
      const { error } = await supabase
        .from('votes')
        .insert({
          poll_id: pollId,
          user_id: user.id,
          option_index: selectedOption,
        });

      if (error) {
        console.error('Error voting:', error);
        toast.error("Failed to submit vote");
        return;
      }

      toast.success("Vote submitted successfully!");
      // No need to call fetchPoll() here, real-time will update the UI
    } catch (error) {
      console.error('Error voting:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setVoting(false);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const getTotalVotes = () => {
    return poll?.results.reduce((sum, result) => sum + result.votes, 0) || 0;
  };

  const getVotePercentage = (voteCount: number) => {
    const total = getTotalVotes();
    return total > 0 ? Math.round((voteCount / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Poll not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const canVote = poll.is_active && !isExpired && !poll.has_voted;

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Poll Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{poll.title}</CardTitle>
                {poll.description && (
                  <p className="text-muted-foreground">{poll.description}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{getTotalVotes()} votes</span>
              {poll.expires_at && (
                <span>
                  {isExpired ? 'Expired' : 'Expires'} {new Date(poll.expires_at).toLocaleDateString()}
                </span>
              )}
              {!poll.is_public && <span>Private</span>}
            </div>
          </CardHeader>
        </Card>

        {/* Voting Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {canVote ? 'Cast your vote' : 'Results'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canVote ? (
              <form onSubmit={handleVote} className="space-y-4">
                <div className="space-y-3">
                  {poll.options.map((option, index) => (
                    <label key={index} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="poll-option"
                        value={index}
                        checked={selectedOption === index}
                        onChange={() => setSelectedOption(index)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="font-medium">{option.option}</span>
                    </label>
                  ))}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={selectedOption === null || voting}
                >
                  {voting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting Vote...
                    </>
                  ) : (
                    'Submit Vote'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                {poll.results.map((result, index) => {
                  const voteCount = result.votes || 0;
                  const percentage = getVotePercentage(voteCount);
                  const isUserVote = poll.user_vote === index;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.option}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {voteCount} votes ({percentage}%)
                          </span>
                          {isUserVote && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Your vote
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thank You Message */}
        {showThankYou && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-600 mb-2">Thank you for voting!</h3>
                <p className="text-muted-foreground">Your vote has been recorded successfully.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!canVote && isExpired && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                This poll has expired
              </p>
            </CardContent>
          </Card>
        )}

        {!canVote && !poll.is_active && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                This poll is no longer active
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
