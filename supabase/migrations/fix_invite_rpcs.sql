begin;

create or replace function public.create_course_invite(
  p_course_id text,
  p_email text,
  p_expires_in_days integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_token uuid;
  v_expires_at timestamptz;
  v_course_slug text;
begin
  if p_course_id is null or length(trim(p_course_id)) = 0 then
    raise exception 'p_course_id is required';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'p_email is required';
  end if;

  begin
    v_course_id := p_course_id::uuid;
  exception
    when others then
      select id into v_course_id
      from public.courses
      where slug = p_course_id;
  end;

  if v_course_id is null then
    raise exception 'Course not found';
  end if;

  v_expires_at := now() + make_interval(days => greatest(1, coalesce(p_expires_in_days, 30)));

  insert into public.course_invites(course_id, email, expires_at)
  values (v_course_id, lower(trim(p_email)), v_expires_at)
  returning token into v_token;

  select slug into v_course_slug
  from public.courses
  where id = v_course_id;

  return jsonb_build_object(
    'success', true,
    'token', v_token::text,
    'expires_at', v_expires_at,
    'course_id', v_course_id,
    'course_slug', v_course_slug,
    'invite_url', 'https://blom-academy.vercel.app/accept-invite?invite=' || v_token::text
  );
end;
$$;

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
  v_invite record;
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
  into v_invite
  from public.course_invites
  where token = v_token_uuid
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if v_invite.redeemed_at is not null then
    raise exception 'Invite already redeemed';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  insert into public.enrollments(user_id, course_id)
  values (v_user_id, v_invite.course_id)
  on conflict do nothing;

  update public.course_invites
  set redeemed_at = now(),
      redeemed_user_id = v_user_id
  where id = v_invite.id;

  select slug into v_course_slug
  from public.courses
  where id = v_invite.course_id;

  return jsonb_build_object(
    'success', true,
    'course_id', v_invite.course_id,
    'course_slug', v_course_slug
  );
end;
$$;

commit;
