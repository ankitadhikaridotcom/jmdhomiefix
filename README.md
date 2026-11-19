# HomeFix

## Application and provider onboarding

New signups are customer accounts. After signing in, a customer can open **Become a Service Provider** from the profile menu, profile page, or footer and save a six-step application as a draft. Submitting moves the application to `pending`; only an administrator can approve or reject it. Rejections include a reason and can be edited and resubmitted.

Provider approval is stored in `User.providerStatus` without changing the account's customer role. Existing customer booking routes remain available to approved providers. Provider dashboard and provider API access require an approved status; customer-facing service searches and bookings only include active services from approved providers.

Provider applications are stored in the `ProviderApplication` collection. Government ID and optional work-proof files are stored under `backend/private_uploads/` and are served only to the applicant and administrators. Keep this directory on private, persistent storage in production; do not expose it through a static file server.

Service categories are persisted in MongoDB. The first category request initializes the required HomeFix categories and migrates known legacy category names. Administrators can add, rename, hide, or reactivate categories from **Admin → Services**.

## Configuration

No new environment variables are required. The backend uses `MONGO_URI`, `JWT_SECRET`, `PORT`, and `CLIENT_URL` as documented in `backend/.env.example`. The frontend optionally accepts `VITE_API_URL`; when omitted it uses `http://localhost:5000`.