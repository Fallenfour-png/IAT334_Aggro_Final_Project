import { useState } from 'react';
import { dayOfMonth, monthTag } from '../../lib/dates';
import { Icon, iconUrl } from '../../lib/icons';
import { useStore } from '../../state/store';
import type { EventItem, Fund } from '../../state/types';
import { CloseButton, Dialog, FieldLabel, StackedConfirm, TextField } from '../../components/ui/Dialog';
import { dateRange, dueLabel, mediumDate, urgency } from './planData';

export type Opp = { kind: 'fund'; id: string } | { kind: 'event'; id: string };

function BookmarkToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="bookmark-toggle"
      aria-pressed={on}
      aria-label={on ? 'Remove from calendar' : 'Add to calendar'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
    >
      <img className="bm-rest" src={iconUrl(on ? 'bookmark-on' : 'bookmark-off')} width={17.36} height={21.7} alt="" />
      <img className="bm-hover" src={iconUrl(on ? 'bookmark-on-hover' : 'bookmark-hover')} width={17.36} height={21.7} alt="" />
      <span className="tooltip t-sub2">{on ? 'Remove from calendar' : 'Add to calendar'}</span>
    </span>
  );
}

function OppCard({
  pill,
  pillKind,
  date,
  org,
  name,
  lines,
  foot,
  saved,
  onOpen,
  onToggle,
}: {
  pill: string;
  pillKind: string;
  date: string;
  org: string;
  name: string;
  lines: string[];
  foot: string;
  saved: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="opp-card" onClick={onOpen}>
      <span className={`opp-pill opp-pill--${pillKind}`}>{pill}</span>
      <BookmarkToggle on={saved} onToggle={onToggle} />
      <div className="opp-head">
        <div className="date-tile" style={{ border: '1px solid var(--border)' }}>
          <span className="t-overview-header" style={{ fontSize: 11 }}>
            {monthTag(date)}
          </span>
          <span className="t-h4" style={{ fontWeight: 600 }}>
            {dayOfMonth(date)}
          </span>
        </div>
        <div>
          <p className="opp-org">{org}</p>
          <p className="opp-name">{name}</p>
        </div>
      </div>
      <div className="opp-lines">
        {lines.map((l) => (
          <p key={l} className="opp-line">
            {l}
          </p>
        ))}
      </div>
      <p className="opp-foot">{foot}</p>
    </button>
  );
}

function FindCard({ title, sub, wide, onClick }: { title: string; sub: string; wide?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`find-card ${wide ? 'find-card--wide' : ''}`} onClick={onClick}>
      <span className="find-card__icon">
        <Icon name="empty-plus-24" size={24} />
      </span>
      <span className="find-card__title">{title}</span>
      <span className="opp-line">{sub}</span>
    </button>
  );
}

export function FundsSection({ onOpen, onFind }: { onOpen: (o: Opp) => void; onFind: () => void }) {
  const { state, setFund } = useStore();
  const funds = state.funds.filter((f) => f.listed).sort((a, b) => a.deadline.localeCompare(b.deadline));
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <h2 className="t-h2" style={{ color: '#000' }}>
        Upcoming Funds
      </h2>
      {funds.length === 0 ? (
        <FindCard wide title="Find More Funds" sub="Find more funds available" onClick={onFind} />
      ) : (
        <div className="opp-grid">
          {funds.map((f) => (
            <OppCard
              key={f.id}
              pill={dueLabel(f.deadline, 'Due')}
              pillKind={urgency(f.deadline)}
              date={f.deadline}
              org={f.org}
              name={f.name}
              lines={[f.amount, f.line2]}
              foot={`Deadline until ${mediumDate(f.deadline)}`}
              saved={f.saved}
              onOpen={() => onOpen({ kind: 'fund', id: f.id })}
              onToggle={() => setFund(f.id, { saved: !f.saved }, f.saved ? 'Removed from calendar' : 'Added to calendar')}
            />
          ))}
          <FindCard title="Find More Funds" sub="Find more funds available" onClick={onFind} />
        </div>
      )}
    </section>
  );
}

