#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

MAIL_DOMAIN="${MAIL_DOMAIN:-gympulse.space}"
MAIL_HOST="${MAIL_HOST:-mail.${MAIL_DOMAIN}}"
RELAYHOST="${RELAYHOST:-}"

postconf -e "myhostname = ${MAIL_HOST}"
postconf -e "myorigin = ${MAIL_DOMAIN}"
postconf -e "inet_interfaces = loopback-only"
postconf -e "inet_protocols = all"
postconf -e "mydestination = localhost"
postconf -e "mynetworks = 127.0.0.0/8 [::1]/128"
postconf -e "smtp_tls_security_level = may"
postconf -e "smtp_tls_loglevel = 1"
postconf -e "smtp_use_tls = yes"
postconf -e "smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination"
postconf -e "milter_default_action = accept"
postconf -e "milter_protocol = 2"
postconf -e "smtpd_milters = inet:localhost:8891"
postconf -e "non_smtpd_milters = inet:localhost:8891"

if [[ -n "${RELAYHOST}" ]]; then
  postconf -e "relayhost = ${RELAYHOST}"
else
  postconf -X relayhost || true
fi

systemctl enable --now postfix
systemctl restart postfix

echo "Configured Postfix for ${MAIL_DOMAIN} (${MAIL_HOST})"
