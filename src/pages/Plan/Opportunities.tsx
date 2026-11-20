import { useState } from 'react';
import { daysFromToday, dayOfMonth, monthTag } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { EVENTS, FUNDS } from '../../state/seeds';
import { useStore } from '../../state/store';
import type { EventItem, Fund } from '../../state/types';
import { CloseButton, Dialog, FieldLabel, StackedConfirm, TextField } from '../../components/ui/Dialog';
import { FilterButton, FilterChips, MenuOption, Popover } from '../../components/ui/Menu';
import { dateRange, dueLabel, longDate, mediumDate, urgency } from './planData';

export type Opp = { kind: 'fund'; id: string } | { kind: 'event'; id: string };

type OppRow = { id: string; date: string; title: string; sub: string; group: string };

const DATE_WINDOWS = ['Any time', 'Next 7 days', 'Next 14 days', 'Next 28 days', 'Next 3 months'] as const;
type DateWindow = (typeof DATE_WINDOWS)[number];
const WINDOW_DAYS: Record<DateWindow, number> = {
  'Any time': Number.POSITIVE_INFINITY,
  'Next 7 days': 7,
  'Next 14 days': 14,
  'Next 28 days': 28,
  'Next 3 months': 92,
};

/** Figma "Upcoming Funds" / "Upcoming Events": compact card with Filter + Add and date-tile rows. */
function OppListCard({
  title,
  rows,
  groupLabel,
  allLabel,
  emptyTitle,
  emptyLine,
  findLabel,
  onOpen,
  onFind,
}: {
  title: string;
  rows: OppRow[];
  groupLabel: string;
  allLabel: string;
  emptyTitle: string;
  emptyLine: string;
  findLabel: string;
  onOpen: (id: string) => void;
  onFind: () => void;
}) {
  const [group, setGroup] = useState<string>(allLabel);
  const [when, setWhen] = useState<DateWindow>('Any time');
  const groups = [allLabel, ...[...new Set(rows.map((r) => r.group))].sort()];
  const shown = rows
    .filter((r) => group === allLabel || r.group === group)
    .filter((r) => when === 'Any time' || (daysFromToday(r.date) >= 0 && daysFromToday(r.date) <= WINDOW_DAYS[when]));
  const count = (group !== allLabel ? 1 : 0) + (when !== 'Any time' ? 1 : 0);
  const clear = () => {
    setGroup(allLabel);
    setWhen('Any time');
  };

  return (
    <section className="card opp-list-card">
      <div className="card-header">
        <h2 className="t-h3 c-1">{title}</h2>
        <div className="card-actions">
          <Popover
            menuClassName="menu menu--filter filter-menu"
            menuStyle={{ width: 440 }}
            trigger={({ open, toggle }) => <FilterButton open={open} onClick={toggle} count={count} />}
          >
            {() => (
              <>
                <div className="menu-columns">
                  <div className="menu-column">
                    <p className="t-banner menu-heading">DATE</p>
                    {DATE_WINDOWS.map((o) => (
                      <MenuOption key={o} label={o} selected={when === o} onSelect={() => setWhen(o)} />
                    ))}
                  </div>
                  <div className="menu-column">
                    <p className="t-banner menu-heading">{groupLabel}</p>
                    {groups.map((o) => (
                      <MenuOption key={o} label={o} selected={group === o} onSelect={() => setGroup(o)} />
                    ))}
                  </div>
                </div>
                <div className="menu-footer">
                  <button type="button" className="t-btn c-accent" onClick={clear}>
                    Clear all
                  </button>
                  <p className="t-body-2 c-3">{count === 0 ? 'Showing everything' : `${count} selected`}</p>
                </div>
              </>
            )}
          </Popover>
          <button type="button" className="btn btn--primary t-btn" onClick={onFind}>
            {'Add + '}
          </button>
        </div>
      </div>

      <FilterChips
        chips={[
          ...(when !== 'Any time' ? [{ label: when, onRemove: () => setWhen('Any time') }] : []),
          ...(group !== allLabel ? [{ label: group, onRemove: () => setGroup(allLabel) }] : []),
        ]}
        onClear={clear}
      />

      {shown.length === 0 ? (
        <div className="empty-state opp-list-empty">
          <p className="t-h4 c-1">{rows.length ? 'Nothing matches this filter' : emptyTitle}</p>
          <p className="t-body-2 c-2">{rows.length ? 'Try another option or clear the filter.' : emptyLine}</p>
          {rows.length ? (
            <button type="button" className="btn btn--link t-btn" onClick={clear}>
              Clear filter
              <Icon name="arrow-right-18" size={18} />
            </button>
          ) : (
            <button type="button" className="btn btn--link t-btn" onClick={onFind}>
              {findLabel}
              <Icon name="arrow-right-18" size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="opp-list">
          {shown.map((r) => {
            const days = daysFromToday(r.date);
            const soon = days >= 0 && days <= 7;
            return (
              <button type="button" key={r.id} className="milestone-row opp-row" onClick={() => onOpen(r.id)}>
                <div className={`date-tile ${soon ? 'date-tile--soon' : ''}`}>
                  <span className="t-overview-header">{monthTag(r.date)}</span>
                  <span className="t-h4">{dayOfMonth(r.date)}</span>
                </div>
                <div className="milestone-row__body">
                  <p className="t-body c-1">{r.title}</p>
                  <p className="t-body-2 c-2">{r.sub}</p>
                </div>
                <p className={`t-body-2 nowrap ${soon ? 'c-warning' : 'c-1'}`}>{days === 0 ? 'Today' : days < 0 ? `${-days}d ago` : `in ${days}d`}</p>
                <Icon name="chev-right" size={20} tint className="row-chev" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FundsSection({ onOpen, onFind }: { onOpen: (o: Opp) => void; onFind: () => void }) {
  const { state } = useStore();
  const rows = state.funds
    .filter((f) => f.listed)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((f) => ({ id: f.id, date: f.deadline, title: f.title, sub: `${f.org}  •  ${f.amount.replace(/ per project$/, '').replace(/ for B\.C\. studios$/, '')}`, group: f.org }));
  return (
    <OppListCard
      title="Upcoming Funds"
      rows={rows}
      groupLabel="ORGANIZER"
      allLabel="All organizers"
      emptyTitle="No funds yet"
      emptyLine="Find funds you can apply to."
      findLabel="Find funds"
      onOpen={(id) => onOpen({ kind: 'fund', id })}
      onFind={onFind}
    />
  );
}

export function EventsSection({ onOpen, onFind }: { onOpen: (o: Opp) => void; onFind: () => void }) {
  const { state } = useStore();
  const rows = state.events
    .filter((e) => e.listed)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((e) => ({ id: e.id, date: e.start, title: e.name, sub: `${e.where}  •  ${e.line1}`, group: e.where }));
  return (
    <OppListCard
      title="Upcoming Events"
      rows={rows}
      groupLabel="LOCATION"
      allLabel="All locations"
      emptyTitle="No events yet"
      emptyLine="Find events to show your game at."
      findLabel="Find events"
      onOpen={(id) => onOpen({ kind: 'event', id })}
      onFind={onFind}
    />
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
  const listed = fund ? fund.listed : event!.listed;
  // Saved data from before links existed falls back to the catalog's link.
  const officialUrl = fund ? fund.url ?? FUNDS.find((f) => f.id === fund.id)?.url : event!.url ?? EVENTS.find((e) => e.id === event!.id)?.url;
  const seeMoreUrl =
    officialUrl ?? `https://www.google.com/search?q=${encodeURIComponent(fund ? `${fund.org} ${fund.title}` : event!.name)}`;
  const u = urgency(date);

  return (
    <Dialog onClose={onClose} className="details">
      <div className="details-head">
        <span className={`details-badge details-badge--${u}`}>{fund ? dueLabel(date, 'Due') : dueLabel(date, 'Starts')}</span>
        <span style={{ flex: 1 }} />
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
        {listed ? (
          <button type="button" className="btn btn--remove t-btn" onClick={() => setConfirm(true)}>
            Remove
            <Icon name="trash-14" size={16} tint />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary t-btn details-add"
            onClick={() =>
              fund ? setFund(fund.id, { listed: true, saved: true }, 'Fund added') : setEvent(event!.id, { listed: true, saved: true }, 'Event added')
            }
          >
            Add to calendar
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 11H4V19H20V11ZM7 5H4V9H20V5H17V7H15V5H9V7H7V5Z" />
            </svg>
          </button>
        )}
        <a
          className="see-more"
          href={seeMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={officialUrl ? `Open ${new URL(officialUrl).hostname}` : 'Search the web'}
        >
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

/** `date`: opened from a calendar day's Add menu, so the list starts on that day. */
export function FindDialog({ kind, date, onClose }: { kind: 'fund' | 'event'; date?: string; onClose: () => void }) {
  const { state, setFund, setEvent } = useStore();
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const query = q.trim().toLowerCase();

  type Row = { id: string; title: string; meta: string; date: string; end?: string; added: boolean; recommended: boolean; text: string };
  const all: Row[] = (
    kind === 'fund'
      ? state.funds.map((f) => ({
          id: f.id,
          title: f.title,
          meta: `${f.org === 'DIGIBC' ? 'DigiBC' : f.org}  •  Deadline ${mediumDate(f.deadline)}`,
          date: f.deadline,
          added: f.listed,
          recommended: false,
          text: `${f.title} ${f.name} ${f.org} ${f.who} ${f.amount}`,
        }))
      : state.events.map((e) => ({
          id: e.id,
          title: e.name,
          meta: `${e.where}  •  ${dateRange(e.start, e.end)}`,
          date: e.start,
          end: e.end,
          added: e.listed,
          recommended: !!e.recommended,
          text: `${e.name} ${e.where} ${e.line1} ${e.audience}`,
        }))
  ).sort((a, b) => a.date.localeCompare(b.date));

  const added = all.filter((r) => r.added);
  // Suggestions: upcoming items not added yet, recommended ones first, nearest date first.
  const suggested = all
    .filter((r) => !r.added && daysFromToday(r.date) >= 0)
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.date.localeCompare(b.date))
    .slice(0, 4);
  // From a calendar day: what's on that day (events cover start..end).
  const onDay = date ? all.filter((r) => (r.end ? r.date <= date && date <= r.end : r.date === date)) : [];
  // Opened from a day, search only looks within that day.
  const results = query ? (date ? onDay : all).filter((r) => r.text.toLowerCase().includes(query)) : [];
  const dayLabel = date ? longDate(date).replace(/, \d{4}$/, '') : '';

  const add = (id: string) =>
    kind === 'fund' ? setFund(id, { listed: true, saved: true }, 'Fund added') : setEvent(id, { listed: true, saved: true }, 'Event added');

  const row = (r: Row) => (
    <div
      key={r.id}
      className="find-result"
      role="button"
      tabIndex={0}
      onClick={() => setDetail(r.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDetail(r.id);
        }
      }}
    >
      <div className="find-result__text">
        <p className="t-btn c-1">{r.title}</p>
        <p className="t-body-2 c-2 pre">{r.meta}</p>
      </div>
      {r.added ? (
        <span className="t-btn c-3 find-result__added">Added</span>
      ) : (
        <button
          type="button"
          className="btn btn--outline t-btn"
          onClick={(e) => {
            e.stopPropagation();
            add(r.id);
          }}
        >
          {'Add +'}
        </button>
      )}
      <Icon name="chev-right" size={20} tint className="row-chev" />
    </div>
  );

  const noun = kind === 'fund' ? 'funds' : 'events';
  return (
    <Dialog
      title={kind === 'fund' ? 'Find Funds' : 'Find Events'}
      subtitle={
        date
          ? `${kind === 'fund' ? 'Funds' : 'Events'} on ${longDate(date)}`
          : kind === 'fund'
            ? 'Explore more funds for your project'
            : 'Search for more events happening'
      }
      // While details are open on top, Esc / outside click should only close the details.
      onClose={detail ? () => {} : onClose}
    >
      <div className="field">
        <FieldLabel>Search</FieldLabel>
        <TextField value={q} onChange={setQ} placeholder={kind === 'fund' ? 'Search name, organization, who it’s for' : 'Search name, city, type'} />
      </div>
      <div className="find-results">
        {query ? null : date ? (
          onDay.length > 0 ? (
            <>
              <p className="find-section">ON {dayLabel.toUpperCase()}</p>
              {onDay.map(row)}
            </>
          ) : (
            <>
              <p className="find-section">ADDED</p>
              {added.map(row)}
              {added.length === 0 && <p className="t-body-2 c-3 find-none">No {noun} added yet.</p>}
              <p className="t-body-2 c-3 find-none find-none--day">
                No more {noun} on this day.
              </p>
            </>
          )
        ) : null}
        {query ? (
          <>
            <p className="find-section">RESULTS</p>
            {results.map(row)}
            {results.length === 0 &&
              (date ? (
                <p className="t-body-2 c-3 find-none">No more {noun} on this day.</p>
              ) : (
                <p className="t-body-2 c-3 find-none">Nothing matches “{q.trim()}”.</p>
              ))}
          </>
        ) : date ? null : (
          <>
            <p className="find-section">ADDED</p>
            {added.map(row)}
            {added.length === 0 && <p className="t-body-2 c-3 find-none">No {noun} added yet.</p>}
            {suggested.length > 0 && (
              <>
                <p className="find-section">SUGGESTED</p>
                {suggested.map(row)}
              </>
            )}
          </>
        )}
      </div>
      <div className="dialog-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn--save t-btn" onClick={onClose}>
          Done
        </button>
      </div>

      {detail && <OppDetailsDialog opp={{ kind, id: detail }} onClose={() => setDetail(null)} />}
    </Dialog>
  );
}
