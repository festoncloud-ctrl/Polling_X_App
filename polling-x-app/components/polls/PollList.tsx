"use client";

import { useAuth } from "@/lib/auth-context";
import { Poll, PollSummary } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PollItem } from "./PollItem";

export function PollList({ initialPolls }: { initialPolls?: (Poll | PollSummary)[] }) {
  const [polls, setPolls] = useState(initialPolls || []);
  const [loading, setLoading] = useState(!initialPolls);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!initialPolls) {
      if (user) {
        fetchUserPolls(user.id);
      } else {
        setLoading(false);
      }
    }
  }, [initialPolls, user]);

  const fetchUserPolls = async (userId?: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_polls', { user_uuid: userId });

      if (error) {
        console.error('Error fetching polls:', error);
        toast.error(`Failed to load polls: ${error.message}`);
        return;
      }

      setPolls(data || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) {
        console.error('Error deleting poll:', error);
        toast.error("Failed to delete poll");
        return;
      }

      toast.success("Poll deleted successfully");
      setPolls(polls.filter(p => p.id !== pollId));
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No polls yet. Create your first poll!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollItem
          key={poll.id}
          poll={poll as PollSummary}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
