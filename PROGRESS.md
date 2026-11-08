# Progress (update after every session)

## Done and verified
- BACKEND: migrations 0001-0007 run on the live DB (0007 guest booking is live). Local Postgres: backend_checks.sql 14/14 and
  guest_booking_checks.sql 32/32 PASS. 0008_storage_limits.sql (bucket 2 MB + image MIME limit) written: run it in the SQL Editor.
- ADMIN REVIEW FIXES (2026-11-08, build verified, not yet clicked through in a browser): Sign Out now works; Appointments shows
  customer notes + a per-row History view; Services can be edited (name/price/duration/type); blocking a date warns about existing
  bookings first; new slots skip overlaps and past times; lists page past Supabase's 1000-row limit (fetchAll); jewelry placements
  save safely (upsert then remove); upload type taken from MIME; edit modal asks before discarding; logo is webp (2.5 MB -> ~100 KB).
- AUTH: admin only. authService, AuthContext (waits for profile), ProtectedRoute (always /admin/login), admin Login + Sign Out
- ADMIN pages, all on real data: Dashboard, Appointments (approve/reject/reschedule/complete/cancel/no-show),
  Jewelry Management (CRUD, photo upload, approved placements, hide/show, AI index status),
  Schedule (hours derived from slots, add slots, block/unblock a date), Services (list, create, activate/deactivate),
  Clients (guests grouped by phone: requests, visits, search)
- AI RECOMMENDER verified in the browser (mode 'ai', filter-first works, e.g. spike barbell excluded for Helix since not approved)
- CLEANUP: @tailwindcss/postcss removed, brand-gold token added, @import order fixed, npm only (pnpm files and packageManager field removed),
  fonts standardized on Cormorant Garamond + DM Sans
- DEPLOYED: https://ptf50-piercetheveil.vercel.app (Vercel Hobby, account walt1210s-projects, via CLI). Opens and works on a phone.
- README, .env.example, .gitignore (ignores .env, .pnpm-store, public/ort, .vercel)
- Evaluation kit drafted: PierceWise_Evaluation_Kit.xlsx (18 cases C01-C18 incl. 2 Taglish, marking sheet template)

## Not done
- Run 0008, redeploy the front end with the admin fixes (`npx vercel --prod`). Confirm "Allow new users to sign up" is OFF in
  Supabase Auth. Optionally delete the test1/2/3 customer users.
- PUBLIC SITE (built, builds clean, all routes render in a server-render smoke test; NOT yet clicked through in a browser):
  ClientLayout + ClientRoutes, Catalog (client-side filters), JewelryDetails, AIRecommendation (uses recommend(); shows model
  download progress, ai/fallback/filter/none states, reasons, disclaimer), BookingLookup (look up + cancel by code + phone).
- Booking page collects name/phone/email and shows a reference code that links to /booking.
- No customer login/register/profile (by design). Unknown URLs redirect to Home.
- Real catalog: 15-20 real pieces with good descriptions + approved placements (waiting on shop owner)
- Evaluation: owner marks Y/N per case/piece (sheet is generated from the catalog export), run runEvaluation(),
  calibrate STRONG/PARTIAL thresholds, write up results (include the Taglish cases)
- Deployment follow-ups: record AI mode + first model load time on mobile data; confirm Supabase Auth URL config
  (Site URL + redirect URLs for the vercel.app URL and localhost); decide if final deploy moves to the repo owner's account

## Known issues / cleanup
1. (fixed by 0007) Client names, phones and emails now come from guest bookings.
2. Schedule only has slots up to 2026-11-17: add more in the admin Schedule page (URGENT: customers see no availability after that).
6. Open: request_appointment's 20-per-10-minutes limit is global (one spammer can block real bookings); get_booking/cancel_booking have no failed-attempt throttle; recommendation_feedback.customer_id is dormant.
3. Blocking a date only sets is_blocked; it does NOT cancel appointments already booked on those slots (the admin now gets a warning with the count and must handle them in Appointments).
4. Operating hours are derived from availability_slots (no hours table); a real hours table would need migration + RLS + test.
5. npm audit: 4 high, all Node-only deps of the AI library (adm-zip, sharp via onnxruntime-node); not in the browser bundle.
   Revisit mid-Nov: commit first, then `npm audit fix`, re-test. Never use --force.

## Gotchas learned
- Supabase auto-grants table privileges; new tables need explicit grants AND RLS policies
- RLS silently updates/returns 0 rows instead of erroring; tests must check row counts
- Vite only reads .env at startup; hard refresh (Ctrl+Shift+R) after changes. On Vercel, VITE_ vars are baked in at build time: redeploy after changing them.
- Model downloads from huggingface.co; WASM runtime is served from /ort (not a CDN). Repo onnx-community/... lacked model_quantized.onnx; use Xenova/...
- Vercel build command must be `npm run build` (not `vite build`) so the prebuild step copies the WASM runtime to public/ort.
- Vercel Hobby: a collaborator cannot import or auto-deploy the repo (owner is cathtayer). Deploy from the local folder: `npx vercel --prod`.
- vercel.json rewrites everything to /index.html so deep links like /admin/schedule do not 404.
- Dev machine is Windows PowerShell: no `rm -rf` (use Remove-Item -Recurse -Force), no `&&` in Windows PowerShell 5.1.
- Supabase free projects pause after about a week idle; wake the project before demos.

## Next up
1. Send catalog request to the shop owner; enter the real catalog; run the SQL export so the marking sheet can be generated
2. Evaluation: owner marking, runEvaluation(), calibrate thresholds
3. Deploy; click through every public page on a phone; check the AI stylist's first model load on mobile data
4. Mid-Nov: npm audit fix (commit first, re-test)
