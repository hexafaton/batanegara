/**
 * FotoLapangan.jsx
 * ----------------
 * Komponen UI dokumentasi foto lapangan dengan:
 *  • Tombol "Buka Kamera" (calls Flutter native camera)
 *  • Preview foto hasil + info GPS & timestamp
 *  • Tombol "Ambil Ulang" & "Hapus"
 * 
 * PENTING: Komponen ini menggunakan Flutter native camera (bukan browser camera)
 * Komunikasi via window.openCamera() dan window.receiveImageFromFlutter()
 */
import { useRef, useEffect, useState } from 'react'

export function FotoLapanganUI({ foto, cameraOpen, capturing, opening, error, onBukaKamera, onAmbilUlang, onHapus }) {

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#9dae27] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-[15px] font-extrabold text-[#0f172a] tracking-tight">Dokumentasi Foto</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Foto lapangan dengan GPS &amp; timestamp otomatis</p>
        </div>
        <span className="ml-auto bg-gray-100 text-gray-500 text-[9px] font-extrabold px-2 py-0.5 rounded-md tracking-wider flex-shrink-0">
          OPSIONAL
        </span>
      </div>

      {/* ── STATE 1: Belum ada foto & kamera tutup ── */}
      {!foto && !cameraOpen && (
        <div className="space-y-3">
          <button
            type="button"
            id="buka-kamera-btn"
            onClick={onBukaKamera}
            disabled={opening}
            className="w-full py-4 border-2 border-dashed border-[#9dae27]/50 rounded-[16px]
                       bg-[#f9fce8] hover:bg-[#f3f9d2] active:scale-[0.98] transition
                       flex flex-col items-center justify-center gap-2.5
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {opening ? (
              <>
                <svg className="w-6 h-6 text-[#9dae27] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-sm font-bold text-[#9dae27]">Membuka kamera...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-[#CFEB49]/50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#4a6010]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#4a6010]">Buka Kamera</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ketuk untuk membuka kamera perangkat</p>
                </div>
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-red-700">Gagal membuka kamera</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
                <button type="button" onClick={onBukaKamera} className="text-xs font-bold text-red-600 underline mt-1">
                  Coba lagi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STATE 2: Kamera pembuka (menunjukkan status) ── */}
      {cameraOpen && !foto && (
        <div className="space-y-3">
          <div className="rounded-[16px] overflow-hidden bg-gray-100 border border-gray-200 shadow-lg p-8">
            <div className="flex flex-col items-center justify-center gap-3">
              {capturing ? (
                <>
                  <svg className="w-12 h-12 text-[#9dae27] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-sm font-bold text-[#9dae27]">Mengambil foto & mendapatkan GPS...</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-[#9dae27]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-center text-sm font-semibold text-gray-700">Kamera terbuka di perangkat</p>
                  <p className="text-center text-xs text-gray-500">Ambil foto menggunakan kamera perangkat, lalu foto akan muncul di sini</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STATE 3: Foto sudah diambil ── */}
      {foto && (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-[16px] overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={foto.dataURL}
              alt="Dokumentasi lapangan"
              className="w-full object-cover"
              style={{ maxHeight: 300 }}
            />
            {foto.lat && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                GPS terverifikasi
              </div>
            )}
            {!foto.lat && (
              <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                GPS tidak tersedia
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="bg-gray-50 rounded-[16px] p-4 space-y-3 border border-gray-100">
            {/* Koordinat */}
            {foto.lat && (
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-dark" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-dark/50">Koordinat GPS</p>
                  <p className="text-sm font-semibold text-dark">
                    {foto.lat.toFixed(6)}, {foto.lng.toFixed(6)}
                    {foto.accuracy && (
                      <span className="text-xs text-gray-400 ml-1">(±{Math.round(foto.accuracy)}m)</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Timestamp */}
            {foto.timestamp && (
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-dark/50">Waktu Pengambilan</p>
                  <p className="text-sm font-semibold text-dark">{foto.timestamp}</p>
                </div>
              </div>
            )}

            {/* Maps link */}
            {foto.mapsUrl && (
              <a
                href={foto.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-blue-600 underline underline-offset-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Lihat di Google Maps
              </a>
            )}
          </div>

          {/* Tombol aksi */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onAmbilUlang}
              className="flex-1 py-2.5 border border-[#9dae27] rounded-xl text-sm font-bold text-[#4a6010]
                         bg-[#f9fce8] hover:bg-[#f3f9d2] transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ambil Ulang
            </button>
            <button
              type="button"
              onClick={onHapus}
              className="px-4 py-2.5 border border-red-200 rounded-xl text-sm font-bold text-red-500
                         bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * FotoLapanganSection — wrapper hook yang menghubungkan ke Flutter native camera
 * Dipakai langsung di FormBeritaAcara
 */
export function FotoLapanganSection() {
  const [foto, setFoto] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState(null)

  // Setup listener untuk menerima gambar dari Flutter
  useEffect(() => {
    const handleFlutterImage = (event) => {
      console.log('Image received from Flutter:', event.detail)
      
      // Buat dataURL dari base64 yang diterima dari Flutter
      const base64Image = event.detail.imageData
      const filename = event.detail.filename || 'foto-lapangan.jpg'
      
      // Format dataURL
      const dataURL = `data:image/jpeg;base64,${base64Image}`
      
      // Parse timestamp dan GPS dari filename atau metadata jika tersedia
      // Format filename dari main.dart: photo.name biasanya adalah "image_picker_xyz.jpg"
      const timestamp = new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      
      setFoto({
        dataURL,
        filename,
        timestamp,
        // GPS data akan ditambahkan kemudian jika diperlukan dari Flutter
        lat: null,
        lng: null,
        accuracy: null,
        mapsUrl: null
      })
      
      setCameraOpen(false)
      setCapturing(false)
      setError(null)
    }

    // Dengarkan event flutterImage dari window
    window.addEventListener('flutterImage', handleFlutterImage)
    
    return () => {
      window.removeEventListener('flutterImage', handleFlutterImage)
    }
  }, [])

  // Buka kamera Flutter
  const handleBukaKamera = async () => {
    setOpening(true)
    setError(null)
    setCapturing(true)
    
    try {
      // Panggil fungsi openCamera yang di-inject Flutter
      if (typeof window.openCamera === 'function') {
        const result = window.openCamera()
        console.log('Camera call result:', result)
        setCameraOpen(true)
      } else {
        throw new Error('window.openCamera tidak tersedia. Pastikan Flutter sudah menginject JavaScript.')
      }
    } catch (err) {
      console.error('Error opening camera:', err)
      setError(err.message)
      setCameraOpen(false)
      setCapturing(false)
    } finally {
      setOpening(false)
    }
  }

  // Ambil ulang foto
  const handleAmbilUlang = () => {
    setFoto(null)
    handleBukaKamera()
  }

  // Hapus foto
  const handleHapus = () => {
    setFoto(null)
    setCameraOpen(false)
    setCapturing(false)
    setError(null)
  }

  return (
    <FotoLapanganUI
      foto={foto}
      cameraOpen={cameraOpen}
      capturing={capturing}
      opening={opening}
      error={error}
      onBukaKamera={handleBukaKamera}
      onAmbilUlang={handleAmbilUlang}
      onHapus={handleHapus}
    />
  )
}
