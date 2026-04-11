#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

MAIL_DOMAIN="${MAIL_DOMAIN:-gympulse.space}"
DKIM_SELECTOR="${DKIM_SELECTOR:-default}"
OPENDKIM_DIR="/etc/opendkim"
KEY_DIR="${OPENDKIM_DIR}/keys/${MAIL_DOMAIN}"
PRIVATE_KEY="${KEY_DIR}/${DKIM_SELECTOR}.private"
PUBLIC_RECORD="${KEY_DIR}/${DKIM_SELECTOR}.txt"

mkdir -p "${KEY_DIR}"

if [[ ! -f "${PRIVATE_KEY}" ]]; then
  opendkim-genkey -D "${KEY_DIR}" -d "${MAIL_DOMAIN}" -s "${DKIM_SELECTOR}"
fi

chown -R opendkim:opendkim "${OPENDKIM_DIR}"
chmod 700 "${KEY_DIR}"
chmod 600 "${PRIVATE_KEY}"

cat > "${OPENDKIM_DIR}/TrustedHosts" <<EOF
127.0.0.1
localhost
${MAIL_DOMAIN}
mail.${MAIL_DOMAIN}
EOF

cat > "${OPENDKIM_DIR}/KeyTable" <<EOF
${DKIM_SELECTOR}._domainkey.${MAIL_DOMAIN} ${MAIL_DOMAIN}:${DKIM_SELECTOR}:${PRIVATE_KEY}
EOF

cat > "${OPENDKIM_DIR}/SigningTable" <<EOF
*@${MAIL_DOMAIN} ${DKIM_SELECTOR}._domainkey.${MAIL_DOMAIN}
EOF

cat > "${OPENDKIM_DIR}/opendkim.conf" <<EOF
Syslog yes
UMask 002
Mode sv
Canonicalization relaxed/simple
SubDomains no
OversignHeaders From
Socket inet:8891@localhost
UserID opendkim:opendkim
PidFile /run/opendkim/opendkim.pid
KeyTable ${OPENDKIM_DIR}/KeyTable
SigningTable refile:${OPENDKIM_DIR}/SigningTable
ExternalIgnoreList refile:${OPENDKIM_DIR}/TrustedHosts
InternalHosts refile:${OPENDKIM_DIR}/TrustedHosts
EOF

systemctl enable --now opendkim
systemctl restart opendkim

echo "OpenDKIM configured for ${MAIL_DOMAIN}"
echo "Publish this DNS record:"
cat "${PUBLIC_RECORD}"
