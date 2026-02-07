begin;

create or replace function public.claim_course_invite(
  p_token uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record record;
  v_course_slug text;
begin
  select *
  into invite_record
  from public.course_invites
  where token = p_token
    and expires_at > now()
    and redeemed_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invite'
    );
  end if;

  update public.course_invites
  set redeemed_at = now(),
      redeemed_user_id = p_user_id
  where token = p_token;

  insert into public.enrollments (user_id, course_id, enrolled_at)
  values (p_user_id, invite_record.course_id, now())
  on conflict (user_id, course_id) do nothing;

  select slug
  into v_course_slug
  from public.courses
  where id = invite_record.course_id;

  return jsonb_build_object(
    'success', true,
    'course_id', invite_record.course_id,
    'course_slug', v_course_slug
  );
end;
$$;

commit;

