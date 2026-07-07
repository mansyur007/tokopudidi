'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  listChatTemplates, createChatTemplate, updateChatTemplate, deleteChatTemplate,
  type ChatTemplateRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

const MAX_TEMPLATES = 20;

export function ChatTemplateManager() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<ChatTemplateRow[]>([]);
  const [label, setLabel] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try { setItems(await listChatTemplates(tokens.accessToken)); } catch { /* noop */ }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  function startEdit(t: ChatTemplateRow) {
    setEditingId(t.id);
    setLabel(t.label);
    setBody(t.body);
    setMsg(null);
  }

  function resetForm() {
    setEditingId(null);
    setLabel('');
    setBody('');
  }

  async function handleSave() {
    if (!tokens?.accessToken) return;
    if (label.trim().length < 2 || body.trim().length < 2) {
      setMsg('Label & isi template minimal 2 karakter');
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (editingId) {
        await updateChatTemplate(tokens.accessToken, editingId, { label: label.trim(), body: body.trim() });
      } else {
        await createChatTemplate(tokens.accessToken, { label: label.trim(), body: body.trim() });
      }
      resetForm();
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menyimpan template');
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!tokens?.accessToken) return;
    if (!confirm('Hapus template ini?')) return;
    setBusy(true); setMsg(null);
    try {
      await deleteChatTemplate(tokens.accessToken, id);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus');
    } finally { setBusy(false); }
  }

  // Reorder: tukar nilai `order` dengan tetangga.
  async function handleMove(index: number, dir: -1 | 1) {
    if (!tokens?.accessToken) return;
    const target = items[index];
    const swap = items[index + dir];
    if (!target || !swap) return;
    setBusy(true); setMsg(null);
    try {
      await Promise.all([
        updateChatTemplate(tokens.accessToken, target.id, { order: index + dir }),
        updateChatTemplate(tokens.accessToken, swap.id, { order: index }),
      ]);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengubah urutan');
    } finally { setBusy(false); }
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Template Chat</h2>
        <span className="text-xs text-gray-500">{items.length}/{MAX_TEMPLATES}</span>
      </div>
      <p className="text-xs text-gray-500">
        Balas chat pembeli sekali klik — template muncul di tombol 📋 composer chat.
      </p>

      {items.length > 0 && (
        <ul className="divide-y border rounded-lg">
          {items.map((t, i) => (
            <li key={t.id} className="px-3 py-2 flex items-start gap-2">
              <div className="flex flex-col gap-0.5 pt-0.5">
                <button
                  onClick={() => handleMove(i, -1)}
                  disabled={busy || i === 0}
                  aria-label="Naikkan urutan"
                  className="text-[10px] leading-none text-gray-400 hover:text-primary disabled:opacity-30"
                >▲</button>
                <button
                  onClick={() => handleMove(i, 1)}
                  disabled={busy || i === items.length - 1}
                  aria-label="Turunkan urutan"
                  className="text-[10px] leading-none text-gray-400 hover:text-primary disabled:opacity-30"
                >▼</button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
              </div>
              <button onClick={() => startEdit(t)} className="text-xs text-primary shrink-0">Edit</button>
              <button onClick={() => handleDelete(t.id)} className="text-xs text-red-600 shrink-0">Hapus</button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t pt-3">
        <p className="text-sm font-medium">{editingId ? 'Edit template' : 'Tambah template baru'}</p>
        <input
          className="input w-full"
          placeholder="Label (mis. Ucapan terima kasih)"
          maxLength={40}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <textarea
          className="input w-full min-h-[70px]"
          placeholder="Isi pesan template..."
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {msg && <p className="text-xs text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={busy || (!editingId && items.length >= MAX_TEMPLATES)}
            className="btn-primary"
          >
            {editingId ? 'Simpan Perubahan' : '+ Tambah Template'}
          </button>
          {editingId && (
            <button onClick={resetForm} disabled={busy} className="btn-outline">Batal</button>
          )}
        </div>
        {!editingId && items.length >= MAX_TEMPLATES && (
          <p className="text-xs text-orange-600">Sudah mencapai batas {MAX_TEMPLATES} template.</p>
        )}
      </div>
    </section>
  );
}
