# Supabase Database Schema

This directory contains the database schema for the Polling X App.

## Files

- `schema.sql` - Complete database schema with tables, policies, and functions

## Database Tables

### 1. `polls`
Stores poll information and settings.

**Columns:**
- `id` (UUID) - Primary key
- `title` (TEXT) - Poll title
- `description` (TEXT) - Optional poll description
- `options` (JSONB) - Array of poll options
- `created_by` (UUID) - Reference to auth.users
- `created_at` (TIMESTAMP) - Creation timestamp
- `expires_at` (TIMESTAMP) - Optional expiration date
- `is_active` (BOOLEAN) - Whether poll is active
- `allow_multiple_votes` (BOOLEAN) - Whether users can vote multiple times
- `is_public` (BOOLEAN) - Whether poll is publicly visible
- `tags` (TEXT[]) - Array of tags for categorization
- `settings` (JSONB) - Additional poll settings

### 2. `votes`
Stores individual votes cast on polls.

**Columns:**
- `id` (UUID) - Primary key
- `poll_id` (UUID) - Reference to polls table
- `user_id` (UUID) - Reference to auth.users
- `option_index` (INTEGER) - Index of selected option
- `voted_at` (TIMESTAMP) - Vote timestamp
- `user_agent` (TEXT) - Browser user agent
- `ip_address` (INET) - IP address for analytics

### 3. `poll_views` (Optional)
Stores analytics data for poll views.

**Columns:**
- `id` (UUID) - Primary key
- `poll_id` (UUID) - Reference to polls table
- `user_id` (UUID) - Reference to auth.users (nullable)
- `viewed_at` (TIMESTAMP) - View timestamp
- `referrer` (TEXT) - Referrer URL
- `user_agent` (TEXT) - Browser user agent

## Security Features

### Row Level Security (RLS)
- **Polls**: Public polls viewable by everyone, private polls only by creator
- **Votes**: Users can only see votes on polls they created or their own votes
- **Views**: Analytics data protected appropriately

### Policies
- Public polls are accessible to all users
- Users can only modify their own polls
- Vote restrictions based on poll settings
- Proper authentication checks throughout

## Database Functions

### `get_poll_results(poll_uuid UUID)`
Returns vote counts for each option in a poll.

### `has_user_voted(poll_uuid UUID, user_uuid UUID)`
Checks if a user has already voted on a specific poll.

### `get_user_polls(user_uuid UUID)`
Returns all polls created by a specific user with vote counts.

### `get_active_public_polls()`
Returns all active public polls with vote counts and creator info.

## Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for setup to complete

2. **Run the Schema**
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Run the SQL commands

3. **Configure Environment Variables**
   - Copy your Supabase URL and anon key
   - Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Test the Setup**
   - Run your Next.js app
   - Try creating a poll
   - Test voting functionality

## Indexes

The schema includes optimized indexes for:
- Poll creation and filtering
- Vote queries and analytics
- User-specific data retrieval
- Time-based queries

## Migration Notes

- This schema is designed for a fresh Supabase project
- All tables use UUID primary keys for consistency
- Foreign key constraints ensure data integrity
- RLS policies provide security without compromising functionality

## Troubleshooting

**Common Issues:**
- **RLS blocking queries**: Check your authentication setup
- **Function permissions**: Ensure proper grants are applied
- **Type errors**: Verify JSONB structure matches your application code

**Debugging:**
- Use Supabase's SQL editor to test queries
- Check the authentication tab for user data
- Monitor the logs for any errors
