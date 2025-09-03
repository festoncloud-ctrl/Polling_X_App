-- Polling X App Database Schema
-- Run this in your Supabase SQL editor or as a migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- Array of poll options
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allow_multiple_votes BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}' -- Additional poll settings
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    option_index INTEGER NOT NULL, -- Index of the selected option
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    UNIQUE(poll_id, user_id) -- One vote per user per poll (unless allow_multiple_votes is true)
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

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON public.votes(voted_at DESC);

CREATE INDEX IF NOT EXISTS idx_poll_views_poll_id ON public.poll_views(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_views_viewed_at ON public.poll_views(viewed_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_views ENABLE ROW LEVEL SECURITY;

-- Polls policies
-- Anyone can view active public polls
CREATE POLICY "Public polls are viewable by everyone" ON public.polls
    FOR SELECT USING (is_active = true AND is_public = true);

-- Users can view their own polls (including private ones)
CREATE POLICY "Users can view their own polls" ON public.polls
    FOR SELECT USING (auth.uid() = created_by);

-- Authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON public.polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own polls
CREATE POLICY "Users can update their own polls" ON public.polls
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own polls
CREATE POLICY "Users can delete their own polls" ON public.polls
    FOR DELETE USING (auth.uid() = created_by);

-- Votes policies
-- Users can view votes on polls they created
CREATE POLICY "Poll creators can view votes on their polls" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND polls.created_by = auth.uid()
        )
    );

-- Users can view their own votes
CREATE POLICY "Users can view their own votes" ON public.votes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert votes on active polls
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
            -- Check if multiple votes are allowed or if user hasn't voted yet
            EXISTS (
                SELECT 1 FROM public.polls
                WHERE polls.id = votes.poll_id
                AND polls.allow_multiple_votes = true
            )
            OR NOT EXISTS (
                SELECT 1 FROM public.votes v
                WHERE v.poll_id = votes.poll_id
                AND v.user_id = auth.uid()
            )
        )
    );

-- Users can delete their own votes (if poll allows it)
CREATE POLICY "Users can delete their own votes" ON public.votes
    FOR DELETE USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND polls.allow_multiple_votes = true
        )
    );

-- Poll views policies
-- Anyone can view poll view statistics for public polls
CREATE POLICY "Anyone can view poll views for public polls" ON public.poll_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_views.poll_id
            AND polls.is_public = true
        )
    );

-- Poll creators can view all views on their polls
CREATE POLICY "Poll creators can view all views on their polls" ON public.poll_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_views.poll_id
            AND polls.created_by = auth.uid()
        )
    );

-- Anyone can insert poll views (for analytics)
CREATE POLICY "Anyone can record poll views" ON public.poll_views
    FOR INSERT WITH CHECK (true);

-- Functions for common operations

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_uuid UUID)
RETURNS TABLE(option_index INTEGER, vote_count BIGINT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT
        v.option_index,
        COUNT(*) as vote_count
    FROM public.votes v
    WHERE v.poll_id = poll_uuid
    GROUP BY v.option_index
    ORDER BY v.option_index;
$$;

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

-- Function to get user's polls
CREATE OR REPLACE FUNCTION get_user_polls(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    vote_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT
        p.id,
        p.title,
        p.description,
        p.options,
        p.created_at,
        p.expires_at,
        p.is_active,
        COUNT(v.id) as vote_count
    FROM public.polls p
    LEFT JOIN public.votes v ON p.id = v.poll_id
    WHERE p.created_by = user_uuid
    GROUP BY p.id, p.title, p.description, p.options, p.created_at, p.expires_at, p.is_active
    ORDER BY p.created_at DESC;
$$;

-- Function to get active public polls
CREATE OR REPLACE FUNCTION get_active_public_polls()
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    vote_count BIGINT,
    creator_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT
        p.id,
        p.title,
        p.description,
        p.options,
        p.created_at,
        p.expires_at,
        COUNT(v.id) as vote_count,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as creator_name
    FROM public.polls p
    LEFT JOIN public.votes v ON p.id = v.poll_id
    LEFT JOIN auth.users u ON p.created_by = u.id
    WHERE p.is_active = true
    AND p.is_public = true
    AND (p.expires_at IS NULL OR p.expires_at > NOW())
    GROUP BY p.id, p.title, p.description, p.options, p.created_at, p.expires_at, u.raw_user_meta_data, u.email
    ORDER BY p.created_at DESC;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.polls TO anon, authenticated;
GRANT ALL ON public.votes TO anon, authenticated;
GRANT ALL ON public.poll_views TO anon, authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_poll_results(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION has_user_voted(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_polls(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_public_polls() TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.polls IS 'Stores poll information including title, options, and settings';
COMMENT ON TABLE public.votes IS 'Stores individual votes cast on polls';
COMMENT ON TABLE public.poll_views IS 'Stores analytics data for poll views';

COMMENT ON COLUMN public.polls.options IS 'JSON array of poll options';
COMMENT ON COLUMN public.polls.settings IS 'Additional poll configuration options';
COMMENT ON COLUMN public.votes.option_index IS 'Index of the selected option in the poll options array';