export function EventsSection({ onOpen, onFind }: { onOpen: (o: Opp) => void; onFind: () => void }) {
  const { state, setEvent } = useStore();
  const events = state.events.filter((e) => e.listed).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
      <h2 className="t-h2" style={{ color: '#000' }}>
        Upcoming Events
      </h2>
      {events.length === 0 ? (
        <FindCard wide title="Find More Events" sub="Find more events around" onClick={onFind} />
      ) : (
        <div className="opp-grid">
          {events.map((e) => (
            <OppCard
              key={e.id}
              pill={dueLabel(e.start, 'Starts')}
              pillKind={urgency(e.start)}
              date={e.start}
              org={`EVENT . ${e.kind}`}
              name={e.name}
              lines={[e.line1, e.audience]}
              foot={dateRange(e.start, e.end)}
              saved={e.saved}
              onOpen={() => onOpen({ kind: 'event', id: e.id })}
              onToggle={() => setEvent(e.id, { saved: !e.saved }, e.saved ? 'Removed from calendar' : 'Added to calendar')}
            />
          ))}
          <FindCard title="Find More Events" sub="Find more events around" onClick={onFind} />
        </div>
      )}
    </section>
  );
}

/* ---------------- Details dialog ---------------- */

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="details-row">
      <Icon name={icon} size={18} />
      <p className="details-row__label">{label}</p>
      <p className="details-row__value">{value}</p>
    </div>
  );
}

