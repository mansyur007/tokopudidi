'use client';

import { formatTanggal } from '@tokopudidi/shared';

interface Props {
  data: { date: string; count: number }[];
  label: string;
}

/**
 * Chart batang harian sederhana (M11-B4).
 *
 * Sengaja tanpa library chart: isinya cuma 7–30 batang dari satu deret angka,
 * sementara recharts/chart.js menambah ~100 KB gzipped ke bundle panel seller
 * yang halamannya kini ~115 KB. Kalau nanti butuh sumbu ganda, zoom, atau
 * beberapa seri sekaligus, barulah pindah ke library.
 */
/**
 * `new Date('2026-07-29')` diparse sebagai tengah malam UTC, sehingga di zona
 * waktu barat UTC labelnya mundur sehari. Tambahkan komponen jam supaya diparse
 * sebagai waktu lokal — kunci hari dari API memang sudah tanggal lokal.
 */
const labelTanggal = (key: string) => formatTanggal(`${key}T00:00:00`);

export function DailyBarChart({ data, label }: Props) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Belum ada {label.toLowerCase()} pada rentang ini.
      </p>
    );
  }

  return (
    <figure className="space-y-2">
      <figcaption className="sr-only">{label} per hari</figcaption>
      <div className="flex items-end gap-[2px] h-40" role="img" aria-label={`${label} per hari, tertinggi ${max}`}>
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 min-w-0 flex flex-col justify-end h-full"
            title={`${labelTanggal(d.date)} — ${d.count} ${label.toLowerCase()}`}
          >
            <div
              className="bg-primary rounded-t transition-all"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      {/* Label tanggal cuma ujung & tengah — 30 tanggal berjejer tidak terbaca. */}
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{labelTanggal(data[0].date)}</span>
        {data.length > 2 && <span>{labelTanggal(data[Math.floor(data.length / 2)].date)}</span>}
        <span>{labelTanggal(data[data.length - 1].date)}</span>
      </div>

      {/* Tabel setara untuk pembaca layar — batang CSS tidak terbaca screen reader. */}
      <table className="sr-only">
        <caption>{label} per hari</caption>
        <thead>
          <tr><th scope="col">Tanggal</th><th scope="col">{label}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}><td>{labelTanggal(d.date)}</td><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
