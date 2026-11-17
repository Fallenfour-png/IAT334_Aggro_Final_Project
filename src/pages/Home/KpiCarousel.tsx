import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { isConnected, kpiDelta, RANGE_LABEL } from '../../state/selectors';
import { useStore } from '../../state/store';

const CARD_W = 240;

/** 24,600 → 24.6K, 186,000 → 186K (Figma views cards). */
function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : Number(k.toFixed(1))}K`;
}
const GAP = 16;
const STEP = CARD_W + GAP;

export function KpiCarousel() {
  const { state } = useStore();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    // Measure the content box: the viewport has side padding so hovered cards can grow,
    // and counting it made the last page stop short and clip the final card.
    const measure = () => {
      const cs = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // Figma Home: every KPI except "Touchpoints Live" (that count lives in Touchpoint updates and Analytics).
  const kpis = state.kpis.filter((k) => k.source !== 'touchpoints');
  const visible = Math.max(1, Math.floor((width + GAP) / STEP));
  const trackWidth = kpis.length * STEP - GAP;
  const maxOffset = Math.max(0, trackWidth - width);
  const pages = maxOffset === 0 ? 1 : Math.ceil(maxOffset / (visible * STEP)) + 1;
  const current = Math.min(page, pages - 1);
  const offset = Math.min(current * visible * STEP, maxOffset);
  const atEnd = offset >= maxOffset;

  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);

  return (
    <section className="kpi-carousel" aria-label="Key metrics">
      <div className="kpi-viewport" ref={viewportRef}>
        <div className="kpi-track" style={{ transform: `translateX(-${offset}px)` }}>
          {kpis.map((k) => {
            const live = isConnected(state, k) && k.value > 0;
            const delta = kpiDelta(k, state.range);
            const num = (n: number) => (k.compact ? compactNumber(n) : formatNumber(n));
            return (
              <button type="button" key={k.id} className={`kpi-card ${live ? '' : 'is-empty'}`} onClick={() => navigate('/analytics')}>
                <div className="kpi-card__label">
                  <span className="kpi-card__icon">
                    <Icon name={k.icon} size={16} />
                  </span>
                  <span className="t-sub5 c-2 nowrap">{k.label}</span>
                </div>
                <div className="kpi-card__value">
                  <span className="t-h2 c-1 kpi-card__number">{live ? num(k.value) : 0}</span>
                  <Icon name={k.spark} width={80} height={28} />
                </div>
                <div className="kpi-card__meta">
                  {live ? (
                    <p className="t-body c-positive nowrap">{`▲ +${num(delta)} ${RANGE_LABEL[state.range]}`}</p>
                  ) : (
                    <p className="t-body c-3 nowrap">No data yet</p>
                  )}
                  <p className="t-body-2 c-2 nowrap">{live ? `${k.updated} ago` : 'Waiting'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {pages > 1 && (
        <div className="page-dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              type="button"
              key={i}
              className={`page-dot ${i === current ? 'is-active' : ''}`}
              aria-label={`Page ${i + 1}`}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      )}
      <div className="kpi-fade" style={{ opacity: atEnd ? 0 : 1 }} />
      <button
        type="button"
        className="carousel-arrow carousel-arrow--left"
        disabled={current === 0}
        aria-label="Previous"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
      >
        {current === 0 ? (
          <Icon name="chevron-left-disabled" size={20} />
        ) : (
          <Icon name="chevron-right" size={20} className="flip-x" tint />
        )}
      </button>
      {!atEnd && (
        <button type="button" className="carousel-arrow carousel-arrow--right" aria-label="Next" onClick={() => setPage((p) => p + 1)}>
          <Icon name="chevron-right" size={20} tint />
        </button>
      )}
    </section>
  );
}
