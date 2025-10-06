# Backend — Face Shape Detection API

Backend TypeScript (Express + Bun) untuk mendeteksi bentuk wajah menggunakan model dari Hugging Face Space, serta mengelola katalog gambar rekomendasi rambut per bentuk wajah. Ringan, cepat, dan siap dipakai untuk development maupun produksi.

## Fitur Utama
- Endpoint prediksi bentuk wajah via unggah file, base64, atau URL gambar.
- Katalog gambar per bentuk wajah (oval, round, square, heart, oblong) dengan PostgreSQL + Drizzle ORM.
- CORS aktif, logging request (morgan), validasi payload (zod).
- Siap Docker (dev dan prod), hot-reload saat development.

## Teknologi
- Runtime: `Bun` + `TypeScript`
- Web: `Express`, `Multer`, `CORS`, `Morgan`
- AI Client: `@gradio/client` (Hugging Face Space: `DimasMP3/hf-classification-faceshape`)
- Gambar: `sharp` (opsional, auto-normalisasi ke JPEG bila perlu)
- Database: `PostgreSQL` (disarankan Neon) + `drizzle-orm` + `drizzle-kit`
- Storage Aset: Cloudflare R2 (menggunakan URL publik bucket)

## Struktur Proyek (ringkas)
```
backends/
├─ src/
│  ├─ server.ts          # entry server
│  ├─ app.ts             # inisialisasi Express, routes
│  ├─ routes/
│  │  ├─ predict-router.ts  # POST /predict
│  │  └─ images-router.ts   # /api/images
│  ├─ services/
│  │  ├─ predict-service.ts  # parsing input & panggil model
│  │  └─ images-service.ts   # compose R2 URL & bulk save
│  ├─ db/
│  │  ├─ client.ts        # koneksi Postgres
│  │  └─ schema.ts        # schema & enum bentuk wajah
│  ├─ classificationmodel/ # wrapper @gradio/client + sharp
│  └─ util/               # env & helper http
├─ drizzle/               # hasil generate migrasi
├─ scripts/               # seeding & debug util
├─ Dockerfile, Dockerfile.dev
└─ package.json, tsconfig.json, drizzle.config.ts, .env.example
```

## Persiapan
1) Instal Bun (v1+)
- macOS/Linux: lihat https://bun.sh
- Windows (Powershell): `powershell -c "irm bun.sh/install.ps1 | iex"`

2) Salin env
- Duplikasi `.env.example` menjadi `.env`, lalu isi sesuai kebutuhan.

Wajib:
- `DATABASE_URL` — DSN Postgres (contoh Neon):
  `postgres://user:password@host/db?sslmode=require`
  Catatan: Backend ini TIDAK menerima URL HTTP API; wajib DSN Postgres. Jika salah, akan error dengan pesan panduan.
- `R2_URL` — URL publik bucket Cloudflare R2, contoh: `https://<public-bucket>.r2.dev`

Opsional (untuk proses upload di luar service ini):
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

3) Instal dependency
```
bun install
```

4) Migrasi database
```
bun run db:migrate
```

5) Jalankan (dev)
```
bun run dev
# Server: http://localhost:5000
```
Uji cepat: `GET /health` → `{ "status": "ok" }`

## API Reference

### Health
- `GET /health`
  - Balik: `{ status: "ok" }`

### Prediksi Bentuk Wajah
- `POST /predict`
  - Menerima salah satu dari:
    - Multipart file: field `image` (max ~15MB)
    - JSON base64: `imageBase64` atau `image` (tanpa header data URI atau dengan, keduanya diterima)
    - JSON URL: `imageUrl` (backend akan fetch gambar tersebut)
  - Respons:
    ```json
    {
      "predictions": [
        {
          "label": "Oval",
          "percentage": 87.12,
          "probabilities": {
            "Heart": 0.01,
            "Oblong": 0.02,
            "Oval": 0.8712,
            "Round": 0.05,
            "Square": 0.0488
          }
        }
      ]
    }
    ```

Contoh cURL (file):
```
curl -X POST http://localhost:5000/predict \
  -F "image=@/path/to/photo.jpg"
```

Contoh cURL (URL):
```
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/photo.jpg"}'
```

Contoh cURL (base64):
```
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."}'
```

Catatan:
- Klien memanggil Hugging Face Space melalui `@gradio/client`. Cold start bisa membuat request pertama sedikit lebih lama.
- `sharp` bersifat opsional. Jika gagal load/convert, backend akan tetap memproses buffer asli.

### Katalog Gambar (Rekomendasi Rambut)

- `GET /api/images?shape=<oval|round|square|heart|oblong>`
  - Balik: `{ shape, items }` dengan `items` berisi baris tabel `images` (url, mime, title, dll)

- `POST /api/images/bulk`
  - Body JSON:
    ```json
    {
      "faceShape": "oval",
      "files": ["Textured Crop.png", "Middle Part.png"],
      "mime": "image/png"
    }
    ```
  - Server akan menyusun URL final berdasarkan `R2_URL`, `faceShape`, dan nama file, mis: `https://<r2>/oval/Middle%20Part.png`
  - Balik: `{ inserted: <number> }`

## Seeding Data Contoh
Script seed akan memanggil endpoint bulk di atas untuk tiap bentuk wajah.

```
# opsional ganti base URL (default http://localhost:5000)
SEED_BASE_URL=http://localhost:5000 bun run seed:all
```

Pastikan `R2_URL` sudah benar agar URL gambar yang disimpan bisa diakses publik.

## Menjalankan dengan Docker

Build (produksi):
```
docker build -t faceshape-backend -f Dockerfile .
```

Jalankan:
```
docker run --rm -p 5000:5000 --env-file .env faceshape-backend
```

Development (hot-reload):
```
docker build -t faceshape-backend-dev -f Dockerfile.dev .
docker run --rm -p 5000:5000 --env-file .env faceshape-backend-dev
```

## Skrip NPM/Bun
- `dev` — jalankan server dengan watch
- `typecheck` — pengecekan TypeScript
- `lint` / `lint:fix` — ESLint
- `db:gen` — generate migrasi dari schema
- `db:migrate` — apply migrasi ke database
- `seed:all` — isi data contoh via endpoint bulk

## Troubleshooting
- Error DATABASE_URL HTTP: Pastikan menggunakan DSN Postgres (bukan endpoint HTTP). Contoh benar: `postgres://...?...sslmode=require`.
- Prediksi lambat di awal: Model pada Hugging Face bisa cold start. Coba ulang setelah beberapa detik.
- `sharp` error di environment lokal: gunakan container (Dockerfile/Dockerfile.dev sudah menyiapkan dependency `libvips`), atau biarkan backend memproses tanpa konversi JPEG.
- CORS: Sudah diaktifkan untuk kredensial; atur domain di layer reverse proxy jika perlu.

## Keamanan
- Jangan commit file `.env` berisi kredensial ke repository publik. Gunakan `.env.example` sebagai referensi.

Selamat membangun! 🎯
