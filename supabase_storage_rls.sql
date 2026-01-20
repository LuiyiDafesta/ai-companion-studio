-- Create the storage bucket 'ahdocuments' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ahdocuments', 'ahdocuments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on objects (it should be on by default, but good to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Public Read Access (Select)
-- Allows anyone to read files if the bucket is public
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ahdocuments' );

-- 2. Policy for Authenticated Uploads (Insert)
-- Allows any authenticated user to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'ahdocuments' );

-- 3. Policy for Owners to Update (Update)
-- Allows users to update their own files (if applicable, or just generic auth access for now)
-- Assuming we want authenticated users to be able to overwrite/update files in this bucket
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'ahdocuments' );

-- 4. Policy for Owners to Delete (Delete)
-- Allows authenticated users to delete files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'ahdocuments' );
