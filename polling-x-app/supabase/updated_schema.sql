-- Polling X App Database Schema (Improved Version)
-- Run this in your Supabase SQL editor or as a migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allow_multiple_votes BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}' -- Additional poll settings
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    "order" INTEGER NOT NULL
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    poll_option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    UNIQUE(poll_id, user_id, poll_option_id) -- A user can only vote for a specific option once
);

-- Create poll analytics table (optional, for tracking views)
CREATE TABLE IF NOT EXISTS public.poll_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    referrer TEXT,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON public.polls(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON public.polls(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_option_id ON public.votes(poll_option_id);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON public.votes(voted_at DESC);

CREATE INDEX IF NOT EXISTS idx_poll_views_poll_id ON public.poll_views(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_views_viewed_at ON public.poll_views(viewed_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_views ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Public polls are viewable by everyone" ON public.polls
    FOR SELECT USING (is_active = true AND is_public = true);

CREATE POLICY "Users can view their own polls" ON public.polls
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create polls" ON public.polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own polls" ON public.polls
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own polls" ON public.polls
    FOR DELETE USING (auth.uid() = created_by);

-- Poll options policies
CREATE POLICY "Poll options are viewable to users who can see the poll" ON public.poll_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_options.poll_id
        )
    );

CREATE POLICY "Poll creators can manage poll options" ON public.poll_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_options.poll_id
            AND polls.created_by = auth.uid()
        )
    );

-- Votes policies
CREATE POLICY "Poll creators can view votes on their polls" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND polls.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can view their own votes" ON public.votes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can vote on active polls" ON public.votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND polls.is_active = true
            AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
        )
        AND (
            (SELECT allow_multiple_votes FROM public.polls WHERE id = votes.poll_id) = true
            OR NOT EXISTS (
                SELECT 1 FROM public.votes v
                WHERE v.poll_id = votes.poll_id
                AND v.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);

-- Poll views policies
CREATE POLICY "Anyone can view poll views for public polls" ON public.poll_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_views.poll_id
            AND polls.is_public = true
        )
    );

CREATE POLICY "Poll creators can view all views on their polls" ON public.poll_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_views.poll_id
            AND polls.created_by = auth.uid()
        )
    );

CREATE POLICY "Anyone can record poll views" ON public.poll_views
    FOR INSERT WITH CHECK (true);

-- Functions for common operations

-- Function to check if user has voted on a poll
CREATE OR REPLACE FUNCTION has_user_voted(poll_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.votes
        WHERE poll_id = poll_uuid AND user_id = user_uuid
    );
$$;

-- Function to get user's polls with results
CREATE OR REPLACE FUNCTION get_user_polls(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    vote_count BIGINT,
    options JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.description,
        p.created_at,
        p.expires_at,
        p.is_active,
        (SELECT COUNT(*) FROM public.votes v WHERE v.poll_id = p.id) as vote_count,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'votes', (SELECT COUNT(*) FROM public.votes v WHERE v.poll_option_id = po.id)
                ) ORDER BY po.order
            )
            FROM public.poll_options po
            WHERE po.poll_id = p.id
        ) as options
    FROM public.polls p
    WHERE p.created_by = user_uuid
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to get active public polls with results
CREATE OR REPLACE FUNCTION get_active_public_polls()
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    vote_count BIGINT,
    creator_name TEXT,
    options JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.description,
        p.created_at,
        p.expires_at,
        (SELECT COUNT(*) FROM public.votes v WHERE v.poll_id = p.id) as vote_count,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as creator_name,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'votes', (SELECT COUNT(*) FROM public.votes v WHERE v.poll_option_id = po.id)
                ) ORDER BY po.order
            )
            FROM public.poll_options po
            WHERE po.poll_id = p.id
        ) as options
    FROM public.polls p
    LEFT JOIN auth.users u ON p.created_by = u.id
    WHERE p.is_active = true
    AND p.is_public = true
    AND (p.expires_at IS NULL OR p.expires_at > NOW())
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.polls TO anon, authenticated;
GRANT ALL ON public.poll_options TO anon, authenticated;
GRANT ALL ON public.votes TO anon, authenticated;
GRANT ALL ON public.poll_views TO anon, authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION has_user_voted(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_polls(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_public_polls() TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.polls IS 'Stores poll information including title and settings';
COMMENT ON TABLE public.poll_options IS 'Stores the options for each poll';
COMMENT ON TABLE public.votes IS 'Stores individual votes cast on polls';
COMMENT ON TABLE public.poll_views IS 'Stores analytics data for poll views';
