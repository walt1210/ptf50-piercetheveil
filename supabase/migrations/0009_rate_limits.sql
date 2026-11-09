-- 0009_rate_limits.sql : fair abuse limits for the public booking form.
-- Run AFTER 0001-0008, in the Supabase SQL Editor. Safe to re-run.
--
-- Problems this fixes (from the Round 3 review):
--   1. request_appointment had ONE global limit (20 requests / 10 min). A single script could use it up and
--      lock every real customer out. Now each visitor (by network address) and each phone number has its own
--      limit, and the global limit is only a high backstop.
--   2. get_booking / cancel_booking had no limit on wrong guesses. Now a visitor gets 10 failed tries per
--      15 minutes.
--   3. Hidden jewelry's approved placements were publicly readable. Now only active items (or an admin).
--
-- Behaviour changes the website already expects (src/features/appointments/appointmentService.js):
--   * get_booking returns NO ROW for a wrong code/phone (it used to raise 'Booking not found').
--   * cancel_booking returns boolean: true = cancelled, false = code + phone did not match.
--   Reason: an exception rolls back everything the function did, including the record of the failed try.
--
-- How a visitor is identified: Supabase passes the caller's address in the request headers
-- (cf-connecting-ip, else the first x-forwarded-for entry). Only an md5 hash of it is stored, for at most
-- 2 days. If no address is available (for example the SQL editor), the per-visitor limits are skipped.

-- ---------------------------------------------------------------- 1. log table (private)

