"use client";

import { useAuth } from "@/lib/auth-context";
import { PollSummary } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PollItem } from "./PollItem";

export function PollList() {
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchUserPolls();
    }
  }, [user]);

  const fetchUserPolls = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_polls', { user_uuid: user!.id });

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
      fetchUserPolls(); // Refresh the list
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
          poll={poll}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
