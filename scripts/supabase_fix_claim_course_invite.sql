begin;

create or replace function public.claim_course_invite(
  p_token text,
  p_user_id uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_user_id uuid;
  v_token_uuid uuid;
  v_invite_id uuid;
  v_course_id uuid;
  v_course_slug text;
  v_redeemed_at timestamptz;
  v_expires_at timestamptz;
begin
  v_session_user_id := auth.uid();
  if v_session_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  if p_user_id is not null and p_user_id <> v_session_user_id then
    raise exception 'Not authorized';
  end if;

  begin
    v_token_uuid := p_token::uuid;
  exception
    when others then
      raise exception 'Invalid invite token format';
  end;

  select
    id,
    course_id,
    redeemed_at,
    expires_at
  into
    v_invite_id,
    v_course_id,
    v_redeemed_at,
    v_expires_at
  from public.course_invites
  where token = v_token_uuid
  for update;

  if v_invite_id is null then
    raise exception 'Invalid invite token';
  end if;

  if v_redeemed_at is not null then
    raise exception 'This invite has already been redeemed';
  end if;

  if v_expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  select slug into v_course_slug
  from public.courses
  where id = v_course_id;

  if v_course_slug is null then
    raise exception 'Course not found for this invite';
  end if;

  insert into public.enrollments(user_id, course_id)
  values (v_session_user_id, v_course_id)
  on conflict (user_id, course_id) do nothing;

  update public.course_invites
  set redeemed_at = now(),
      redeemed_user_id = v_session_user_id
  where id = v_invite_id;

  return json_build_object(
    'success', true,
    'course_id', v_course_id,
    'course_slug', v_course_slug
  );
end;
$$;

create or replace function public.claim_course_invite(
  p_token uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  v_result := public.claim_course_invite(p_token::text, p_user_id);
  return v_result::jsonb;
end;
$$;

commit;