create table if not exists public.rate_limit_events (
  id         bigint generated always as identity primary key,
  scope      text        not null,
  key        text        not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (scope, key, created_at);

alter table public.rate_limit_events enable row level security;      -- no policies: nobody reads it via the API
revoke all on public.rate_limit_events from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. helpers (not callable via the API)

create or replace function public.client_key()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  h  json;
  ip text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  if h is null then
    return null;
  end if;
  ip := nullif(btrim(coalesce(h ->> 'cf-connecting-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '');
  if ip is null then
    return null;
  end if;
  return md5(ip);
end;
$$;

create or replace function public.rl_count(p_scope text, p_key text, p_window interval)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.rate_limit_events
  where scope = p_scope and key = p_key and created_at > now() - p_window;
$$;

create or replace function public.rl_hit(p_scope text, p_key text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.rate_limit_events (scope, key) values (p_scope, p_key);
  -- keep the table tiny: forget anything older than 2 days (a few rows at a time)
  delete from public.rate_limit_events
  where id in (select id from public.rate_limit_events where created_at < now() - interval '2 days' limit 50);
end;
$$;

revoke execute on function public.client_key()                          from public, anon, authenticated;
revoke execute on function public.rl_count(text, text, interval)        from public, anon, authenticated;
revoke execute on function public.rl_hit(text, text)                    from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. request_appointment

create or replace function public.request_appointment(
  p_service_id  uuid,
  p_slot_id     uuid,
  p_guest_name  text,
  p_guest_phone text,
  p_guest_email text default null,
  p_notes       text default null)
returns table (booking_id uuid, booking_reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name   text := btrim(coalesce(p_guest_name, ''));
  v_phone  text;
  v_email  text := nullif(btrim(coalesce(p_guest_email, '')), '');
  v_notes  text := nullif(btrim(coalesce(p_notes, '')), '');
  v_key    text := public.client_key();
  v_slot   public.availability_slots%rowtype;
  v_taken  int;
  v_active int;
  v_id     uuid;
  v_code   text;
  v_try    int := 0;
begin
  -- 1) validate the guest details
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Please enter your name';
  end if;
  v_phone := public.normalize_phone(p_guest_phone);
  if v_email is not null
     and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Invalid email address';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Notes are too long';
  end if;

  -- 2) abuse limits. Per visitor and per phone first, so one person cannot use up everyone's allowance.
  if v_key is not null then
    if public.rl_count('book:ip', v_key, interval '10 minutes') >= 5
       or public.rl_count('book:ip', v_key, interval '24 hours') >= 15 then
      raise exception 'Too many requests from this device';
    end if;
  end if;

  if (select count(*) from public.appointments
      where guest_phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests from this device';
  end if;

  select count(*) into v_active
  from public.appointments a
  join public.availability_slots s on s.id = a.slot_id
  where a.guest_phone = v_phone
    and a.status in ('PENDING', 'APPROVED')
    and s.starts_at > now();
  if v_active >= 3 then
    raise exception 'Too many active bookings';
  end if;

  -- global backstop only (was 20 per 10 minutes)
  if (select count(*) from public.appointments where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Too many requests right now';
  end if;

  -- 3) service and slot (the slot row is locked so concurrent requests are serialized)
  if not exists (select 1 from public.services where id = p_service_id and is_active) then
    raise exception 'Service not available';
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found or v_slot.is_blocked or v_slot.starts_at <= now() then
    raise exception 'Slot not available';
  end if;

  if exists (select 1 from public.appointments
             where guest_phone = v_phone and slot_id = p_slot_id
               and status in ('PENDING', 'APPROVED')) then
    raise exception 'Duplicate request' using errcode = '23505';
  end if;

  select count(*) into v_taken
  from public.appointments
  where slot_id = p_slot_id and status in ('PENDING', 'APPROVED');
  if v_taken >= v_slot.capacity then
    raise exception 'Slot is full';
  end if;

  -- 4) insert (retry only if the random reference code happens to collide)
  loop
    v_code := public.new_reference_code();
    begin
      insert into public.appointments
        (service_id, slot_id, guest_name, guest_phone, guest_email, notes, reference_code)
      values
        (p_service_id, p_slot_id, v_name, v_phone, v_email, v_notes, v_code)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.appointment_events (appointment_id, actor_id, old_status, new_status, note)
  values (v_id, null, null, 'PENDING', 'Requested online by guest');

  -- only successful requests are counted (a failed request is rolled back and made no booking anyway)
  if v_key is not null then
    perform public.rl_hit('book:ip', v_key);
  end if;

  return query select v_id, v_code;
end;
$$;

-- ---------------------------------------------------------------- 4. get_booking / cancel_booking

-- cancel_booking changes its return type, so the old version must be dropped first.
drop function if exists public.get_booking(text, text);
drop function if exists public.cancel_booking(text, text);

create or replace function public.get_booking(p_reference text, p_phone text)
returns table (
  booking_reference text,
  status            public.appointment_status,
  service_name      text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ref   text := upper(regexp_replace(coalesce(p_reference, ''), '[^A-Za-z0-9]', '', 'g'));
  v_phone text;
  v_key   text := public.client_key();
begin
  if v_key is not null and public.rl_count('lookup:fail', v_key, interval '15 minutes') >= 10 then
    raise exception 'Too many attempts';
  end if;

  begin
    v_phone := public.normalize_phone(p_phone);
  exception when others then
    v_phone := null;
  end;

  if v_phone is not null then
    return query
      select a.reference_code, a.status, sv.name, s.starts_at, s.ends_at, a.created_at
      from public.appointments a
      join public.services sv on sv.id = a.service_id
      join public.availability_slots s on s.id = a.slot_id
      where a.reference_code = v_ref and a.guest_phone = v_phone;
    if found then
      return;
    end if;
  end if;

  -- wrong code or phone: remember the failed try and return nothing (same result for both causes)
  if v_key is not null then
    perform public.rl_hit('lookup:fail', v_key);
  end if;
end;
$$;

create or replace function public.cancel_booking(p_reference text, p_phone text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref   text := upper(regexp_replace(coalesce(p_reference, ''), '[^A-Za-z0-9]', '', 'g'));
  v_phone text;
  v_key   text := public.client_key();
  v_appt  public.appointments%rowtype;
begin
  if v_key is not null and public.rl_count('lookup:fail', v_key, interval '15 minutes') >= 10 then
    raise exception 'Too many attempts';
  end if;

  begin
    v_phone := public.normalize_phone(p_phone);
  exception when others then
    v_phone := null;
  end;

  if v_phone is not null then
    select * into v_appt from public.appointments
    where reference_code = v_ref and guest_phone = v_phone
    for update;
  end if;

  if v_phone is null or v_appt.id is null then
    if v_key is not null then
      perform public.rl_hit('lookup:fail', v_key);
    end if;
    return false;                       -- not found (no exception, so the failed try stays recorded)
  end if;

  -- code + phone matched, so it is safe to explain why this one cannot be cancelled
  if v_appt.status not in ('PENDING', 'APPROVED') then
    raise exception 'Appointment can no longer be cancelled';
  end if;

  update public.appointments set status = 'CANCELLED', updated_at = now() where id = v_appt.id;
  insert into public.appointment_events (appointment_id, actor_id, old_status, new_status, note)
  values (v_appt.id, null, v_appt.status, 'CANCELLED', 'Cancelled by guest with reference code');
  return true;
end;
$$;

revoke execute on function public.get_booking(text, text)    from public;
revoke execute on function public.cancel_booking(text, text) from public;
grant  execute on function public.get_booking(text, text)    to anon, authenticated;
grant  execute on function public.cancel_booking(text, text) to anon, authenticated;

-- request_appointment keeps its signature, so its existing grants stay; re-assert them anyway
revoke execute on function public.request_appointment(uuid, uuid, text, text, text, text) from public;
grant  execute on function public.request_appointment(uuid, uuid, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 5. hidden jewelry placements

drop policy if exists "jewelry_compat: public read" on public.jewelry_compatibility;
drop policy if exists "jewelry_compat: read active or admin" on public.jewelry_compatibility;
create policy "jewelry_compat: read active or admin" on public.jewelry_compatibility
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.jewelry j
      where j.id = jewelry_compatibility.jewelry_id and j.is_active
    )
  );
