# ABRM Management

ABRM Management is a lightweight PHP 8.2+ operations manager designed for LAMP stacks with S3-compatible storage.

## Setup

1. Run `composer install` to download dependencies (AWS SDK for PHP, Dompdf, PhpSpreadsheet, Minishlink Web Push).
2. Create a MySQL database and run the schema in `schema.sql` (or from README instructions).
3. Copy `config.php.example` to `config.php` and fill in database and S3-compatible storage credentials.
4. Run `php seed.php` once to seed the admin user (`admin@example.com` / `admin123`) and sample data.
5. Point your web server's document root to this project directory.
6. Ensure the `/vendor` directory is web-accessible (if your deployment keeps it outside the web root, update autoload include paths accordingly).

## Self-hosted Object Storage

The application assumes you run your own S3-compatible object storage (no third-party cloud required). The example configuration in `config.php.example` targets a MinIO instance, but any software that speaks the S3 API will work.

### Example: MinIO on the same VPS

1. **Install MinIO**
   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   sudo mv minio /usr/local/bin/
   ```

2. **Create directories** for data and configuration:
   ```bash
   sudo mkdir -p /srv/minio/data
   sudo chown -R $USER:$USER /srv/minio
   ```

3. **Start MinIO** (replace credentials with strong values):
   ```bash
   MINIO_ROOT_USER=abrm MINIO_ROOT_PASSWORD='change-me-strong' \
     minio server /srv/minio/data --console-address ":9090" --address ":9000"
   ```
   Run it as a systemd service for production. A minimal unit file:
   ```ini
   [Unit]
   Description=MinIO Storage Server
   After=network.target

   [Service]
   User=minio
   Group=minio
   Environment="MINIO_ROOT_USER=abrm"
   Environment="MINIO_ROOT_PASSWORD=change-me-strong"
   ExecStart=/usr/local/bin/minio server /srv/minio/data --console-address :9090 --address :9000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. **Create a bucket** named `abrm` via the MinIO console (`http://your-vps:9090`) or the `mc` CLI:
   ```bash
   mc alias set local http://127.0.0.1:9000 abrm change-me-strong
   mc mb local/abrm
   ```

5. **Generate access keys** dedicated to the web app. Inside the MinIO console, add a new user with `consoleAdmin` access or a custom policy that grants read/write to the `abrm` bucket. Record the Access Key and Secret Key.

6. **Expose HTTPS**: terminate TLS in front of MinIO so uploads land on a trusted host. Our production deployment uses `storage.movana.me` behind Caddy with an automatic Let's Encrypt certificate:
   ```caddyfile
   storage.movana.me {
     reverse_proxy 127.0.0.1:9000
     encode gzip
   }
   ```
   Any reverse proxy (Nginx, Traefik, Apache) that forwards HTTPS traffic to port `9000` works the same way.

7. **Update `config.php`** with your MinIO endpoint and credentials:
   ```php
   define('S3_ENDPOINT', 'https://storage.movana.me');
   define('S3_KEY', 'APP_ACCESS_KEY');
   define('S3_SECRET', 'APP_SECRET_KEY');
   define('S3_BUCKET', 'abrm');
   define('S3_REGION', 'us-east-1'); // MinIO accepts any region string
   define('S3_USE_PATH_STYLE', true); // required for MinIO unless using subdomain routing
   ```
   Set `S3_URL_BASE` if you serve public files through a CDN or a different host than the API endpoint.

8. **Verify connectivity** by running `php seed.php` (which uploads sample photos if available) or uploading a photo through the UI.

For alternative storage backends (Ceph, OpenIO, etc.), adjust the endpoint and path-style option as required by your platform.

## Development Notes

- No PHP framework is used; the app relies on simple includes and helper functions.
- CSRF tokens protect all forms and upload/delete actions.
- File uploads go directly to the configured S3-compatible endpoint.
- Exports make use of Dompdf and standard CSV output.

## Toast notifications

Real-time push delivery has been removed in favor of lightweight in-app toasts. The helpers expose two entry points:

- `queue_toast('Message', 'success')` records a toast that will render on the next page load.
- `notify_users([$userId], $type, $title, $body)` now simply emits a toast if the targeted user is the one performing the action. This keeps the API surface identical while avoiding background workers, service workers, or extra tables.

Because the UI no longer depends on push subscriptions you can delete any `user_notifications` / `user_push_tokens` tables from prior installs. Every page already includes the toast stack; the JavaScript bootstrap flushes `$_SESSION['toasts']` so feedback is instant without intrusive popovers.

