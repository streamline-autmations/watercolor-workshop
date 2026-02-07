-- List the last 5 course invites
SELECT id, email, course_id, created_at, redeemed_at
FROM public.course_invites
ORDER BY created_at DESC
LIMIT 5;

-- List all courses to get ID and Slug mapping
SELECT id, slug, title
FROM public.courses;
