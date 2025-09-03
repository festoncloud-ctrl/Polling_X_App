import { CreatePollForm } from "@/components/create-poll/CreatePollForm";

export default function CreatePollPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Poll</h1>
      <CreatePollForm />
    </div>
  );
}
