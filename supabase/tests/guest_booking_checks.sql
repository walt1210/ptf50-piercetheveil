-- guest_booking_checks.sql : automated checks for guest booking (0007) as changed by 0009 (rate limits).
-- Run AFTER 0009. No test users to create: it uses the existing admin profile (and a customer
-- profile if one exists; those checks are skipped otherwise).
-- Run this whole file in the SQL Editor. It ends with an intentional "error" that carries the
-- PASS/FAIL report, which also rolls back every booking it made, so real data is untouched.
--
-- Changes from the 0007 version:
--   * get_booking returns NO ROW for a wrong code/phone; cancel_booking returns false (0009).
--   * The test no longer assumes an empty appointments table: it counts existing rows first (base).
--   * Added: visitors cannot read rate_limit_events.
-- Note: the SQL Editor sends no request headers, so client_key() is NULL and the per-visitor
-- rate limits are skipped here. They are NOT covered by this file; test them by hand in the app.

do $$
declare
  adm uuid; cust uuid;
  svc uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid;
  id1 uuid; id2 uuid; id4 uuid;
  code1 text; code2 text;
  n int; base int; st text; v_actor uuid;
  v_ok boolean;
  t1 timestamptz;
  r text := E'\n';
begin
  select id into adm  from public.profiles where role = 'admin'    limit 1;
  select id into cust from public.profiles where role = 'customer' limit 1;
  select id into svc  from public.services where name = 'Helix';

  select id into s1 from public.availability_slots where starts_at > now() and not is_blocked order by starts_at offset 0 limit 1;
  select id into s2 from public.availability_slots where starts_at > now() and not is_blocked order by starts_at offset 1 limit 1;
  select id into s3 from public.availability_slots where starts_at > now() and not is_blocked order by starts_at offset 2 limit 1;
  select id into s4 from public.availability_slots where starts_at > now() and not is_blocked order by starts_at offset 3 limit 1;
  select id into s5 from public.availability_slots where starts_at > now() and not is_blocked order by starts_at offset 4 limit 1;
  update public.availability_slots set capacity = 1 where id in (s1, s2, s3, s4, s5);   -- undone by the rollback
  select starts_at into t1 from public.availability_slots where id = s1;

  if svc is null or s5 is null then
    raise exception 'Need the Helix service and at least 5 future open slots';
  end if;

  ---------------------------------------------------------------- A. visitor (anon)
  reset role;
  -- how many appointments already exist (real data), so later counts do not assume an empty table
  select count(*) into base from public.appointments;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;

  begin
    select count(*) into n from public.get_available_slots(now(), now() + interval '90 days');
    r := r || case when n > 0 then 'PASS  ' else 'FAIL  ' end || 'visitor can see open slots (' || n || E')\n';
  exception when others then
    r := r || 'FAIL  visitor can see open slots: ' || sqlerrm || E'\n';
  end;

  begin
    select booking_id, booking_reference into id1, code1
    from public.request_appointment(svc, s1, 'Test Guest', '0917 123 4567', 'guest@example.com', 'Setting: Client address');
    r := r || case when id1 is not null and length(code1) = 8 and code1 ~ '^[A-HJ-NP-Z2-9]{8}$' then 'PASS  ' else 'FAIL  ' end
           || 'visitor can request a slot and gets an 8-char reference code (' || coalesce(code1, 'null') || E')\n';
  exception when others then
    r := r || 'FAIL  visitor can request a slot: ' || sqlerrm || E'\n';
  end;

  begin
    select count(*) into n from public.appointments;
    r := r || E'FAIL  visitor read the appointments table\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'visitor cannot read appointments (' || sqlerrm || E')\n';
  end;

  begin
    select count(*) into n from public.rate_limit_events;
    r := r || E'FAIL  visitor read the rate_limit_events table\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'visitor cannot read rate_limit_events (' || sqlerrm || E')\n';
  end;

  begin
    insert into public.appointments (service_id, slot_id, guest_name, guest_phone, reference_code)
    values (svc, s5, 'Direct Insert', '09170000000', 'DIRECT22');
    r := r || E'FAIL  visitor inserted an appointment directly\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'direct insert into appointments is blocked (' || sqlerrm || E')\n';
  end;

  begin
    update public.appointments set status = 'APPROVED' where id = id1;
    r := r || E'FAIL  visitor updated an appointment directly\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'direct update of appointments is blocked (' || sqlerrm || E')\n';
  end;

  begin
    perform public.request_appointment(svc, s5, 'Bad Phone', '12345', null, null);
    r := r || E'FAIL  invalid phone accepted\n';
  exception when others then
    r := r || case when sqlerrm like '%Invalid phone number%' then 'PASS  ' else 'FAIL  ' end
           || 'invalid phone is rejected (' || sqlerrm || E')\n';
  end;

  begin
    perform public.request_appointment(svc, s5, '  ', '09170000001', null, null);
    r := r || E'FAIL  blank name accepted\n';
  exception when others then
    r := r || case when sqlerrm like '%Please enter your name%' then 'PASS  ' else 'FAIL  ' end
           || 'blank name is rejected (' || sqlerrm || E')\n';
  end;

  begin
    perform public.request_appointment(svc, s5, 'Bad Email', '09170000002', 'not-an-email', null);
    r := r || E'FAIL  invalid email accepted\n';
  exception when others then
    r := r || case when sqlerrm like '%Invalid email address%' then 'PASS  ' else 'FAIL  ' end
           || 'invalid email is rejected (' || sqlerrm || E')\n';
  end;

  begin
    perform public.request_appointment(svc, s1, 'Test Guest', '+63 917 123 4567', null, null);
    r := r || E'FAIL  same phone booked the same slot twice\n';
  exception when others then
    r := r || case when sqlstate = '23505' then 'PASS  ' else 'FAIL  ' end
           || 'same phone cannot book the same slot twice, even written as +63 (' || sqlerrm || E')\n';
  end;

  begin
    perform public.request_appointment(svc, s1, 'Someone Else', '09189998888', null, null);
    r := r || E'FAIL  booked a full slot\n';
  exception when others then
    r := r || case when sqlerrm like '%Slot is full%' then 'PASS  ' else 'FAIL  ' end
           || 'a full slot cannot be booked by someone else (' || sqlerrm || E')\n';
  end;

  begin
    select booking_id into id2 from public.request_appointment(svc, s2, 'Test Guest', '09171234567', null, null);
    perform public.request_appointment(svc, s3, 'Test Guest', '0917-123-4567', null, null);
    r := r || E'PASS  same phone (written 3 ways) can hold 3 active bookings\n';
  exception when others then
    r := r || 'FAIL  same phone can hold 3 active bookings: ' || sqlerrm || E'\n';
  end;

  begin
    perform public.request_appointment(svc, s4, 'Test Guest', '09171234567', null, null);
    r := r || E'FAIL  4th active booking accepted\n';
  exception when others then
    r := r || case when sqlerrm like '%Too many active bookings%' then 'PASS  ' else 'FAIL  ' end
           || 'a 4th active booking for one phone is rejected (' || sqlerrm || E')\n';
  end;

  begin
    select count(*) into n
    from public.get_booking(lower(substr(code1, 1, 4) || '-' || substr(code1, 5)), '+63 917 123 4567') b
    where b.status = 'PENDING' and b.service_name = 'Helix';
    r := r || case when n = 1 then 'PASS  ' else 'FAIL  ' end
           || 'booking lookup works with lowercase/hyphenated code and +63 phone' || E'\n';
  exception when others then
    r := r || 'FAIL  booking lookup: ' || sqlerrm || E'\n';
  end;

  -- 0009: a wrong code or phone returns NO ROW (not an error), so the failed try can be counted
  begin
    select count(*) into n from public.get_booking(code1, '09189998888');
    r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end
           || 'lookup with the wrong phone returns no row (saw ' || n || E')\n';
  exception when others then
    r := r || 'FAIL  lookup with the wrong phone: ' || sqlerrm || E'\n';
  end;

  begin
    select count(*) into n from public.get_booking('ZZZZZZZZ', '09171234567');
    r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end
           || 'lookup with an unknown code returns no row, same as a wrong phone (saw ' || n || E')\n';
  exception when others then
    r := r || 'FAIL  lookup with an unknown code: ' || sqlerrm || E'\n';
  end;

  -- 0009: cancel_booking returns false when code + phone do not match
  begin
    v_ok := public.cancel_booking(code1, '09189998888');
    r := r || case when v_ok is false then 'PASS  ' else 'FAIL  ' end
           || 'cancel with the wrong phone returns false (got ' || coalesce(v_ok::text, 'null') || E')\n';
  exception when others then
    r := r || 'FAIL  cancel with the wrong phone: ' || sqlerrm || E'\n';
  end;

  begin
    select count(*) into n from public.get_booking(code1, '09171234567') where status = 'PENDING';
    r := r || case when n = 1 then 'PASS  ' else 'FAIL  ' end
           || 'the booking is still PENDING after a failed cancel attempt' || E'\n';
  exception when others then
    r := r || 'FAIL  booking status after failed cancel: ' || sqlerrm || E'\n';
  end;

  begin
    v_ok := public.cancel_booking(code1, '+639171234567');
    select count(*) into n
    from public.get_available_slots(t1 - interval '1 minute', t1 + interval '1 minute');
    r := r || case when v_ok is true and n = 1 then 'PASS  ' else 'FAIL  ' end
           || 'guest can cancel with code + phone (returns true), and the slot opens up again' || E'\n';
  exception when others then
    r := r || 'FAIL  guest cancel: ' || sqlerrm || E'\n';
  end;

  begin
    perform public.cancel_booking(code1, '09171234567');
    r := r || E'FAIL  cancelled the same booking twice\n';
  exception when others then
    r := r || case when sqlerrm like '%can no longer be cancelled%' then 'PASS  ' else 'FAIL  ' end
           || 'an already cancelled booking cannot be cancelled again (' || sqlerrm || E')\n';
  end;

  begin
    perform public.admin_update_appointment(id2, 'approve');
    r := r || E'FAIL  visitor approved an appointment\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'visitor cannot approve appointments (' || sqlerrm || E')\n';
  end;

  begin
    perform public.normalize_phone('09171234567');
    r := r || E'FAIL  visitor can call internal helper normalize_phone\n';
  exception when others then
    r := r || case when sqlstate = '42501' then 'PASS  ' else 'FAIL  ' end
           || 'internal helper functions are not callable by visitors (' || sqlerrm || E')\n';
  end;

  ---------------------------------------------------------------- B. signed-in non-admin (only if one exists)
  reset role;
  if cust is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
    set local role authenticated;

    begin
      select count(*) into n from public.appointments;
      r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end
             || 'signed-in non-admin sees 0 appointments (saw ' || n || E')\n';
    exception when others then
      r := r || 'FAIL  non-admin read of appointments: ' || sqlerrm || E'\n';
    end;

    begin
      perform public.admin_update_appointment(id2, 'approve');
      r := r || E'FAIL  non-admin approved an appointment\n';
    exception when others then
      r := r || case when sqlerrm like '%Admins only%' then 'PASS  ' else 'FAIL  ' end
             || 'non-admin cannot approve appointments (' || sqlerrm || E')\n';
    end;
  else
    r := r || E'SKIP  no customer profile exists, so the signed-in non-admin checks were skipped\n';
  end if;

  ---------------------------------------------------------------- C. admin (also books while previewing the site)
  reset role;
  if adm is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
    set local role authenticated;

    begin
      select booking_id into id4 from public.request_appointment(svc, s4, 'Admin Preview', '09175550000', null, null);
      r := r || E'PASS  a signed-in admin can also use the public booking form\n';
    exception when others then
      r := r || 'FAIL  admin using the booking form: ' || sqlerrm || E'\n';
    end;

    -- this run created 4 rows (id1 cancelled, id2, the 3rd booking, and the admin preview) on top of what already existed
    begin
      select count(*) into n from public.appointments;
      r := r || case when n = base + 4 then 'PASS  ' else 'FAIL  ' end
             || 'admin sees all appointments (expected ' || (base + 4) || ', saw ' || n || E')\n';
    exception when others then
      r := r || 'FAIL  admin read of appointments: ' || sqlerrm || E'\n';
    end;

    begin
      perform public.admin_update_appointment(id2, 'approve');
      select status::text into st from public.appointments where id = id2;
      select actor_id into v_actor from public.appointment_events
        where appointment_id = id2 and new_status = 'APPROVED' limit 1;
      r := r || case when st = 'APPROVED' and v_actor = adm then 'PASS  ' else 'FAIL  ' end
             || 'admin can approve a guest booking and the audit event records the admin' || E'\n';
    exception when others then
      r := r || 'FAIL  admin approve: ' || sqlerrm || E'\n';
    end;

    begin
      select count(*) into n from public.appointments
      where guest_name is not null and guest_phone is not null and reference_code is not null;
      r := r || case when n = base + 4 then 'PASS  ' else 'FAIL  ' end
             || 'admin can read guest name, phone and reference code (expected ' || (base + 4) || ', saw ' || n || E')\n';
    exception when others then
      r := r || 'FAIL  admin reading guest fields: ' || sqlerrm || E'\n';
    end;
  else
    r := r || E'SKIP  no admin profile exists, so the admin checks were skipped\n';
  end if;

  ---------------------------------------------------------------- D. structure
  reset role;

  select count(*) into n from information_schema.columns
  where table_schema = 'public' and table_name = 'appointments' and column_name = 'customer_id';
  r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end || 'appointments.customer_id is gone' || E'\n';

  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname in ('cancel_my_appointment')
     or (ns.nspname = 'public' and p.proname = 'request_appointment' and p.pronargs = 3);
  r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end || 'old account-based functions are removed' || E'\n';

  select count(*) into n from pg_policies
  where schemaname = 'public' and tablename in ('appointments', 'appointment_events')
    and (qual like '%customer_id%');
  r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end || 'no policy still refers to customer_id' || E'\n';

  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public'
    and p.proname in ('request_appointment', 'get_booking', 'cancel_booking', 'get_available_slots')
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  r := r || case when n = 4 then 'PASS  ' else 'FAIL  ' end || 'anon can execute exactly the 4 public booking functions' || E'\n';

  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'admin_update_appointment'
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end || 'anon cannot execute admin_update_appointment' || E'\n';

  select count(*) into n from (select 1 where has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
                               or has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')) x;
  r := r || case when n = 0 then 'PASS  ' else 'FAIL  ' end || 'nobody can update profiles.role through the API' || E'\n';

  raise exception E'\n=== GUEST BOOKING CHECKS ===\n(this "error" is intentional: it carries the report and rolls back all test data)\n%\nFAIL count: %',
    r, (length(r) - length(replace(r, 'FAIL  ', ''))) / 6;
end $$;