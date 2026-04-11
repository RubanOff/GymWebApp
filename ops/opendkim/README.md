# OpenDKIM Notes

Use [`scripts/configure-opendkim.sh`](../../scripts/configure-opendkim.sh) on the VPS to:

- generate a DKIM key if one does not exist
- write `TrustedHosts`, `KeyTable`, `SigningTable`, and `opendkim.conf`
- start and enable the `opendkim` service

Optional environment variables:

```bash
MAIL_DOMAIN=gympulse.space
DKIM_SELECTOR=default
```

After the script runs, publish the TXT record printed from:

```bash
/etc/opendkim/keys/gympulse.space/default.txt
```
