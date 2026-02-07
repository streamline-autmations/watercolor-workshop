begin;

drop function if exists public.claim_course_invite(uuid, uuid);
drop function if exists public.claim_course_invite(uuid);

create or replace function public.claim_course_invite(
  p_token text,
  p_user_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_user_id uuid;
  v_user_id uuid;
  v_token_uuid uuid;
  invite_record record;
  v_course_slug text;
begin
  v_session_user_id := auth.uid();
  if v_session_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  v_user_id := coalesce(p_user_id, v_session_user_id);
  if v_user_id <> v_session_user_id then
    raise exception 'Not authorized';
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'p_token is required';
  end if;

  begin
    v_token_uuid := trim(p_token)::uuid;
  exception
    when others then
      raise exception 'Invalid invite token format';
  end;

  select *
  into invite_record
  from public.course_invites
  where token = v_token_uuid
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
      redeemed_user_id = v_user_id
  where token = v_token_uuid;

  insert into public.enrollments (user_id, course_id, enrolled_at)
  values (v_user_id, invite_record.course_id, now())
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
