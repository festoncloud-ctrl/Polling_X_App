"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollSummary } from "@/lib/database.types";
import { Calendar, Eye, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";

interface PollItemProps {
  poll: PollSummary;
  onDelete: (pollId: string) => void;
}

export function PollItem({ poll, onDelete }: PollItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this poll?")) {
      onDelete(poll.id);
    }
  };

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

  return (
    <Link href={`/polls/${poll.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg line-clamp-2">{poll.title}</CardTitle>
            <div className="flex gap-2">
              <Link href={`/polls/${poll.id}/edit`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {poll.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {poll.description}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{poll.vote_count} votes</span>
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(poll.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!poll.is_active && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  Inactive
                </span>
              )}

              {isExpired && (
                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                  Expired
                </span>
              )}

              {poll.expires_at && !isExpired && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  Expires {new Date(poll.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{poll.options.length} options</span>
            </div>

            <Button variant="outline" size="sm">
              View Poll
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
