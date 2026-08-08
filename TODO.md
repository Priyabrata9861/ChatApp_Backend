# TODO: Replace Gmail SMTP with Brevo SMTP for Reliable Production OTP Email

## Goal
Make OTP email delivery work reliably from the Render production backend by
replacing Gmail SMTP with Brevo SMTP (generic Nodemailer SMTP transport).

## Steps
- [x] Analyze existing mail.service.js, server.js, otp.service.js, cors.js,
      auth.controller.js, axios.js, package.json
- [x] Rewrite `src/services/mail.service.js` to a generic Nodemailer SMTP
      transport reading SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS, sender EMAIL,
      add config validation, and improve error logging (never log secrets).
- [x] Update `src/server.js` to `import "dotenv/config";` at top, listen on
      `0.0.0.0`, and use `process.env.PORT || 5000`.
- [x] Confirm `src/services/otp.service.js` uses SMTP vars instead of
      `APP_PASSWORD`.
- [x] Confirm CORS config already allows Vercel origins (no change).
- [x] Confirm frontend Axios already uses VITE_API_URL + idempotent retry (no
      code change).
- [x] Syntax-check all modified backend files.
- [x] Provide Render env vars, Brevo setup, deployment/testing steps, and
      security rotation instructions.
