import { PollInsert } from "@/lib/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pollData: Omit<PollInsert, 'created_by'> = await request.json();

  const { data, error } = await supabase
    .from("polls")
    .insert({ ...pollData, created_by: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating poll:", error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to create poll: ${error.message}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new NextResponse(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
