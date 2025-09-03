"use client";

import { useEffect, useState } from "react";
import { PollItem } from "./PollItem";

interface Poll {
  id: number;
  title: string;
  options: string[];
  votes: number[];
  createdAt: string;
}

export function PollList() {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    const storedPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    setPolls(storedPolls);
  }, []);

  const handleDelete = (id: number) => {
    const updatedPolls = polls.filter(poll => poll.id !== id);
    setPolls(updatedPolls);
    localStorage.setItem("polls", JSON.stringify(updatedPolls));
  };

  const handleVote = (pollId: number, optionIndex: number) => {
    const updatedPolls = polls.map(poll => {
      if (poll.id === pollId) {
        const newVotes = [...poll.votes];
        newVotes[optionIndex] += 1;
        return { ...poll, votes: newVotes };
      }
      return poll;
    });
    setPolls(updatedPolls);
    localStorage.setItem("polls", JSON.stringify(updatedPolls));
  };

  if (polls.length === 0) {
    return <p className="text-center text-gray-500">No polls yet. Create one!</p>;
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollItem
          key={poll.id}
          poll={poll}
          onVote={handleVote}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
