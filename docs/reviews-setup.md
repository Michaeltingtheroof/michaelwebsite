# Enable client reviews

The review form is deployed with the site, but it needs a Supabase database before submissions can be saved.

## 1. Create the reviews table

1. Create or open a Supabase project.
2. In **SQL Editor**, run the contents of `supabase/reviews-schema.sql` from this repository.
3. Confirm that the `public.reviews` table is present in **Table Editor**.

New rows are `pending` by default. The public API can insert pending reviews and read approved reviews only. Anonymous and authenticated browser roles have no direct table access.

## 2. Add server-only settings in Vercel

In the Vercel project for this website, open **Settings → Environment Variables** and add:

- `SUPABASE_URL`: the Project URL from Supabase API settings.
- `SUPABASE_SERVICE_ROLE_KEY`: the service-role key from Supabase API settings.

Set both for the **Production** environment. Keep the service-role key private: do not put it in `index.html`, GitHub, or a message. Redeploy the project after saving the variables.

## 3. Approve submitted reviews

In Supabase **Table Editor → reviews**, inspect new rows and change `status` from `pending` to `approved` for reviews you want to publish. The page displays only approved reviews. Leave unapproved rows as `pending` or delete them.

The website asks for the client's display name, a 1–5 star rating, and review text. It does not ask for an email address.
