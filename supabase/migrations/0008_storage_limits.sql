-- 0008_storage_limits.sql : enforce image rules on the server, not only in the browser.
-- The admin form already limits uploads to 2 MB and JPG/PNG/WebP/GIF; this makes the bucket enforce it too.
-- Safe to re-run.
update storage.buckets
set file_size_limit    = 2097152,   -- 2 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'jewelry-images';
