-- ============================================================================
-- Auto-enroll users when they sign up based on their email
-- This creates a table of "pending enrollments" and a trigger to auto-enroll
-- ============================================================================

-- Step 1: Create a table to store emails that should get automatic course access
CREATE TABLE IF NOT EXISTS public.pending_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  course_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.pending_enrollments TO anon, authenticated, service_role;

-- Step 2: Create a trigger function that auto-enrolls new users
CREATE OR REPLACE FUNCTION public.auto_enroll_new_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending record;
  v_course_id uuid;
BEGIN
  -- Only run for new users (INSERT)
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get the user's email from the new user record
  -- For auth.users, email is in NEW.raw_user_meta_data->'email' or NEW.email
  DECLARE
    v_email text;
  BEGIN
    -- Try different ways to get email depending on table
    IF TG_TABLE_NAME = 'users' THEN
      v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
    ELSE
      v_email := COALESCE(NEW.email, (NEW.raw_user_meta_data->>'email'));
    END IF;
    
    v_email := lower(trim(v_email));
    
    -- Find pending enrollment for this email
    SELECT * INTO v_pending
    FROM public.pending_enrollments
    WHERE lower(email) = v_email;
    
    IF v_pending IS NOT NULL THEN
      -- Get course ID from slug
      SELECT id INTO v_course_id
      FROM public.courses
      WHERE slug = v_pending.course_slug;
      
      IF v_course_id IS NOT NULL THEN
        -- Enroll the user
        INSERT INTO public.enrollments(user_id, course_id)
        VALUES (NEW.id, v_course_id)
        ON CONFLICT DO NOTHING;
        
        -- Remove from pending (optional - keep if you want them to stay in list)
        DELETE FROM public.pending_enrollments WHERE id = v_pending.id;
        
        RAISE NOTICE 'Auto-enrolled % into course %', v_email, v_pending.course_slug;
      END IF;
    END IF;
    
  END;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger on auth.users
DROP TRIGGER IF EXISTS trigger_auto_enroll_user ON auth.users;
CREATE TRIGGER trigger_auto_enroll_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_new_user();

-- ============================================================================
-- HOW TO USE:
-- ============================================================================

-- Add an email to the pending enrollments list
-- When that user signs up, they'll automatically get access to the Flower course
INSERT INTO public.pending_enrollments (email, course_slug)
VALUES ('user@email.com', 'blom-flower-watercolor-workshop');

-- Check pending enrollments
SELECT * FROM public.pending_enrollments;

-- Remove a pending enrollment
DELETE FROM public.pending_enrollments WHERE email = 'user@email.com';
