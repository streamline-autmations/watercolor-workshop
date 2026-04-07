-- Add Faded Flowers Workshop to the courses table
-- Run this in the Supabase SQL editor

INSERT INTO public.courses (slug, title)
VALUES ('faded-flowers-workshop', 'Faded Flowers Workshop')
ON CONFLICT (slug) DO NOTHING;
