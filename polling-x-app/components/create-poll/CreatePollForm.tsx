"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { PollInsert } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreatePollForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to create a poll");
      return;
    }

    if (!title.trim()) {
      toast.error("Poll title is required");
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }

    setLoading(true);

    try {
      const pollData: PollInsert = {
        title: title.trim(),
        description: description.trim() || null,
        options: validOptions,
        created_by: user.id,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
        allow_multiple_votes: allowMultipleVotes,
        is_public: isPublic,
        tags: [],
        settings: {}
      };

      const { data, error } = await supabase
        .from('polls')
        .insert(pollData)
        .select()
        .single();

      if (error) {
        console.error('Error creating poll:', error);
        toast.error(`Failed to create poll: ${error.message}`);
        return;
      }

      toast.success("Poll created successfully!");
      router.push(`/polls`);

    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You must be logged in to create a poll.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Poll Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Poll Title *
            </label>
            <Input
              id="title"
              type="text"
              placeholder="What's your poll about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          {/* Poll Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <Input
              id="description"
              type="text"
              placeholder="Add more details about your poll"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Poll Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Options *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    required
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 2 options required, maximum 10 options allowed
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium mb-2">
              Expiration Date (Optional)
            </label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for no expiration
            </p>
          </div>

          {/* Poll Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm">
                Make poll public (visible to everyone)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowMultipleVotes"
                checked={allowMultipleVotes}
                onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allowMultipleVotes" className="text-sm">
                Allow users to vote multiple times
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Poll...
              </>
            ) : (
              "Create Poll"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
