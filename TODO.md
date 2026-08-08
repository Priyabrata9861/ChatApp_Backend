# TODO: Fix OTP Email 500 Error & Improve Email Diagnostics

## Steps
- [x] 1. Create `src/utils/logger.js` with structured `info`/`warn`/`error` helpers.
- [x] 2. Improve `src/services/mail.service.js` to wrap sendMail failures with detailed SMTP/Gmail error info.
- [x] 3. Update `src/services/otp.service.js` to throw clearer errors indicating which env var is missing.
- [x] 4. Update `src/controllers/auth.controller.js` to use logger and log full underlying SMTP error.
- [x] 5. Verify build/lint for changed files (node --check passed for all 4 files).
