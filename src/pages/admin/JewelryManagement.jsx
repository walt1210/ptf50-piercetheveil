import { useEffect, useState } from 'react';
import { Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import {
  createJewelry,
  listJewelry,
  listPiercingTypes,
  setCompatibility,
  setJewelryActive,
  updateJewelry,
  uploadJewelryImage,
} from '../../features/jewelry/jewelryService';
import { fetchEmbeddings, isIndexFresh, reindexStale, syncJewelryEmbedding } from '../../features/recommendations/embeddingStore';
import { toUserMessage } from '../../services/api';

const peso = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // keep free storage healthy

const EMPTY = { name: '', description: '', material: '', style: '', color: '', price: '', stock: '0', is_active: true };
const input = 'w-full bg-transparent border-b border-brand-blood/50 pb-2 text-brand-cream focus:outline-none focus:border-brand-cream transition-colors font-light';
const label = 'block text-xs text-brand-muted uppercase tracking-widest mb-2';

export default function JewelryManagement() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, item = edit
  const [embeds, setEmbeds] = useState(new Map());
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listJewelry(), listPiercingTypes(), fetchEmbeddings().catch(() => new Map())])
      .then(([j, t, e]) => {
        if (cancelled) return;
        setItems(j);
        setTypes(t);
        setEmbeds(e);
        setError('');
      })
      .catch((e) => !cancelled && setError(toUserMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  const indexed = items.filter((i) => isIndexFresh(i, embeds.get(i.id))).length;

  const rebuildIndex = async () => {
    setIndexing(true);
    setError('');
    setNotice('');
    try {
      await reindexStale(items, embeds, (s) => {
        if (s.phase === 'model') setIndexMsg(`Downloading AI model… ${s.percent}%`);
        else if (s.phase === 'indexing') setIndexMsg(`Indexing ${s.done + 1} of ${s.total}…`);
      });
      setIndexMsg('');
      reload();
    } catch (e) {
      setIndexMsg('');
      setError(`Could not build the AI index: ${toUserMessage(e)}`);
    } finally {
      setIndexing(false);
    }
  };

  const toggleActive = async (item) => {
    setError('');
    try {
      await setJewelryActive(item.id, !item.is_active);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    }
  };

  const shown = items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Jewelry Collection</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Manage inventory and AI-recommendation attributes.</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pieces…"
            className="bg-transparent border-b border-brand-blood/50 pb-1 text-sm text-brand-cream focus:outline-none focus:border-brand-cream w-40"
          />
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 border border-brand-cream text-brand-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all"
          >
            <Plus size={14} /> Add Piece
          </button>
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-red-400 font-light">{error}</p>}
      {notice && <p role="status" className="text-sm text-brand-gold font-light">{notice}</p>}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-brand-muted">
          <span className="uppercase tracking-widest">AI index: {indexed} of {items.length} pieces ready</span>
          {(indexing || indexed < items.length) && (
            <button
              onClick={rebuildIndex}
              disabled={indexing}
              className="uppercase tracking-widest border border-brand-blood/50 text-brand-cream px-3 py-1 hover:bg-brand-blood/10 disabled:opacity-50"
            >
              {indexing ? 'Working…' : 'Update AI index'}
            </button>
          )}
          {indexMsg && <span>{indexMsg}</span>}
        </div>
      )}
      {loading && <p className="text-brand-muted text-sm">Loading…</p>}
      {!loading && shown.length === 0 && <p className="text-brand-muted text-sm">No pieces found.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((item) => (
          <div
            key={item.id}
            className={`bg-brand-dark border border-brand-blood/20 p-6 group hover:border-brand-blood/50 transition-all ${item.is_active ? '' : 'opacity-60'}`}
          >
            <div className="h-40 bg-brand-black border border-brand-blood/10 mb-4 flex items-center justify-center overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="text-brand-muted text-xs uppercase tracking-widest">No image</span>
              )}
            </div>
            <div className="flex justify-between items-start mb-2 gap-3">
              <h3 className="text-brand-cream font-serif text-lg">{item.name}</h3>
              <span className="text-brand-gold text-sm tracking-widest whitespace-nowrap">{peso(item.price)}</span>
            </div>
            <p className="text-brand-muted text-xs uppercase tracking-widest mb-1">
              {[item.style, item.material, item.color].filter(Boolean).join(' · ') || 'No attributes'}
            </p>
            {!item.is_active && <p className="text-xs uppercase tracking-widest text-brand-blood mb-1">Hidden from customers</p>}
            <p className="text-brand-muted text-xs mb-5">
              Fits: {item.jewelry_compatibility?.filter((c) => c.approved).length ?? 0} placements
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-brand-blood/20">
              <span className={`text-xs uppercase tracking-widest ${item.stock > 0 ? 'text-[#4ade80]' : 'text-brand-blood'}`}>
                {item.stock > 0 ? `${item.stock} In Stock` : 'Out of Stock'}
              </span>
              <div className="flex gap-3">
                <button title="Edit" onClick={() => setEditing(item)} className="text-brand-muted hover:text-brand-cream transition-colors">
                  <Edit2 size={14} />
                </button>
                <button
                  title={item.is_active ? 'Hide from customers' : 'Show to customers'}
                  onClick={() => toggleActive(item)}
                  className="text-brand-muted hover:text-brand-cream transition-colors"
                >
                  {item.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <JewelryForm
          item={editing.id ? editing : null}
          types={types}
          onClose={() => setEditing(null)}
          onSaved={(warning) => {
            setEditing(null);
            setNotice(warning || '');
            reload();
          }}
        />
      )}
    </div>
  );
}

