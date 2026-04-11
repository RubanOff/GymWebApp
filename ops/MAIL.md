# Mail Setup

The application sends email through local SMTP on the VPS. The app itself does not sign DKIM; Postfix and OpenDKIM handle outbound delivery.

## Required DNS

For `gympulse.space`, publish:

- `A` record pointing to the VPS IP
- reverse DNS / PTR for the VPS IP back to the mail host
- SPF
- DKIM
- DMARC

Example records:

```text
gympulse.space.              IN A      YOUR_SERVER_IP
mail.gympulse.space.         IN A      YOUR_SERVER_IP
gympulse.space.              IN MX 10  mail.gympulse.space.
gympulse.space.              IN TXT    "v=spf1 mx a ip4:YOUR_SERVER_IP -all"
default._domainkey.gympulse.space. IN TXT "v=DKIM1; k=rsa; p=REPLACE_WITH_PUBLIC_KEY"
_dmarc.gympulse.space.       IN TXT    "v=DMARC1; p=quarantine; adkim=s; aspf=s; rua=mailto:postmaster@gympulse.space"
```

## Postfix

Minimal direction:

- bind to localhost for submission from the app
- use `myhostname = mail.gympulse.space`
- use `myorigin = gympulse.space`
- set TLS certificates for SMTP if you expose mail publicly
- relay outbound mail directly or through your provider if port 25 is blocked

The application expects:

```bash
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_FROM=noreply@gympulse.space
```

You can apply the baseline server-side Postfix settings with:

```bash
MAIL_DOMAIN=gympulse.space MAIL_HOST=mail.gympulse.space ./scripts/configure-postfix.sh
```

For relay fallback:

```bash
MAIL_DOMAIN=gympulse.space MAIL_HOST=mail.gympulse.space RELAYHOST=[smtp.relay.example]:587 ./scripts/configure-postfix.sh
```

## OpenDKIM

Typical steps:

1. Generate a DKIM keypair for selector `default`
2. Configure OpenDKIM to sign `gympulse.space`
3. Publish the public key in DNS
4. Wire Postfix to OpenDKIM via milter

The repo provides an automation script:

```bash
MAIL_DOMAIN=gympulse.space DKIM_SELECTOR=default ./scripts/configure-opendkim.sh
```

## Delivery checks

After setup, verify:

- mail leaves the VPS successfully
- messages pass SPF
- messages pass DKIM
- messages align with DMARC
- links in verify/magic/reset emails use `APP_URL=https://gympulse.space`
- `npm run mail:test -- --to you@example.com` succeeds

## Practical note

Many VPS providers throttle or block direct SMTP on port 25. If that happens, keep the app mail flow unchanged and configure Postfix to relay through a trusted upstream SMTP server.
