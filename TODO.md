# TODO: Reliable Production OTP Email on Render (Brevo HTTP API)

## Goal
Make OTP email delivery work reliably from the Render production backend.

## Root cause found
Raw SMTP (smtp-relay.brevo.com:587) does NOT work from Render's free tier:
- Error: `ETIMEDOUT`, `command: "CONN"` — the TCP connection never establishes.
- Render's free tier **blocks outbound SMTP ports (25/465/587)**. IPv4 lookup
  and DNS-order changes did not help because this is a network egress block.
- HTTPS (port 443) is always allowed, and the app already uses it.

## Definitive fix
Switch from Nodemailer/SMTP to **Brevo's transactional email HTTP API**
(`https://api.brevo.com/v3/smtp/email`) over HTTPS/443.

## Changes made
- [x] `src/services/mail.service.js` — rewritten to use Brevo HTTP API via
      global `fetch` (Node 18+). Sender `EMAIL` + `BREVO_API_KEY`. Keeps
      `sendOTP(email, otp)` and `sendTestEmail(email)` signatures. Config
      validation + safe logging (never logs the API key).
- [x] `src/services/otp.service.js` — gate now checks `EMAIL` + `BREVO_API_KEY`.
- [x] `src/server.js` — `import "dotenv/config"` at top, listens on `0.0.0.0`,
      `process.env.PORT || 5000`.
- [x] CORS config unchanged (already allows Vercel origins).
- [x] Frontend axios unchanged (already uses VITE_API_URL + idempotent retry).

## Render environment variables (new)
- NODE_ENV=production
- MONGODB_URI=<your Atlas connection string>
- JWT_SECRET=<your JWT secret>
- EMAIL=<your verified Brevo sender email>
- BREVO_API_KEY=<your Brevo API key (v3)>
- CORS_ORIGINS=https://<your-frontend>.vercel.app

## To test
1. Git commit + push → Render redeploys.
2. Confirm log: `Email configuration loaded. EMAIL configured: true. BREVO_API_KEY configured: true.`
3. POST /api/auth/test-email → expect `{"success":true,"message":"Test email sent","messageId":"..."}`.
4. POST /api/auth/send-otp → expect `{"success":true,"message":"OTP Sent"}`.
5. Full OTP flow via Vercel frontend.
