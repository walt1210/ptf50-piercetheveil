import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Power, X } from 'lucide-react';
import {
  listAllServices,
  createService,
  updateService,
  listPiercingTypes,
} from '../../features/appointments/appointmentService';
import { toUserMessage } from '../../services/api';

const EMPTY_FORM = { name: '', duration: '30', price: '', typeId: '' };

const inputClass =
  'w-full bg-brand-black border border-brand-blood/30 p-3 text-brand-cream text-sm focus:outline-none focus:border-brand-cream';

export default function ServicesManagement() {
  const [services, setServices] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating a new service
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [svc, tps] = await Promise.all([
        listAllServices(),
        listPiercingTypes().catch(() => []), // type names are optional; don't block the page
      ]);
      setServices(svc);
      setTypes(tps);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const typeName = (id) => types.find((t) => t.id === id)?.name;

  const openNew = () => {
    if (showForm && !editingId) return setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name ?? '',
      duration: String(svc.duration_minutes ?? ''),
      price: String(svc.price ?? ''),
      typeId: svc.piercing_type_id ?? '',
    });
    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const price = Number(form.price);
    const duration = Number(form.duration);
    if (!form.name.trim()) return setError('Enter a service name.');
    if (!Number.isFinite(price) || price < 0 || form.price === '') return setError('Enter a valid price in PHP.');
    if (!Number.isInteger(duration) || duration <= 0) return setError('Duration must be a whole number of minutes.');

    const fields = {
      name: form.name.trim(),
      price,
      duration_minutes: duration,
      piercing_type_id: form.typeId || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateService(editingId, fields);
        setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const created = await createService({ ...fields, is_active: true });
        setServices((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc) => {
    setError('');
    setBusyId(svc.id);
    try {
      const updated = await updateService(svc.id, { is_active: !svc.is_active });
      setServices((prev) => prev.map((s) => (s.id === svc.id ? updated : s)));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="border-b border-brand-blood/30 pb-6 flex justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-serif text-brand-cream tracking-wide">Studio Services</h2>
          <p className="text-brand-muted mt-2 font-light tracking-wide text-sm">Configure available piercings, durations, and pricing.</p>
        </div>
        <button
          onClick={showForm && editingId ? closeForm : openNew}
          className="flex items-center gap-2 border border-brand-cream text-brand-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all shrink-0"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'New Service'}
        </button>
      </header>

      {error && (
        <p role="alert" className="border border-brand-blood/50 bg-brand-dark text-brand-blood text-sm p-4">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-brand-dark border border-brand-blood/20 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 text-xl font-serif text-brand-cream">{editingId ? 'Edit service' : 'New service'}</h3>
          <label className="block md:col-span-2">
            <span className="text-[10px] text-brand-muted uppercase tracking-widest">Name</span>
            <input
              className={`${inputClass} mt-1`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Helix Piercing"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-brand-muted uppercase tracking-widest">Price (₱)</span>
            <input
              type="number"
              min="0"
              step="any"
              className={`${inputClass} mt-1`}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-brand-muted uppercase tracking-widest">Duration (minutes)</span>
            <input
              type="number"
              min="1"
              step="1"
              className={`${inputClass} mt-1`}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </label>
          {types.length > 0 && (
            <label className="block md:col-span-2">
              <span className="text-[10px] text-brand-muted uppercase tracking-widest">Piercing type</span>
              <select
                className={`${inputClass} mt-1`}
                value={form.typeId}
                onChange={(e) => setForm({ ...form, typeId: e.target.value })}
              >
                <option value="">None</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full border border-brand-cream text-brand-cream py-3 text-xs uppercase tracking-widest hover:bg-brand-cream hover:text-brand-black transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save service'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-brand-muted text-sm font-light">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="text-brand-muted text-sm font-light">No services yet. Use New Service to add one.</p>
      ) : (
        <div className="space-y-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className={`flex items-center justify-between gap-4 p-6 border ${svc.is_active ? 'bg-brand-dark border-brand-blood/20' : 'bg-brand-black border-brand-blood/5'} transition-colors`}
            >
              <div>
                <h3 className={`font-serif text-xl ${svc.is_active ? 'text-brand-cream' : 'text-brand-muted'}`}>{svc.name}</h3>
                <p className="text-brand-muted text-xs uppercase tracking-widest mt-1">
                  {svc.duration_minutes} mins <span className="text-brand-blood mx-2">|</span> ₱{Number(svc.price).toLocaleString('en-PH')}
                  {typeName(svc.piercing_type_id) && (
                    <>
                      <span className="text-brand-blood mx-2">|</span> {typeName(svc.piercing_type_id)}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
              <button
                title="Edit"
                onClick={() => openEdit(svc)}
                className="p-2 text-brand-muted hover:text-brand-cream transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleToggle(svc)}
                disabled={busyId === svc.id}
                className={`flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-widest transition-all disabled:opacity-50 shrink-0 ${
                  svc.is_active
                    ? 'border-brand-blood/50 text-brand-blood hover:bg-brand-blood hover:text-brand-cream'
                    : 'border-brand-muted/30 text-brand-muted hover:border-brand-cream hover:text-brand-cream'
                }`}
              >
                <Power size={14} />
                {svc.is_active ? 'Deactivate' : 'Activate'}
              </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
