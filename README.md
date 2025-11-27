
# ICT Club Hub

A sleek and modern system for club members to log in, view activities, track attendance, and follow learning roadmaps.

## Database Setup (Supabase)

To enable all features (including Learning Roadmaps and File Uploads), please run the following SQL commands in your Supabase SQL Editor.

### 1. Users & Profiles (Existing)
Ensure you have a `users` table. Note that `uid` is treated as `TEXT`.

### 2. Roadmaps Table
```sql
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_level TEXT NOT NULL,
  topic TEXT NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(skill_level)
);
```

### 3. User Roadmap Progress Table
*This table tracks student progress. It links `user_id` (TEXT) to `roadmap_id` (UUID).*

```sql
CREATE TABLE IF NOT EXISTS user_roadmap_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  completed_milestone_indices INTEGER[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, roadmap_id)
);
```

### 4. Storage Setup (Critical for Uploads)
*Run this to create buckets and allow uploads for Assignments, Resources, and Chat.*

```sql
-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('resource_uploads', 'resource_uploads', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('resource_files', 'resource_files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_files', 'chat_files', true) ON CONFLICT (id) DO NOTHING;

-- 2. Allow Authenticated Uploads (Generic Policy)
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Allow Public Viewing (Generic Policy)
CREATE POLICY "Allow Public Select"
ON storage.objects FOR SELECT TO public
USING (true);

-- 4. Allow Owners to Delete (Generic Policy)
CREATE POLICY "Allow Owners Delete"
ON storage.objects FOR DELETE TO authenticated
USING (auth.uid() = owner);
```

## Features
- **Activities:** Event tracking and RSVP.
- **Projects:** Kanban board for tasks.
- **Feed:** Announcements and discussions.
- **Roadmap:** AI-generated learning paths with progress tracking and quizzes.
- **Showcase:** Share code snippets.
- **Challenges:** Gamified coding tasks.
- **Playground:** In-browser Python environment.
