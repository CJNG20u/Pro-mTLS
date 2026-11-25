# Pro mTLS Manager

A self-hosted dashboard for running your own private Certificate Authority and managing mTLS client certificates for [Caddy](https://caddyserver.com).

- Create a private root CA
- Issue client certificates and export them as `.p12` bundles (with or without a password)
- Revoke certificates and publish a CRL
- Sync the CA and CRL to a remote Caddy server over SSH and reload it
- Optional password lock for the dashboard

## Run with Docker (recommended)

```bash
git clone https://github.com/CJNG20u/Pro-mTLS.git
cd Pro-mTLS
docker compose up -d --build
```

Open `http://<your-server-ip>:3000`.

### Data

Everything the app creates (CA private key, issued certificates, CRL, settings) is stored in `./pki_storage`, mounted into the container at `/app/pki_storage`.

> ⚠️ `pki_storage/ca` contains your CA **private key**. Anyone with it can issue client certificates your Caddy server will trust. Back it up somewhere safe and never commit it.

### SSH sync to Caddy

The Caddy sync connects to your Caddy server over SSH using either a password or a private key entered in the **Caddy** settings. If you leave the key empty, the app reads `/root/.ssh/id_rsa` inside the container. To use the host's key, uncomment the `id_rsa` line in `docker-compose.yml`.

## Run without Docker

Requires Node.js 22+.

```bash
npm install
npm run build
npm start
```

For development with hot reload: `npm run dev`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Port the web UI listens on |

## License

MIT
