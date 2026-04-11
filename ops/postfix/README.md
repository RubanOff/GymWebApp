# Postfix Notes

Use [`scripts/configure-postfix.sh`](../../scripts/configure-postfix.sh) on the VPS to set the minimum Postfix values expected by the application.

Optional environment variables:

```bash
MAIL_DOMAIN=gympulse.space
MAIL_HOST=mail.gympulse.space
RELAYHOST=[smtp.relay.example]:587
```

If `RELAYHOST` is omitted, Postfix sends mail directly.
If `RELAYHOST` is set, Postfix relays outbound mail through the upstream SMTP server while the application still talks to `127.0.0.1:25`.
