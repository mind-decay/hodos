import type { CSSProperties } from 'react';

// The three presentation defects on this page are deliberate, and the bench
// reads them: a banner whose content escapes it, a notes box that cuts its own
// text off, and two actions on top of each other. `bench/fixtures/README.md`
// says which detector each one is for. Nothing here is a defect to fix.
const panel: CSSProperties = { maxWidth: 320, width: '100%' };
const scroller: CSSProperties = { ...panel, overflowX: 'auto' };
const banner: CSSProperties = { ...panel, whiteSpace: 'nowrap', border: '1px solid #ccc', padding: 8 };
const notes: CSSProperties = { ...panel, height: 40, overflowY: 'hidden', border: '1px solid #ccc', padding: 8 };
const actions: CSSProperties = { ...panel, position: 'relative', height: 60 };
const save: CSSProperties = { position: 'absolute', left: 0, top: 0, width: 120, height: 32 };
const discard: CSSProperties = { position: 'absolute', left: 100, top: 12, width: 120, height: 32 };

export function ShiftPage() {
  return (
    <section>
      <h1>Shift handover</h1>

      <div style={scroller}>
        <div style={banner}>
          Handover: 14 open orders, 3 refunds pending, 2 couriers late — escalate to the duty manager before 18:00
        </div>
      </div>

      <h2>Notes</h2>
      <div style={notes}>
        The courier for the north route asked to swap Thursday for Friday. The freezer in bay two
        is reading two degrees high and maintenance has been called. Two pallets are still unlabelled.
      </div>

      <div style={actions}>
        <button type="button" style={save}>
          Save handover
        </button>
        <button type="button" style={discard}>
          Discard
        </button>
      </div>
    </section>
  );
}