function JewelryForm({ item, types, onClose, onSaved }) {
  const [initialForm] = useState(() =>
    item
      ? {
          name: item.name ?? '',
          description: item.description ?? '',
          material: item.material ?? '',
          style: item.style ?? '',
          color: item.color ?? '',
          price: String(item.price ?? ''),
          stock: String(item.stock ?? 0),
          is_active: item.is_active,
        }
      : EMPTY
  );
  const [form, setForm] = useState(initialForm);
  const [placements, setPlacements] = useState(
    () => item?.jewelry_compatibility?.filter((c) => c.approved).map((c) => c.piercing_type_id) ?? []
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(item?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const togglePlacement = (id) =>
    setPlacements((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) {
      return setErr('Please choose a JPG, PNG, WebP or GIF image.');
    }
    if (f.size > MAX_IMAGE_BYTES) return setErr('Image is too large. Please keep it under 2 MB.');
    setErr('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!name) return setErr('Name is required.');
    if (form.price === '' || !Number.isFinite(price) || price < 0) return setErr('Enter a valid price.');
    if (!Number.isInteger(stock) || stock < 0) return setErr('Stock must be a whole number, 0 or more.');

    setSaving(true);
    try {
      let image_url = item?.image_url ?? null;
      if (file) image_url = await uploadJewelryImage(file);
      const payload = {
        name,
        description: form.description.trim() || null,
        material: form.material.trim() || null,
        style: form.style.trim() || null,
        color: form.color.trim() || null,
        price,
        stock,
        is_active: form.is_active,
        image_url,
      };
      const saved = item ? await updateJewelry(item.id, payload) : await createJewelry(payload);
      await setCompatibility(saved.id, placements);
      let warning = '';
      try {
        await syncJewelryEmbedding(saved); // keep the AI index in step with the catalog
      } catch {
        warning = 'Saved, but the AI index was not updated. Use "Update AI index".';
      }
      onSaved(warning);
    } catch (e2) {
      setErr(toUserMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // close only on a real click on the dark backdrop, and ask first if the form has unsaved typing
        if (e.target !== e.currentTarget) return;
        const dirty = JSON.stringify(form) !== JSON.stringify(initialForm) || file;
        if (!dirty || window.confirm('Discard your changes?')) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-dark border border-brand-blood/30 p-8 space-y-6"
      >
        <h3 className="text-2xl font-serif text-brand-cream">{item ? 'Edit Piece' : 'Add Piece'}</h3>

        <div>
          <label className={label}>Name *</label>
          <input className={input} value={form.name} onChange={set('name')} required />
        </div>

        <div>
          <label className={label}>Description (used by AI recommendations)</label>
          <textarea
            rows={3}
            className={`${input} resize-none`}
            value={form.description}
            onChange={set('description')}
            placeholder="Describe the look and mood, e.g. delicate gold hoop, elegant everyday wear"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className={label}>Material</label>
            <input className={input} list="materials" value={form.material} onChange={set('material')} />
          </div>
          <div>
            <label className={label}>Style</label>
            <input className={input} list="styles" value={form.style} onChange={set('style')} />
          </div>
          <div>
            <label className={label}>Color</label>
            <input className={input} list="colors" value={form.color} onChange={set('color')} />
          </div>
        </div>
        <datalist id="materials">{['Titanium', 'Surgical Steel', 'Gold', 'Niobium', 'Sterling Silver'].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="styles">{['Minimalist', 'Classic', 'Dainty', 'Edgy', 'Glam', 'Vintage', 'Statement'].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="colors">{['Silver', 'Gold', 'Rose Gold', 'Black', 'White', 'Multicolor'].map((v) => <option key={v} value={v} />)}</datalist>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={label}>Price (₱) *</label>
            <input className={input} type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
          </div>
          <div>
            <label className={label}>Stock *</label>
            <input className={input} type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
          </div>
        </div>

        <div>
          <label className={label}>Photo (max 2 MB)</label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-brand-black border border-brand-blood/20 overflow-hidden flex items-center justify-center shrink-0">
              {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-brand-muted">None</span>}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickFile} className="text-xs text-brand-muted" />
          </div>
        </div>

        <div>
          <label className={label}>Approved placements (shop-approved piercings for this piece)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {types.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-brand-cream font-light">
                <input type="checkbox" checked={placements.includes(t.id)} onChange={() => togglePlacement(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-cream font-light">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Visible to customers
        </label>

        {err && <p role="alert" className="text-sm text-red-400 font-light">{err}</p>}

        <div className="flex justify-end gap-6 pt-2">
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-widest text-brand-muted hover:text-brand-cream">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="border border-brand-cream text-brand-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
