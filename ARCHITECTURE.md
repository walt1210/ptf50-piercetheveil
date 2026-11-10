# PierceWise / Pierce the Veil
AI-powered piercing appointment scheduling + jewelry recommendation web app (PTF50 final project, Angeles City, PH).
Repo: cathtayer/ptf50-piercetheveil | Branches: main, backend, admin-dashboard

## Stack (all free tier)
React 18 + Vite 6, Tailwind CSS 3, React Router 7, lucide-react. Use npm (not pnpm).
Fonts: Blackadder ITC (serif, local files in src/assets/fonts) + DM Sans (sans, Google Fonts). Theme tokens: brand-black, brand-dark, brand-blood, brand-cream, brand-muted, brand-gold.
Backend: Supabase (Postgres, Auth, RLS, Storage), project "piercewise".
Hosting: Vercel Hobby, https://ptf50-piercetheveil.vercel.app, deployed from the local folder with `npx vercel --prod`
(repo owner differs from the Vercel account, so Git auto-deploy is not used). Build command `npm run build`; vercel.json = SPA rewrite.
AI: Transformers.js 4.2.0 in the browser, model Xenova/all-MiniLM-L6-v2 (dtype q8, ~23 MB), cosine similarity.

## Folder map (src/)
- pages/client, pages/admin | layouts/ClientLayout (navbar+footer for all public pages), AdminLayout | routes/AppRoutes, ClientRoutes, AdminRoutes, ProtectedRoute
- Public routes: / (Home), /catalog, /catalog/:id, /recommend (AI stylist), /availability (booking), /booking (look up/cancel by code). No login.
- context/AuthContext.jsx + hooks/useAuth.js -> { user, profile, isAdmin, loading }
- services/supabase.js (client), services/api.js (toUserMessage, formatManila)
- styles/index.css (global stylesheet; @import fonts first, then @tailwind lines)
- features/jewelry/jewelryFilters.js (pure catalog filters; public pages pass onlyActive:true to listJewelry/getJewelry so hidden pieces never show, even to a logged-in admin) | components/client: ProductCard, PageHero, Navbar, Footer
- features/authentication/authService.js (admin sign in/out + profile only; customers are guests)
- features/jewelry/jewelryService.js (catalog, admin CRUD, placements, image upload)
- features/appointments/appointmentService.js (services, slots, booking, admin actions, schedule/service management,
  listCustomers, listPiercingTypes) + appointmentStatus.js
- features/recommendations/: recommendationService (recommend()), embeddingService (model), embeddingStore (index in DB),
  ranking (pure helpers, keyword fallback, reasons), similarity, evaluate (report harness)
- supabase/migrations/0001..0007 (run in order), supabase/tests/backend_checks.sql + guest_booking_checks.sql
- scripts/copy-ort.mjs -> copies the WASM runtime to public/ort (gitignored; runs on predev/prebuild)

## Admin pages (pages/admin) and their data
- Schedule: availability_slots via listSlots/createSlot/setSlotBlocked. Hours are derived from slots (no hours table);
  a date is "blocked" when all its slots are blocked.
- Services: listAllServices/createService/updateService (is_active toggle), listPiercingTypes for the type dropdown.
  The Home price guide (components/client/ServicesGuide) reads the ACTIVE services via listServices + features/appointments/serviceGuide.js;
  data/studioContent.js only supplies category names/order and a fallback if loading fails. The gallery price-list images are still static.
- Customers ("clients"): listCustomers groups appointments by guest_phone (name/email from the latest booking) with request and COMPLETED-visit counts.

## Data model (UUID PKs, UTC timestamps, display Asia/Manila)
profiles(admin accounts; role customer|admin) | piercing_types | services | jewelry | jewelry_compatibility(approved) |
jewelry_embeddings(model key, source_text, embedding jsonb) | availability_slots(capacity, is_blocked) |
appointments(guest_name, guest_phone, guest_email, reference_code, service_id, slot_id, status, notes) | appointment_events (audit) | recommendation_feedback

## Security model
- RLS on every table. Only the PUBLISHABLE key is in the app; the secret key is never used.
- Customers have NO accounts. Visitors (anon) may only call get_available_slots, request_appointment, get_booking, cancel_booking.
  Appointments are changed ONLY via RPCs; direct insert/update is blocked; only admins can read the appointments table.
- Guest abuse limits (in request_appointment): max 3 active bookings per phone, max 20 new requests per 10 minutes overall,
  same phone cannot hold a slot twice. Lookup/cancel need reference code + phone (same error for either being wrong).
  recommendation_feedback still has customer_id (dormant, unused): drop it or make it anonymous before using it.
- Admin role can only be set in the SQL editor (column grant + trigger protect_profile_role).
- PENDING and APPROVED both hold a slot. Flow: PENDING -> APPROVED/REJECTED/CANCELLED; APPROVED -> COMPLETED/CANCELLED/NO_SHOW.

## Recommender: recommend({piercingTypeId, budget, style, material, color, freeText, onProgress})
1) FILTER: active, in stock, within budget, shop-approved for the piercing. 2) RANK eligible items by cosine similarity.
3) EXPLAIN from real catalog data. Returns { mode: ai|fallback|filter|none, results[{item,score,reasons}], lowConfidence, bestScore, disclaimer }.
Thresholds (provisional, calibrate in evaluation): STRONG 0.45 "closely matches", PARTIAL 0.30 "partly matches", below = no claim.
Fallback = keyword overlap when the model cannot load. Admin saves auto-index; admin page shows "AI index x of y" + Update button.
Similarity = style relevance only, NOT piercing safety (piercer confirms at the appointment).
Evaluation: PierceWise_Evaluation_Kit.xlsx (18 cases; columns match the recommend() inputs; owner marks relevant pieces Y/N).
