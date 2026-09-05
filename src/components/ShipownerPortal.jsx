import React, { useState } from 'react';
import {
  Ship, X, CheckCircle, Clock, MapPin, ArrowRight,
  FileText, Search, Activity, TrendingUp, Fuel,
} from 'lucide-react';
import { cargoTenders, fleetData } from '../data/mockData';

const StatusBadge = ({ status }) => {
  const cls = { 'Available': 'badge-green', 'On Charter': 'badge-blue', 'In Transit': 'badge-amber' };
  return <span className={`badge ${cls[status] || 'badge-blue'}`}>{status}</span>;
};

const TenderBadge = ({ status }) => {
  const cls = { 'Open': 'badge-green', 'Closing Soon': 'badge-red' };
  return <span className={`badge ${cls[status] || 'badge-blue'}`}>{status}</span>;
};

/* ── Bid Modal ─────────────────────────────── */
const BidModal = ({ tender, onClose }) => {
  const [form, setForm] = useState({ vesselName: '', offeredRate: '', etaOrigin: '', laycanCommit: '', remarks: '' });
  const [done, setDone] = useState(false);

  if (done) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <CheckCircle size={28} color="#10b981" />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Bid Submitted</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Your proposal for <strong style={{ color: 'var(--text-primary)' }}>{tender.id}</strong> at{' '}
          <strong style={{ color: '#10b981' }}>${form.offeredRate}/MT</strong> is under review.
        </p>

        <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {[
            { label: 'Reference', value: `BID-${Date.now().toString().slice(-6)}` },
            { label: 'Vessel',    value: form.vesselName || 'N/A' },
            { label: 'Rate',      value: `$${form.offeredRate}/MT` },
            { label: 'Status',    value: 'Under Review' },
          ].map((r, i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-purple">{tender.id}</span>
              <TenderBadge status={tender.status} />
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Submit Bid Proposal</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>

        {/* Tender summary */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {[
            { label: 'Commodity', value: tender.commodity },
            { label: 'Volume',    value: `${(tender.volume/1000).toFixed(0)}K MT` },
            { label: 'Route',     value: `${tender.origin.split(',')[0]} → ${tender.destination}` },
            { label: 'Laycan',    value: `${tender.laycanStart}–${tender.laycanEnd}` },
            { label: 'Max Draft', value: `${tender.maxDraft}m` },
            { label: 'Target',    value: `$${tender.targetRate}/MT` },
          ].map((r, i) => (
            <div key={i}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label className="field-label">Vessel Name *</label>
            <input className="input-field" placeholder="e.g. MV Bay Spirit"
              value={form.vesselName} onChange={e => setForm(p => ({ ...p, vesselName: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="field-label">Offered Rate ($/MT) *</label>
              <input type="number" className="input-field" placeholder="e.g. 14.8"
                value={form.offeredRate} onChange={e => setForm(p => ({ ...p, offeredRate: e.target.value }))} />
              {form.offeredRate && Number(form.offeredRate) < tender.targetRate && (
                <div style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 3 }}>
                  ✓ ${(tender.targetRate - Number(form.offeredRate)).toFixed(1)}/MT below target
                </div>
              )}
            </div>
            <div>
              <label className="field-label">ETA at Origin *</label>
              <input type="date" className="input-field"
                value={form.etaOrigin} onChange={e => setForm(p => ({ ...p, etaOrigin: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="field-label">Laycan Commitment *</label>
            <input className="input-field" placeholder="e.g. Sep 10–20, 2024"
              value={form.laycanCommit} onChange={e => setForm(p => ({ ...p, laycanCommit: e.target.value }))} />
          </div>

          <div>
            <label className="field-label">Remarks</label>
            <textarea className="input-field" placeholder="Loading rate, demurrage terms…"
              value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
              rows={3} style={{ resize: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 4 }}>
            <button onClick={onClose} className="btn-secondary" style={{ justifyContent: 'center' }}>Cancel</button>
            <button onClick={() => setDone(true)} className="btn-primary" style={{ justifyContent: 'center' }}>
              <FileText size={14} /> Submit Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ─────────────────────────── */
export default function ShipownerPortal() {
  const [selectedTender, setSelectedTender] = useState(null);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [classFilter,    setClassFilter]    = useState('All');
  const [fleetFilter,    setFleetFilter]    = useState('All');

  const filtered = cargoTenders.filter(t => {
    const q = search.toLowerCase();
    return (
      (!q || t.commodity.toLowerCase().includes(q) || t.origin.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) &&
      (statusFilter === 'All' || t.status === statusFilter) &&
      (classFilter  === 'All' || t.requiredClass === classFilter)
    );
  });

  const filteredFleet = fleetData.filter(v => fleetFilter === 'All' || v.status === fleetFilter);

  const TENDER_COLS = '1fr 90px 170px 140px 80px 90px 80px 100px';
  const FLEET_COLS  = '160px 100px 65px 80px 65px 65px 80px 1fr 120px 110px';

  return (
    <div style={{ padding: '2rem', maxWidth: 1380, margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Ship size={20} color="var(--accent-cyan)" />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Fleet & Tender Management
          </h1>
          <span className="badge badge-cyan">
            <div className="pulse-dot" style={{ background: '#22d3ee' }} /> Live
          </span>
        </div>
        <p className="section-sub">Browse cargo tenders, submit proposals, and track your fleet.</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Active Tenders',   value: cargoTenders.filter(t => t.status === 'Open').length, icon: FileText,    color: '#6366f1', sub: '1 closing soon' },
          { label: 'Vessels Available',value: fleetData.filter(v => v.status === 'Available').length,icon: Ship,        color: '#10b981', sub: 'Ready to charter' },
          { label: 'On Charter',       value: fleetData.filter(v => v.status === 'On Charter').length,icon: Activity,  color: '#22d3ee', sub: 'Currently deployed' },
          { label: 'Open Bids',        value: 11,                                                    icon: TrendingUp,  color: '#f59e0b', sub: 'Awaiting award' },
        ].map(({ label, value, icon: Icon, color, sub }, i) => (
          <div key={i} className="stat-card">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Icon size={17} color={color} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── TENDERS TABLE ── */}
      <div className="card" style={{ padding: 0, marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="section-title">Active Cargo Tenders</div>
            <p className="section-sub">{filtered.length} results</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-field" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2rem', width: 160, height: 36 }} />
            </div>
            <select className="select-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 110, height: 36 }}>
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="Closing Soon">Closing Soon</option>
            </select>
            <select className="select-field" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ width: 120, height: 36 }}>
              <option value="All">All Classes</option>
              <option value="Capesize">Capesize</option>
              <option value="Panamax">Panamax</option>
              <option value="Supramax">Supramax</option>
              <option value="Handysize">Handysize</option>
            </select>
          </div>
        </div>

        <div className="table-header" style={{ display: 'grid', gridTemplateColumns: TENDER_COLS }}>
          <span>Tender / Commodity</span><span>Volume</span><span>Route</span>
          <span>Laycan</span><span>Draft</span><span>Rate</span><span>Bids</span><span>Action</span>
        </div>

        {filtered.map(t => (
          <div key={t.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: TENDER_COLS, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 2 }}>{t.id}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{t.commodity}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <TenderBadge status={t.status} />
                <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>{t.requiredClass}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(t.volume/1000).toFixed(0)}K MT</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <MapPin size={10} />{t.origin.split(',')[0]}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowRight size={10} color="var(--accent-primary)" />{t.destination}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.laycanStart} → {t.laycanEnd}</div>
              <div style={{ fontSize: '0.68rem', color: t.status === 'Closing Soon' ? '#ef4444' : 'var(--text-muted)' }}>
                Expires in {t.expiresIn}
              </div>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.maxDraft}m</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>${t.targetRate}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{t.bids}</div>
            <div>
              <button className="btn-primary" onClick={() => setSelectedTender(t)}
                style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}>
                <FileText size={12} /> Bid
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── FLEET TABLE ── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="section-title">Fleet Capability Tracker</div>
            <p className="section-sub">{fleetData.length} registered vessels</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Available', 'On Charter', 'In Transit'].map(f => (
              <button key={f} className={`tab-button ${fleetFilter === f ? 'active' : ''}`}
                onClick={() => setFleetFilter(f)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: FLEET_COLS }}>
              <span>Vessel</span><span>Type</span><span>DWT</span><span>Draft</span>
              <span>LOA</span><span>Beam</span><span>Fuel/day</span><span>Location</span>
              <span>ETA / Notes</span><span>Status</span>
            </div>

            {filteredFleet.map(v => (
              <div key={v.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: FLEET_COLS, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.flag} {v.imo}</div>
                </div>
                <span className={`badge ${v.type === 'Capesize' ? 'badge-purple' : v.type === 'Panamax' ? 'badge-cyan' : v.type === 'Supramax' ? 'badge-green' : 'badge-amber'}`}>
                  {v.type}
                </span>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(v.dwt/1000).toFixed(0)}K</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v.maxDraft}m</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.loa}m</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.beam}m</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Fuel size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.fuelConsumption} MT</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{v.location}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: v.eta ? '#f59e0b' : 'var(--text-muted)' }}>{v.eta || '—'}</div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTender && <BidModal tender={selectedTender} onClose={() => setSelectedTender(null)} />}
    </div>
  );
}
