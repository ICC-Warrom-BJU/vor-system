// Validasi environment variable wajib saat startup (fail-fast).
// Jika ada yang kosong, server sengaja gagal start alih-alih memakai nilai
// default yang tidak aman (mis. JWT_SECRET fallback yang bisa ditebak).

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `FATAL: environment variable "${name}" wajib di-set dan tidak boleh kosong. ` +
        `Set di file .env (lokal) atau Variables (Railway) sebelum menjalankan server.`,
    )
  }
  return value
}

export const JWT_SECRET = requireEnv('JWT_SECRET')
