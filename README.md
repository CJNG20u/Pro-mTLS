# Pro mTLS Manager

**A self-hosted private Certificate Authority and mTLS client-certificate dashboard for [Caddy](https://caddyserver.com).**

Lock your self-hosted services so that only devices holding a certificate you issued can connect. Pro mTLS Manager runs your own root CA, issues per-device client certificates as ready-to-install `.p12` bundles, maintains a Certificate Revocation List (CRL), and pushes the CA and CRL to your Caddy server over SSH, so revoking a lost phone takes one click.

## Features

- **Private root CA**: create an RSA 2048/4096 root CA with your own name, organization and validity.
- **Client certificates**: issue per-device certs and download them as `.p12` (password-protected or passwordless), `.crt` or `.key`.
- **Per-hostname access**: limit each cert to specific hostnames (for example `photos.example.com` or `*.example.com`). Caddy enforces this with a matcher.
- **Revocation and CRL**: revoke a cert with a reason, and the CRL (`crl.pem`) is regenerated straight away.
- **Caddy sync over SSH**: upload `ca.crt` and `crl.pem` to your Caddy server and reload it, by hand or automatically on every revoke. Password or key auth, with encrypted key passphrase support.
- **Expiry tracking**: see active, expiring-soon, expired and revoked certs at a glance.
- **Device setup guides**: install steps for Android, iOS, Windows, macOS and Linux.
- **Optional dashboard password**.

## How it works

```
 ┌──────────────────────┐   SSH: ca.crt + crl.pem   ┌───────────────────────────┐
 │  Pro mTLS Manager    │ ────────────────────────▶ │  Caddy (VPS / reverse     │
 │  (Docker, homelab)   │      + caddy reload       │  proxy) with revocation   │
 │  root CA · certs·CRL │                           │  plugin                   │
 └──────────────────────┘                           └─────────────┬─────────────┘
            │ .p12                                                │ mTLS
            ▼                                                     ▼
     your phone / laptop ───────── presents client cert ───▶  your services
```

---

## 1. Install Pro mTLS Manager

### Docker (recommended)

Requirements: Docker with the Compose plugin. Any Linux host works, including a Proxmox LXC with Docker installed.

```bash
git clone https://github.com/CJNG20u/Pro-mTLS.git
cd Pro-mTLS
docker compose up -d --build
```

Open `http://<server-ip>:3000`.

To update later:

```bash
cd Pro-mTLS
git pull
docker compose up -d --build
```

### Without Docker

Requirements: Node.js 22+ and the `openssl` command-line tool.

```bash
git clone https://github.com/CJNG20u/Pro-mTLS.git
cd Pro-mTLS
npm install
npm run build
npm start
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Port the web UI listens on |

### Your data: back it up

Everything the app creates (the CA **private key**, issued certificates, the CRL and settings) is stored in `./pki_storage`, which is mounted into the container at `/app/pki_storage`.

> ⚠️ Anyone with `pki_storage/ca` can issue certificates your Caddy server will trust. Keep it private, back it up off the host, and **never commit it to Git**. `.gitignore` already excludes it.

**Moving an existing install:** stop the app and copy the old `pki_storage` folder into the new `Pro-mTLS/` folder. Your CA and all your certificates carry over unchanged.

---

## 2. First run

1. **Initialize Root CA**: choose a name, organization, key size (4096 recommended) and validity.
2. **Settings → Dashboard password**: optional, but recommended if the UI is reachable by others.
3. **Server Sync**: enter your Caddy server's host, SSH user, and either a password or a private key. Click **Test SSH Connection**, then **Save Configuration**.
4. **Issue Certificate** for each device, then download the `.p12` and install it on the device (see **Device Setup Guides** in the app footer).

---

## 3. Set up Caddy

Stock Caddy can verify client certificates against your CA, but it **cannot check a CRL**, so revoked certificates would still be accepted. To make revocation work, build Caddy with the **[caddy-revocation-validator](https://github.com/Gr33nbl00d/caddy-revocation-validator)** plugin using `xcaddy`.

The plugin needs Caddy 2.8.4 or newer.

### 3.1 Build Caddy with the revocation plugin

On the Caddy server (Debian/Ubuntu shown; Go 1.22+ is required):

```bash
# Install Go if you don't have it
sudo apt update && sudo apt install -y golang-go
go version            # needs 1.22+; if older, install Go from https://go.dev/dl/

# Install xcaddy
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
export PATH=$PATH:$(go env GOPATH)/bin

# Build Caddy with the plugin (the module path is lowercase)
xcaddy build --with github.com/gr33nbl00d/caddy-revocation-validator
```

This creates a `./caddy` binary in the current folder.

### 3.2 Replace the packaged Caddy binary

If Caddy was installed from the official apt repo, use the method recommended in the Caddy docs so package updates don't overwrite your build:

```bash
sudo dpkg-divert --divert /usr/bin/caddy.default --rename /usr/bin/caddy
sudo mv ./caddy /usr/bin/caddy.custom
sudo update-alternatives --install /usr/bin/caddy caddy /usr/bin/caddy.default 10
sudo update-alternatives --install /usr/bin/caddy caddy /usr/bin/caddy.custom 50
sudo systemctl restart caddy
```

Check that the plugin is loaded:

```bash
caddy list-modules | grep revocation
# tls.client_auth.verifier.revocation
```

> 💡 No Go on the server? Build on any Linux machine with the same CPU architecture and copy the binary over. If the plugin is listed on <https://caddyserver.com/download>, you can also download a ready-made build there.

### 3.3 Prepare the certs folder

```bash
sudo mkdir -p /etc/caddy/certs /var/lib/caddy/crl-work
sudo chown -R caddy:caddy /var/lib/caddy/crl-work
```

The SSH user you configured in Pro mTLS Manager must be able to write to `/etc/caddy/certs` and run the reload command (default `sudo systemctl reload caddy`). The `caddy` user must be able to **read** `ca.crt` and `crl.pem`.

Then click **Sync to Caddy Now** in the app. `ca.crt` and `crl.pem` should appear in `/etc/caddy/certs`.

### 3.4 Caddyfile

Add a `client_auth` block to each site you want to protect. The **Server Sync** page in the app generates this block with your paths filled in; use **Copy Caddyfile**.

```caddyfile
app.example.com {
    tls {
        client_auth {
            mode require_and_verify
            trusted_ca_cert_file /etc/caddy/certs/ca.crt

            # CRL checking (caddy-revocation-validator plugin)
            verifier revocation {
                mode crl_only
                crl_config {
                    work_dir /var/lib/caddy/crl-work
                    storage_type memory
                    signature_validation_mode verify
                    trusted_signature_cert_file /etc/caddy/certs/ca.crt
                    crl_file /etc/caddy/certs/crl.pem
                }
            }
        }
    }

    # Optional: only allow certs issued for this hostname (or a matching wildcard)
    @forbidden not expression `{http.request.tls.client.subject}.contains("OU=host:*.example.com") || {http.request.tls.client.subject}.contains("OU=host:" + {http.request.host})`
    respond @forbidden "403 Forbidden: Certificate not authorized for this hostname" 403

    reverse_proxy localhost:8080
}
```

Then reload Caddy:

```bash
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The plugin loads `crl_file` when Caddy starts or reloads. Pro mTLS Manager reloads Caddy after every sync, so revocations take effect right away.

> ⚠️ **Behind Cloudflare?** If a hostname is proxied through Cloudflare (orange cloud or a Cloudflare Tunnel), Cloudflare ends the TLS connection and Caddy never sees the client certificate. Caddy's mTLS only works when clients connect to Caddy directly: a DNS-only (grey cloud) record, or LAN/VPN access. For proxied hostnames, use Cloudflare's own mTLS feature instead.

---

## 4. Test it

```bash
# Without a certificate: should be rejected
curl -v https://app.example.com

# With a certificate: should work
openssl pkcs12 -in device.p12 -out device.pem -nodes   # enter the .p12 password if set
curl -v --cert device.pem https://app.example.com
```

Then revoke that certificate in the app, wait for the auto-sync to finish, and run the second command again. It should now be rejected. On phones, fully close the browser before retesting, because it may reuse the existing connection.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `spawn openssl ENOENT` | The `openssl` CLI is missing. It's included in the Docker image; for bare installs, run `apt install openssl`. |
| Revoked cert still works | Caddy isn't checking the CRL. Confirm `caddy list-modules \| grep revocation` shows the module, that the `verifier revocation` block is in your Caddyfile, and that Caddy was reloaded after the sync. |
| Valid cert is rejected | Check that the hostname isn't proxied through Cloudflare, that the cert's allowed hosts include the hostname, and that the cert isn't expired. |
| Sync fails on reload | The SSH user needs permission to run the reload command, for example passwordless `sudo` for `systemctl reload caddy`. |
| SSH key fallback | If no key is entered in the app, it reads `/root/.ssh/id_rsa` inside the container. Uncomment the key mount in `docker-compose.yml` to use the host's key. |

## Development

```bash
npm install
npm run dev     # Express API + Vite dev server with hot reload on :3000
```

Stack: React 19, Vite, Tailwind CSS 4, Express, node-forge, ssh2.

## License

[MIT](LICENSE)
