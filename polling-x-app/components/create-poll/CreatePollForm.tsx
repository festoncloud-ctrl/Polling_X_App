"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function CreatePollForm() {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || options.some(opt => !opt.trim())) return;

    const newPoll = {
      id: Date.now(),
      title: title.trim(),
      options: options.map(opt => opt.trim()),
      votes: options.map(() => 0),
      createdAt: new Date().toISOString(),
    };

    const existingPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    existingPolls.push(newPoll);
    localStorage.setItem("polls", JSON.stringify(existingPolls));

    router.push("/polls");
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Poll Title
            </label>
            <Input
              id="title"
              type="text"
              placeholder="Enter poll title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          {options.map((option, index) => (
            <div key={index}>
              <label htmlFor={`option${index + 1}`} className="block text-sm font-medium">
                Option {index + 1}
              </label>
              <Input
                id={`option${index + 1}`}
                type="text"
                placeholder="Enter option"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                required
              />
            </div>
          ))}
          <Button type="submit" className="w-full">
            Create Poll
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
