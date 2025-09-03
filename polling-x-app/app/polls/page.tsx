import Link from "next/link";
import { PollList } from "@/components/polls/PollList";
import { Button } from "@/components/ui/button";

export default function PollsPage() {
  return (
    <div className="container mx-auto py-8 min-h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Link href="/create-poll">
          <Button>Create New Poll</Button>
        </Link>
      </div>
      <div className="flex-grow">
        <PollList />
      </div>
      <footer className="mt-8 py-4 border-t border-gray-200 text-center text-sm text-gray-600">
        <p>&copy; 2025 Polling X App. Built with Next.js and Shadcn.</p>
      </footer>
    </div>
  );
}
