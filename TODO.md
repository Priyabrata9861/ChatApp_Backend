# TODO: Fix OTP Email 500 Error on Render (IPv6 ENETUNREACH)

## Root cause
`connect ENETUNREACH <IPv6>` — Gmail's SMTP resolves to an IPv6 address first.
Render's free tier has NO IPv6 egress, so the connection fails → 500.

Even after adding `--dns-result-order=ipv4first` and `family: 4`, the error
persisted because nodemailer's `service: "gmail"` shortcut still resolved to
IPv6.

## Definitive fix
- [x] Custom `ipv4Lookup` using `dns.lookup(hostname, { family: 4, all: true })`
  in `src/services/mail.service.js`.
- [x] Use explicit `host: "smtp.gmail.com"`, `port: 465`, `secure: true` instead
  of `service: "gmail"` shortcut.
- [x] Attach `lookup: ipv4Lookup` to both Gmail and custom-SMTP transport options.
- [x] Verified `smtp.gmail.com` resolves to IPv4 `192.178.211.108` locally.
- [x] Syntax check passed.

## Remaining
- Commit + push so Render redeploys.
- Retest `/api/auth/test-email` and `/api/auth/send-otp`.
