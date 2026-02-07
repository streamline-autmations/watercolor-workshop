begin;

drop function if exists public.claim_course_invite(uuid, uuid);
drop function if exists public.claim_course_invite(uuid);

commit;
