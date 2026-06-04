import React, { useEffect, useState } from 'react';
import { byom, type ByomEventType } from '@byomsdk/sdk';

const EVENT_TYPES: ByomEventType[] = [
  'vault-locked',
  'budget-warning',
  'permission-needed',
  'request-complete',
];

interface LogEntry {
  id: number;
  line: string;
}

export const EventLog: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubs = EVENT_TYPES.map((event) =>
      byom.on(event, (payload) => {
        const time = new Date(payload.timestamp).toLocaleTimeString();
        const data = payload.data ? ` ${JSON.stringify(payload.data)}` : '';
        setEntries((prev) => [
          ...prev.slice(-49),
          {
            id: Date.now() + Math.random(),
            line: `[${time}] ${event}${data}`,
          },
        ]);
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  return (
    <section className="event-log" data-testid="event-log">
      <h2>Extension events</h2>
      <p className="event-log-desc">
        Live log from <code>byom.on()</code> — trigger requests or change vault state to see events.
      </p>
      <ul className="event-log-list">
        {entries.length === 0 ? (
          <li className="event-log-empty">Waiting for events…</li>
        ) : (
          entries.map((e) => <li key={e.id}>{e.line}</li>)
        )}
      </ul>
    </section>
  );
};
