import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { Shift, User } from '../../types';
import { Button } from '../ui';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR + 1;
const HOUR_HEIGHT = 64;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function burnOffset(time: string): number {
  const mins = timeToMinutes(time);
  return Math.max(0, mins - DAY_START_HOUR * 60);
}

function shiftDurationMinutes(start: string, end: string): number {
  const startMins = timeToMinutes(start);
  let endMins = timeToMinutes(end);
  if (endMins <= startMins) endMins += 24 * 60;
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
  d.setDate(d.getDate() - d.getDay());
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

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getShiftColor(shift: Shift, myUid: string | null): string {
  if (!myUid) {
    const open = shift.slots.some((s) => !s.assignedTo && !s.preAssigned);
    return open
      ? 'bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan'
      : 'bg-playa-surface border-playa-border text-gray-400';
  }

  const hasMySlot = shift.slots.some((s) => s.assignedTo === myUid);
  if (hasMySlot) return 'bg-neon-orange/20 border-neon-orange/60 text-neon-orange';

  const open = shift.slots.some((s) => !s.assignedTo && !s.preAssigned);
  if (open) return 'bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan';
  return 'bg-playa-surface border-playa-border text-gray-400';
}

function assignColumns(shifts: Shift[]): Map<string, { col: number; totalCols: number }> {
  const sorted = [...shifts].sort((a, b) => burnOffset(a.startTime) - burnOffset(b.startTime));
  const result = new Map<string, { col: number; totalCols: number }>();
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
    group.forEach((shift, index) => result.set(shift.id, { col: index, totalCols: group.length }));
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
  onShiftMove?: (shift: Shift, date: Date, startTime: string, endTime: string) => void;
}

export function ShiftCalendar({
  shifts,
  users,
  myUid,
  isAdmin,
  onShiftClick,
  onShiftDoubleClick,
  onEmptyCellClick,
  onShiftMove,
}: ShiftCalendarProps) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickShiftRef = useRef<Shift | null>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const draggedShiftIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    const scrollOffset = (8 - DAY_START_HOUR) * HOUR_HEIGHT;
    if (view === 'week' && weekScrollRef.current) weekScrollRef.current.scrollTop = scrollOffset;
    if (view === 'day' && dayScrollRef.current) dayScrollRef.current.scrollTop = scrollOffset;
  }, [view]);

  useEffect(() => {
    if (shifts.length === 0) return;

    const normalizedCurrentDate = new Date(currentDate);
    normalizedCurrentDate.setHours(0, 0, 0, 0);
    const normalizedToday = new Date();
    normalizedToday.setHours(0, 0, 0, 0);

    const hasShiftInCurrentWeek = shifts.some((shift) => {
      const shiftDate = (shift.date as unknown as { toDate: () => Date }).toDate();
      const shiftDay = new Date(shiftDate);
      shiftDay.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (shiftDay.getTime() - startOfWeek(normalizedCurrentDate).getTime()) / (24 * 60 * 60 * 1000),
      );
      return diffDays >= 0 && diffDays < 7;
    });

    if (hasShiftInCurrentWeek) return;

    const sortedShiftDates = [...shifts]
      .map((shift) => {
        const shiftDate = (shift.date as unknown as { toDate: () => Date }).toDate();
        const normalizedDate = new Date(shiftDate);
        normalizedDate.setHours(0, 0, 0, 0);
        return normalizedDate;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    const nextShiftDate =
      sortedShiftDates.find((date) => date.getTime() >= normalizedToday.getTime()) ?? sortedShiftDates[0];

    if (!sameDay(nextShiftDate, normalizedCurrentDate)) {
      setCurrentDate(nextShiftDate);
    }
  }, [currentDate, shifts]);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i), []);

  const getShiftsForDay = (day: Date) =>
    shifts.filter((shift) => sameDay((shift.date as unknown as { toDate: () => Date }).toDate(), day));
  const dayShifts = useMemo(() => getShiftsForDay(currentDate), [currentDate, shifts]);
  const dayColumnMap = useMemo(() => assignColumns(dayShifts), [dayShifts]);
  const getOpenShiftCountForDay = (day: Date) =>
    getShiftsForDay(day).filter((shift) => shift.slots.some((slot) => !slot.assignedTo && !slot.preAssigned)).length;

  const getUserInitials = (uid: string) => {
    const user = users.find((candidate) => candidate.uid === uid);
    return user?.displayName?.charAt(0).toUpperCase() ?? '?';
  };

  const getUserName = (uid: string) => {
    const user = users.find((candidate) => candidate.uid === uid);
    return user?.displayName ?? uid;
  };

  const handleShiftInteraction = (shift: Shift, event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

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
        if (clickShiftRef.current) onShiftClick(clickShiftRef.current);
      }, 250);
    }
  };

  const handleShiftDragStart = (shift: Shift, event: DragEvent<HTMLDivElement>) => {
    if (!isAdmin || !onShiftMove) return;
    draggedShiftIdRef.current = shift.id;
    suppressClickRef.current = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', shift.id);
  };

  const handleShiftDragEnd = () => {
    draggedShiftIdRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleDayDrop = (day: Date, event: DragEvent<HTMLDivElement>) => {
    if (!isAdmin || !onShiftMove) return;
    event.preventDefault();

    const shiftId = draggedShiftIdRef.current || event.dataTransfer.getData('text/plain');
    const shift = shifts.find((candidate) => candidate.id === shiftId);
    if (!shift) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clampedY = Math.max(0, Math.min(y, TOTAL_HOURS * HOUR_HEIGHT - 1));
    const snappedHour = DAY_START_HOUR + Math.floor(clampedY / HOUR_HEIGHT);
    const duration = shiftDurationMinutes(shift.startTime, shift.endTime);
    const startMinutes = snappedHour * 60;

    onShiftMove(shift, day, minutesToTime(startMinutes), minutesToTime(startMinutes + duration));
    draggedShiftIdRef.current = null;
  };

  const renderShiftBlock = (
    shift: Shift,
    columnMap: Map<string, { col: number; totalCols: number }>,
    compact = false,
    includeColumns = true,
  ) => {
    const topMin = burnOffset(shift.startTime);
    const durMin = shiftDurationMinutes(shift.startTime, shift.endTime);
    const topPx = (topMin / 60) * HOUR_HEIGHT;
    const heightPx = Math.max((durMin / 60) * HOUR_HEIGHT, 24);
    const col = includeColumns ? columnMap.get(shift.id) ?? { col: 0, totalCols: 1 } : { col: 0, totalCols: 1 };
    const widthPct = includeColumns ? 100 / col.totalCols : 100;
    const leftPct = includeColumns ? col.col * widthPct : 0;
    const color = getShiftColor(shift, myUid);
    const unpublished = isAdmin && shift.published === false;
    const assignedUids = shift.slots.filter((slot) => slot.assignedTo).map((slot) => slot.assignedTo!);
    const openSlots = shift.slots.filter((slot) => !slot.assignedTo && !slot.preAssigned).length;
    const filledSlots = shift.slots.filter((slot) => slot.assignedTo).length;
    const hasMySlot = !!myUid && shift.slots.some((slot) => slot.assignedTo === myUid);

    return (
      <div
        key={shift.id}
        data-shift-block
        draggable={isAdmin && !!onShiftMove}
        className={`absolute border rounded-md px-2 py-1 cursor-pointer hover:brightness-125 transition-all overflow-hidden ${color} ${unpublished ? 'opacity-50 border-dashed' : ''}`}
        style={{
          top: topPx + 1,
          height: heightPx - 2,
          left: `${leftPct + 0.5}%`,
          width: `${widthPct - 1}%`,
        }}
        onClick={(event) => handleShiftInteraction(shift, event)}
        onDragStart={(event) => handleShiftDragStart(shift, event)}
        onDragEnd={handleShiftDragEnd}
      >
        <div className="text-xs font-semibold truncate">
          {shift.title}
          {unpublished && <span className="ml-1 text-yellow-400 text-[10px]">draft</span>}
        </div>
        <div className="text-xs opacity-75">{shift.startTime}–{shift.endTime}</div>
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {hasMySlot ? (
            <span className="rounded bg-neon-orange/20 px-1.5 py-0.5 text-[10px] font-medium text-neon-orange">
              Yours
            </span>
          ) : openSlots > 0 ? (
            <span className="rounded bg-neon-cyan/20 px-1.5 py-0.5 text-[10px] font-medium text-neon-cyan">
              {openSlots} open
            </span>
          ) : (
            <span className="rounded bg-playa-card px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
              Full
            </span>
          )}
          <span className="text-[10px] opacity-70">
            {filledSlots}/{shift.slots.length} filled
          </span>
        </div>
        {!compact && assignedUids.length > 0 && heightPx > 48 && (
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
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(weekStart, -7))}>
            ← Prev
          </Button>
          <span className="text-white font-medium">{formatWeekRange(weekStart)}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(weekStart, 7))}>
            Next →
          </Button>
        </div>

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

      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'week' ? 'bg-neon-orange text-white' : 'text-gray-400 hover:text-white bg-playa-surface'
          }`}
          onClick={() => setView('week')}
        >
          Week
        </button>
        <button
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === 'day' ? 'bg-neon-orange text-white' : 'text-gray-400 hover:text-white bg-playa-surface'
          }`}
          onClick={() => setView('day')}
        >
          Day
        </button>
      </div>

      {view === 'week' ? (
        <div className="rounded-lg border border-playa-border overflow-hidden">
          <div className="flex border-b border-playa-border bg-playa-card sticky top-0 z-10">
            <div className="w-12 flex-shrink-0 border-r border-playa-border/30" />
            {weekDays.map((day) => {
              const isToday = sameDay(day, new Date());
              const openShiftCount = getOpenShiftCountForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 text-center py-2 text-xs font-medium border-l border-playa-border/20 cursor-pointer transition-colors hover:bg-playa-surface/60 ${isToday ? 'text-neon-orange' : 'text-gray-400'}`}
                  onClick={() => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                >
                  <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-base ${isToday ? 'font-bold' : ''}`}>{day.getDate()}</div>
                  {openShiftCount > 0 && (
                    <div className="mt-1 inline-flex rounded-full bg-neon-cyan/20 px-2 py-0.5 text-[10px] font-medium text-neon-cyan">
                      {openShiftCount} open
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div ref={weekScrollRef} className="overflow-y-auto max-h-[600px] bg-playa-card">
            <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              <div className="w-12 flex-shrink-0 relative border-r border-playa-border/30">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-1 text-[10px] text-gray-600 leading-none"
                    style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT - 6 }}
                  >
                    {formatHour(hour)}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayShiftsLocal = getShiftsForDay(day);
                const columnMap = assignColumns(dayShiftsLocal);
                const isToday = sameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-1 relative border-l border-playa-border/20 ${isToday ? 'bg-neon-orange/[0.03]' : ''}`}
                    onClick={(event) => {
                      if (!isAdmin || !onEmptyCellClick) return;
                      if ((event.target as HTMLElement).closest('[data-shift-block]')) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const y = event.clientY - rect.top;
                      const hour = Math.floor(y / HOUR_HEIGHT) + DAY_START_HOUR;
                      onEmptyCellClick(day, hour % 24);
                    }}
                    onDragOver={(event) => {
                      if (!isAdmin || !onShiftMove) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => handleDayDrop(day, event)}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-playa-border/20 pointer-events-none"
                        style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {dayShiftsLocal.map((shift) => renderShiftBlock(shift, columnMap, true, false))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
              ← Prev Day
            </Button>
            <button
              className="text-white font-medium hover:text-neon-cyan transition-colors"
              onClick={() => setView('week')}
            >
              {formatDayHeader(currentDate)}
            </button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
              Next Day →
            </Button>
          </div>
          {getOpenShiftCountForDay(currentDate) > 0 && (
            <div className="mb-4">
              <span className="inline-flex rounded-full bg-neon-cyan/20 px-3 py-1 text-xs font-medium text-neon-cyan">
                {getOpenShiftCountForDay(currentDate)} open shifts today
              </span>
            </div>
          )}

          <div ref={dayScrollRef} className="relative overflow-y-auto max-h-[600px] rounded-lg border border-playa-border bg-playa-card">
            <div
              className="relative"
              style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              onClick={(event) => {
                if (!isAdmin || !onEmptyCellClick) return;
                if ((event.target as HTMLElement).closest('[data-shift-block]')) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const y = event.clientY - rect.top;
                const hour = Math.floor(y / HOUR_HEIGHT) + DAY_START_HOUR;
                onEmptyCellClick(currentDate, hour % 24);
              }}
              onDragOver={(event) => {
                if (!isAdmin || !onShiftMove) return;
                event.preventDefault();
              }}
              onDrop={(event) => handleDayDrop(currentDate, event)}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-playa-border/40 pointer-events-none"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                >
                  <span className="absolute left-1 text-xs text-gray-600 -translate-y-2">
                    {formatHour(hour)}
                  </span>
                </div>
              ))}

              <div className="absolute left-12 right-0 top-0 bottom-0">
                {dayShifts.map((shift) => renderShiftBlock(shift, dayColumnMap, false, true))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
