import { useState, useMemo } from 'react';
import { Shift, User } from '../../types';
import { Button } from '../ui';

// Burn hours: 06:00 to 02:00 (next day). Total = 20 hours.
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 26; // 26 = 2 AM next day
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR; // 20
const HOUR_HEIGHT = 64; // px per hour in day view

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function burnOffset(time: string): number {
  const mins = timeToMinutes(time);
  // Times before 6 AM belong to the next day in burn calendar
  const adjustedHour = mins < DAY_START_HOUR * 60 ? mins + 24 * 60 : mins;
  return adjustedHour - DAY_START_HOUR * 60; // minutes from 6 AM
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
  onEmptyCellClick?: (date: Date, hour: number) => void;
}

export function ShiftCalendar({
  shifts,
  users,
  myUid,
  isAdmin,
  onShiftClick,
  onEmptyCellClick,
}: ShiftCalendarProps) {
  const [view, setView] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1 min-w-0">
        {weekDays.map((day, i) => {
          const dayShiftsLocal = getShiftsForDay(day);
          const isToday = sameDay(day, new Date());
          return (
            <div key={i} className="min-w-0">
              <div
                className={`text-center text-xs font-medium py-1 mb-1 rounded ${
                  isToday ? 'text-neon-orange' : 'text-gray-400'
                }`}
              >
                <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                  {day.getDate()}
                </div>
              </div>

              <div
                className="min-h-[120px] rounded-lg bg-playa-surface/30 p-1 space-y-1 cursor-pointer"
                onClick={() => {
                  setCurrentDate(day);
                  setView('day');
                }}
              >
                {dayShiftsLocal.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-gray-600 text-xs">—</span>
                  </div>
                )}
                {dayShiftsLocal.map((shift) => {
                  const color = getShiftColor(shift, myUid);
                  const filled = shift.slots.filter((s) => s.assignedTo).length;
                  const total = shift.slots.length;
                  return (
                    <div
                      key={shift.id}
                      className={`border rounded px-1.5 py-1 text-xs cursor-pointer hover:brightness-125 transition-all ${color}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftClick(shift);
                      }}
                    >
                      <div className="font-medium truncate">{shift.title}</div>
                      <div className="opacity-75">{shift.startTime}–{shift.endTime}</div>
                      <div className="opacity-75">{filled}/{total}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
      <div className="relative overflow-y-auto max-h-[600px] rounded-lg border border-playa-border bg-playa-card">
        <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Hour rows */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-playa-border/40"
              style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT }}
            >
              <span className="absolute left-1 text-xs text-gray-600 -translate-y-2">
                {formatHour(h)}
              </span>
              {/* Empty cell click for admin */}
              {isAdmin && onEmptyCellClick && (
                <div
                  className="absolute left-12 right-0 h-16 hover:bg-neon-cyan/5 cursor-cell"
                  onClick={() => onEmptyCellClick(currentDate, h % 24)}
                />
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
              const assignedUids = shift.slots
                .filter((s) => s.assignedTo)
                .map((s) => s.assignedTo!);

              return (
                <div
                  key={shift.id}
                  className={`absolute border rounded-md px-2 py-1 cursor-pointer hover:brightness-125 transition-all overflow-hidden ${color}`}
                  style={{
                    top: topPx + 1,
                    height: heightPx - 2,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                  onClick={() => onShiftClick(shift)}
                >
                  <div className="text-xs font-semibold truncate">{shift.title}</div>
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