export function OppDetailsDialog({ opp, onClose }: { opp: Opp; onClose: () => void }) {
  const { state, setFund, setEvent } = useStore();
  const [confirm, setConfirm] = useState(false);
  const fund: Fund | undefined = opp.kind === 'fund' ? state.funds.find((f) => f.id === opp.id) : undefined;
  const event: EventItem | undefined = opp.kind === 'event' ? state.events.find((e) => e.id === opp.id) : undefined;
  if (!fund && !event) return null;

  const date = fund ? fund.deadline : event!.start;
  const saved = fund ? fund.saved : event!.saved;
  const u = urgency(date);
  const toggle = () =>
    fund
      ? setFund(fund.id, { saved: !fund.saved }, fund.saved ? 'Removed from calendar' : 'Added to calendar')
      : setEvent(event!.id, { saved: !event!.saved }, event!.saved ? 'Removed from calendar' : 'Added to calendar');

  return (
    <Dialog onClose={onClose} className="details">
      <div className="details-head">
        <span className={`details-badge details-badge--${u}`}>{fund ? dueLabel(date, 'Due') : dueLabel(date, 'Starts')}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="details-bookmark" aria-pressed={saved} title={saved ? 'Remove from calendar' : 'Add to calendar'} onClick={toggle}>
          <Icon name={saved ? 'bookmark-lg-on' : 'bookmark-lg-off'} width={28.4} height={35.5} />
        </button>
        <CloseButton onClick={onClose} />
      </div>

      <div className="details-title-row">
        <div className="details-date">
          <span className="details-date__m">{monthTag(date)}</span>
          <span className="details-date__d">{dayOfMonth(date)}</span>
        </div>
        <div>
          <p className="details-eyebrow">{fund ? `${fund.org} · Fund` : `Event · ${event!.kind}`}</p>
          <p className="details-title">{fund ? fund.title : event!.name}</p>
        </div>
      </div>

      <div className="details-divider" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="details-section-label">ABOUT</p>
        <p className="details-about">{fund ? fund.about : event!.about}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="details-section-label">DETAILS</p>
        <div className="details-table">
          {fund ? (
            <>
              <DetailRow icon="d-money" label="Funding" value={fund.amount} />
              <DetailRow icon="d-cal" label="Deadline" value={mediumDate(fund.deadline)} />
              <DetailRow icon="d-people" label="Who it's for" value={fund.who} />
              <DetailRow icon="d-org" label="Organizer" value={fund.org === 'DIGIBC' ? 'DigiBC' : fund.org} />
            </>
          ) : (
            <>
              <DetailRow icon="d-cal" label="Dates" value={dateRange(event!.start, event!.end)} />
              <DetailRow icon="d-pin" label="Location" value={event!.where} />
              <DetailRow icon="d-tag" label="Type" value={event!.line1} />
              <DetailRow icon="d-people" label="Audience" value={event!.audience} />
            </>
          )}
        </div>
      </div>

      <div className="details-foot">
        <button type="button" className="btn btn--remove t-btn" onClick={() => setConfirm(true)}>
          Remove
          <Icon name="trash-14" size={14} tint />
        </button>
        <a className="see-more" href="https://www.google.com/search?q=" target="_blank" rel="noreferrer" onClick={(e) => {
          e.preventDefault();
          window.open(`https://www.google.com/search?q=${encodeURIComponent(fund ? `${fund.org} ${fund.title}` : event!.name)}`, '_blank', 'noopener');
        }}>
          See more
          <Icon name="d-external" size={18} />
        </a>
      </div>

      {confirm && (
        <StackedConfirm
          tone="danger"
          title={fund ? 'Remove this fund?' : 'Remove this event?'}
          body={fund ? 'This will be removed from Upcoming Funds and the Plan calendar.' : 'This will be removed from Upcoming Events and the Plan calendar.'}
          cancelLabel="Cancel"
          confirmLabel={fund ? 'Delete fund' : 'Delete event'}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            if (fund) setFund(fund.id, { listed: false, saved: false }, 'Fund removed');
            else setEvent(event!.id, { listed: false, saved: false }, 'Event removed');
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

/* ---------------- Find funds / events ---------------- */

export function FindDialog({ kind, onClose }: { kind: 'fund' | 'event'; onClose: () => void }) {
  const { state, setFund, setEvent } = useStore();
  const [q, setQ] = useState('');
  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const rows =
    kind === 'fund'
      ? state.funds
          .filter((f) => match(`${f.title} ${f.org} ${f.who}`))
          .map((f) => ({ id: f.id, title: f.title, meta: `${f.org === 'DIGIBC' ? 'DigiBC' : f.org}  •  Deadline ${mediumDate(f.deadline)}`, added: f.listed }))
      : state.events
          .filter((e) => match(`${e.name} ${e.where}`))
          .map((e) => ({ id: e.id, title: e.name, meta: `${e.where}  •  ${dateRange(e.start, e.end)}`, added: e.listed }));

  const add = (id: string) =>
    kind === 'fund' ? setFund(id, { listed: true, saved: true }, 'Fund added') : setEvent(id, { listed: true, saved: true }, 'Event added');

  return (
    <Dialog
      title={kind === 'fund' ? 'Find Funds' : 'Find Events'}
      subtitle={kind === 'fund' ? 'Explore more funds for your project' : 'Search for more events happening'}
      onClose={onClose}
    >
      <div className="field">
        <FieldLabel>Search</FieldLabel>
        <TextField value={q} onChange={setQ} placeholder="Search name, organization, city" />
      </div>
      <div className="find-results">
        {rows.map((r) => (
          <div key={r.id} className="find-result">
            <Icon name={r.added ? 'bookmark-filled-16' : 'bookmark-outline-16'} size={16} />
            <div className="find-result__text">
              <p className="t-btn c-1">{r.title}</p>
              <p className="t-body-2 c-2 pre">{r.meta}</p>
            </div>
            {r.added ? (
              <span className="t-btn c-3">Added</span>
            ) : (
              <button type="button" className="btn btn--outline t-btn" onClick={() => add(r.id)}>
                {'Add +'}
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="t-body-2 c-3">Nothing matches “{q}”.</p>}
      </div>
      <div className="dialog-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn--save t-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
