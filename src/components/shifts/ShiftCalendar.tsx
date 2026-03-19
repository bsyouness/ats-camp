import { useState, useMemo, useRef, useEffect } from 'react';
import { Shift, User } from '../../types';
import { Button } from '../ui';

// Shift hours: 06:00 to 23:00 (11 PM). Total = 18 hours.
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23; // 11 PM
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR + 1; // 18
const HOUR_HEIGHT = 64; // px per hour in day view

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function burnOffset(time: string): number {
  const mins = timeToMinutes(time);
  return Math.max(0, mins - DAY_START_HOUR * 60); // minutes from 6 AM
}

function shiftDurationMinutes(start: string, end: string): number {
  const startMins = timeToMinutes(start);
  let endMins = timeToMinutes(end);
  if (endMins <= startMins) endMins += 24 * 60; // crosses midnight
  return endMins - startMins;
}

function formatHour(h: number): string {
  const actual = h % 24;
  if (actual === 0) return '12 AM';
  if (actual < 12) return `${actual} AM`;
  if (actual === 12) return '12 PM';
  return `${actual - 12} PM`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function getShiftColor(shift: Shift, myUid: string | null): string {
  if (!myUid) {
    const open = shift.slots.some((s) => !s.assignedTo && !s.preAssigned);
    return open ? 'bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan' : 'bg-playa-surface border-playa-border text-gray-400';
  }
  const hasMySlot = shift.slots.some((s) => s.assignedTo === myUid);
  if (hasMySlot) return 'bg-neon-orange/20 border-neon-orange/60 text-neon-orange';
  const open = shift.slots.some((s) => !s.assignedTo && !s.preAssigned);
  if (open) return 'bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan';
  return 'bg-playa-surface border-playa-border text-gray-400';
}

// Assign columns to overlapping shifts for day view
function assignColumns(shifts: Shift[]): Map<string, { col: number; totalCols: number }> {
  const sorted = [...shifts].sort((a, b) => {
    return burnOffset(a.startTime) - burnOffset(b.startTime);
  });

  const result = new Map<string, { col: number; totalCols: number }>();
  // Groups of overlapping shifts
  const groups: Shift[][] = [];

  for (const shift of sorted) {
    const startA = burnOffset(shift.startTime);
    const endA = startA + shiftDurationMinutes(shift.startTime, shift.endTime);

    let placed = false;
    for (const group of groups) {
      const overlaps = group.some((s) => {
        const startB = burnOffset(s.startTime);
        const endB = startB + shiftDurationMinutes(s.startTime, s.endTime);
        return startA < endB && endA > startB;
      });
      if (overlaps) {
        group.push(shift);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([shift]);
  }

  for (const group of groups) {
    const n = group.length;
    group.forEach((s, i) => result.set(s.id, { col: i, totalCols: n }));
  }

  return result;
}

interface ShiftCalendarProps {
  shifts: Shift[];
  users: User[];
  myUid: string | null;
  isAdmin: boolean;
  onShiftClick: (shift: Shift) => void;
  onShiftDoubleClick?: (shift: Shift) => void;
  onEmptyCellClick?: (date: Date, hour: number) => void;
}

export function ShiftCalendar({
  shifts,
  users,
  myUid,
  isAdmin,
  onShiftClick,
  onShiftDoubleClick,
  onEmptyCellClick,
}: ShiftCalendarProps) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickShiftRef = useRef<Shift | null>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const handleShiftInteraction = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onShiftDoubleClick) {
      onShiftClick(shift);
      return;
    }
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onShiftDoubleClick(shift);
    } else {
      clickShiftRef.current = shift;
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onShiftClick(clickShiftRef.current!);
      }, 250);
    }
  };
  // Auto-scroll to 8 AM when switching views
  useEffect(() => {
    const scrollOffset = (8 - DAY_START_HOUR) * HOUR_HEIGHT;
    if (view === 'week' && weekScrollRef.current) weekScrollRef.current.scrollTop = scrollOffset;
    if (view === 'day' && dayScrollRef.current) dayScrollRef.current.scrollTop = scrollOffset;
  }, [view]);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    []
  );

  function getShiftsForDay(day: Date): Shift[] {
    return shifts.filter((s) => {
      const shiftDate = (s.date as unknown as { toDate: () => Date }).toDate();
      return sameDay(shiftDate, day);
    });
  }

  const dayShifts = useMemo(() => getShiftsForDay(currentDate), [currentDate, shifts]);
  const columnMap = useMemo(() => assignColumns(dayShifts), [dayShifts]);

  const getUserInitials = (uid: string) => {
    const u = users.find((u) => u.uid === uid);
    if (!u) return '?';
    return u.displayName?.charAt(0).toUpperCase() ?? '?';
  };

  const getUserName = (uid: string) => {
    const u = users.find((u) => u.uid === uid);
    return u?.displayName ?? uid;
  };

  // ——— Week View ———
  const WeekView = () => (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(weekStart, -7))}>
          ← Prev
        </Button>
        <span className="text-white font-medium">{formatWeekRange(weekStart)}</span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(weekStart, 7))}>
          Next →
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-playa-border overflow-hidden">
        {/* Sticky day headers */}
        <div className="flex border-b border-playa-border bg-playa-card sticky top-0 z-10">
          <div className="w-12 flex-shrink-0 border-r border-playa-border/30" />
          {weekDays.map((day, i) => {
            const isToday = sameDay(day, new Date());
            return (
              <div
                key={i}
                className={`flex-1 text-center py-2 text-xs font-medium border-l border-playa-border/20 ${isToday ? 'text-neon-orange' : 'text-gray-400'}`}
              >
                <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-base ${isToday ? 'font-bold' : ''}`}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={weekScrollRef} className="overflow-y-auto max-h-[600px] bg-playa-card">
          <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div className="w-12 flex-shrink-0 relative border-r border-playa-border/30">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-1 text-[10px] text-gray-600 leading-none"
                  style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT - 6 }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const dayShiftsLocal = getShiftsForDay(day);
              const colMap = assignColumns(dayShiftsLocal);
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={dayIdx}
                  className={`flex-1 relative border-l border-playa-border/20 ${isToday ? 'bg-neon-orange/[0.03]' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-shift-block]')) return;
                    if (isAdmin && onEmptyCellClick) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top + (weekScrollRef.current?.scrollTop ?? 0);
                      const hour = Math.floor(y / HOUR_HEIGHT) + DAY_START_HOUR;
                      onEmptyCellClick(day, hour % 24);
                    } else {
                      setCurrentDate(day);
                      setView('day');
                    }
                  }}
                >
                  {/* Hour lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-playa-border/20 pointer-events-none"
                      style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Shifts */}
                  {dayShiftsLocal.map((shift) => {
                    const topMin = burnOffset(shift.startTime);
                    const durMin = shiftDurationMinutes(shift.startTime, shift.endTime);
                    const topPx = (topMin / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max((durMin / 60) * HOUR_HEIGHT, 20);
                    const col = colMap.get(shift.id) ?? { col: 0, totalCols: 1 };
                    const widthPct = 100 / col.totalCols;
                    const leftPct = col.col * widthPct;
                    const color = getShiftColor(shift, myUid);
                    const unpublished = isAdmin && shift.published === false;
                    return (
                      <div
                        key={shift.id}
                        data-shift-block
                        className={`absolute border rounded px-1 py-0.5 cursor-pointer hover:brightness-125 transition-all overflow-hidden ${color} ${unpublished ? 'opacity-50 border-dashed' : ''}`}
                        style={{
                          top: topPx + 1,
                          height: heightPx - 2,
                          left: `${leftPct + 0.5}%`,
                          width: `${widthPct - 1}%`,
                        }}
                        onClick={(e) => handleShiftInteraction(shift, e)}
                      >
                        <div className="text-[10px] font-semibold truncate leading-tight">{shift.title}</div>
                        {heightPx > 28 && <div className="text-[10px] opacity-75 leading-tight">{shift.startTime}–{shift.endTime}</div>}
                        {unpublished && <div className="text-yellow-400 text-[9px]">draft</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ——— Day View ———
  const DayView = () => (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
          ← Prev Day
        </Button>
        <span className="text-white font-medium">{formatDayHeader(currentDate)}</span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
          Next Day →
        </Button>
      </div>

      {/* Time grid */}
      <div ref={dayScrollRef} className="relative overflow-y-auto max-h-[600px] rounded-lg border border-playa-border bg-playa-card">
        <div
          className="relative"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
          onClick={(e) => {
            if (!isAdmin || !onEmptyCellClick) return;
            if ((e.target as HTMLElement).closest('[data-shift-block]')) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top + (dayScrollRef.current?.scrollTop ?? 0);
            const hour = Math.floor(y / HOUR_HEIGHT) + DAY_START_HOUR;
            onEmptyCellClick(currentDate, hour % 24);
          }}
        >
          {/* Hour rows */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-playa-border/40 pointer-events-none"
              style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
            >
              <span className="absolute left-1 text-xs text-gray-600 -translate-y-2">
                {formatHour(h)}
              </span>
              {isAdmin && onEmptyCellClick && (
                <div className="absolute left-12 right-0 h-16 hover:bg-neon-cyan/5" />
              )}
            </div>
          ))}

          {/* Shift blocks */}
          <div className="absolute left-12 right-0 top-0 bottom-0">
            {dayShifts.map((shift) => {
              const topMin = burnOffset(shift.startTime);
              const durMin = shiftDurationMinutes(shift.startTime, shift.endTime);
              const topPx = (topMin / 60) * HOUR_HEIGHT;
              const heightPx = Math.max((durMin / 60) * HOUR_HEIGHT, 24);
              const col = columnMap.get(shift.id) ?? { col: 0, totalCols: 1 };
              const widthPct = 100 / col.totalCols;
              const leftPct = col.col * widthPct;
              const color = getShiftColor(shift, myUid);
              const unpublished = isAdmin && shift.published === false;
              const assignedUids = shift.slots
                .filter((s) => s.assignedTo)
                .map((s) => s.assignedTo!);

              return (
                <div
                  key={shift.id}
                  data-shift-block
                  className={`absolute border rounded-md px-2 py-1 cursor-pointer hover:brightness-125 transition-all overflow-hidden ${color} ${unpublished ? 'opacity-50 border-dashed' : ''}`}
                  style={{
                    top: topPx + 1,
                    height: heightPx - 2,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                  onClick={(e) => handleShiftInteraction(shift, e)}
                >
                  <div className="text-xs font-semibold truncate">{shift.title}{unpublished && <span className="ml-1 text-yellow-400 text-[10px]">draft</span>}</div>
                  <div className="text-xs opacity-75">{shift.startTime}–{shift.endTime}</div>
                  {/* User avatars */}
                  {assignedUids.length > 0 && heightPx > 48 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {assignedUids.slice(0, 4).map((uid) => (
                        <div
                          key={uid}
                          className="w-5 h-5 rounded-full bg-playa-surface flex items-center justify-center text-xs font-bold text-white"
                          title={getUserName(uid)}
                        >
                          {getUserInitials(uid)}
                        </div>
                      ))}
                      {assignedUids.length > 4 && (
                        <div className="w-5 h-5 rounded-full bg-playa-surface flex items-center justify-center text-xs text-gray-400">
                          +{assignedUids.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'week'
              ? 'bg-neon-orange text-white'
              : 'text-gray-400 hover:text-white bg-playa-surface'
          }`}
          onClick={() => setView('week')}
        >
          Week
        </button>
        <button
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'day'
              ? 'bg-neon-orange text-white'
              : 'text-gray-400 hover:text-white bg-playa-surface'
          }`}
          onClick={() => setView('day')}
        >
          Day
        </button>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border bg-neon-orange/20 border-neon-orange/60 inline-block" />
            My shift
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border bg-neon-cyan/20 border-neon-cyan/60 inline-block" />
            Open slots
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border bg-playa-surface border-playa-border inline-block" />
            Full
          </span>
        </div>
      </div>

      {view === 'week' ? <WeekView /> : <DayView />}
    </div>
  );
}
