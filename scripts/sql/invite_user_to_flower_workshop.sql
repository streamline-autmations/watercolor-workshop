-- ============================================================================
-- OPTION 1: Create a course invite using SQL
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Step 1: First, find the Flower Workshop course details (run this to get the course_id)
SELECT id, slug, title 
FROM public.courses 
WHERE title ILIKE '%flower%' OR slug ILIKE '%flower%';

-- Step 2: Create the invite (replace 'user@email.com' with the actual email)
-- This function returns a token that you'll share with the user
SELECT * FROM public.create_course_invite(
  'blom-flower-watercolor-workshop',  -- course slug
  'user@email.com',                    -- user's email address
  30                                    -- expires in 30 days
);

-- The result will look like:
-- { "token": "abc123def456...", "course_id": "...", "expires_at": "2026-04-..." }
-- 
-- Copy the token value and create an invite link:
-- https://your-domain.com/accept-invite?invite=abc123def456...


-- ============================================================================
-- OPTION 2: Direct enrollment (if user already has an account)
-- You need the user's ID from auth.users table
-- ============================================================================

-- Find the user by email (get their UUID)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@email.com';

-- Then enroll them directly (replace with actual user ID and course slug)
-- Run this after you get the user ID from above:
SELECT * FROM public.enroll_user_by_id(
  'USER-ID-FROM-ABOVE',           -- user's UUID
  ARRAY['blom-flower-watercolor-workshop']  -- course slug(s)
);


-- ============================================================================
-- To check existing invites:
-- ============================================================================
SELECT ci.id, ci.email, ci.token, ci.created_at, ci.redeemed_at, ci.expires_at,
       c.slug as course_slug, c.title as course_title
FROM public.course_invites ci
JOIN public.courses c ON c.id = ci.course_id
ORDER BY ci.created_at DESC
LIMIT 10;
