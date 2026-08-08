# TODO: Fix OTP Email 500 Error on Render (IPv6 ENETUNREACH)

## Root cause found
`connect ENETUNREACH 2404:6800:4003:c01::6c:465` — Gmail's SMTP resolves to an
IPv6 address. Render's free tier has NO IPv6 egress, so connection fails with
ENETUNREACH, causing the 500 on `/api/auth/send-otp`.

## Steps
- [x] 1. Create `src/utils/logger.js` with structured `info`/`warn`/`error` helpers.
- [x] 2. Improve `src/services/mail.service.js` to wrap sendMail failures with detailed SMTP/Gmail error info.
- [x] 3. Update `src/services/otp.service.js` to throw clearer errors indicating which env var is missing.
- [x] 4. Update `src/controllers/auth.controller.js` to use logger and log full underlying SMTP error.
- [x] 5. Add `setDefaultResultOrder("ipv4first")` in `src/server.js`.
- [x] 6. Add `family: 4` in nodemailer transport options (`src/services/mail.service.js`).
- [x] 7. Update `package.json` start script to use `node --dns-result-order=ipv4first`.
- [x] 8. Verify syntax of all changed files.

## Next user action
- Commit + push changes, redeploy on Render.
- Retest `/api/auth/test-email` and `/api/auth/send-otp`.
