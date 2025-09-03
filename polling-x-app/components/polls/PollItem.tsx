"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Poll {
  id: number;
  title: string;
  options: string[];
  votes: number[];
  createdAt: string;
}

interface PollItemProps {
  poll: Poll;
  onVote: (pollId: number, optionIndex: number) => void;
  onDelete: (id: number) => void;
}

export function PollItem({ poll, onVote, onDelete }: PollItemProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const totalVotes = poll.votes.reduce((sum, vote) => sum + vote, 0);

  const handleVote = (optionIndex: number) => {
    if (hasVoted) return;
    setSelectedOption(optionIndex);
    setHasVoted(true);
    onVote(poll.id, optionIndex);
  };

  const handleDelete = () => {
    onDelete(poll.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{poll.title}</CardTitle>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasVoted ? (
          <div className="space-y-2">
            {poll.options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleVote(index)}
              >
                {option}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Results ({totalVotes} votes)</p>
            {poll.options.map((option, index) => {
              const percentage = totalVotes > 0 ? (poll.votes[index] / totalVotes) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={selectedOption === index ? "font-bold" : ""}>
                      {option}
                    </span>
                    <span>{poll.votes[index]} votes ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            <Button variant="outline" onClick={() => setHasVoted(false)}>
              Vote Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
