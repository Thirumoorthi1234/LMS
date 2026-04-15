import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HolidayCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const today = new Date();
    const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });

    useEffect(() => {
        api.get('/holidays', { params: { year: current.year } })
            .then(({ data }) => setHolidays(data.holidays));
    }, [current.year]);

    const prevMonth = () => setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
    const nextMonth = () => setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });

    const firstDay = new Date(current.year, current.month, 1).getDay();
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
    const daysInPrev = new Date(current.year, current.month, 0).getDate();

    const holidayDates = holidays
        .filter(h => new Date(h.date).getMonth() === current.month && new Date(h.date).getFullYear() === current.year)
        .map(h => ({ day: new Date(h.date).getDate(), name: h.name, type: h.type }));

    const upcomingHolidays = holidays.filter(h => new Date(h.date) >= today).slice(0, 6);
    const typeColors = { national: 'var(--danger)', regional: 'var(--warning)', company: 'var(--secondary)', optional: 'var(--primary)' };

    const cells = [];
    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false, prev: true });
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const holiday = holidayDates.find(h => h.day === d);
        const isToday = today.getDate() === d && today.getMonth() === current.month && today.getFullYear() === current.year;
        cells.push({ day: d, current: true, isToday, holiday });
    }
    // Next month fill
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) cells.push({ day: d, current: false, next: true });

    return (
        <div className="fade-in">
            <div className="page-header"><h1>Holiday Calendar</h1><p>View all company and national holidays for {current.year}</p></div>

            <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
                {/* Calendar */}
                <div className="card">
                    {/* Nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={18} /></button>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{MONTHS[current.month]} {current.year}</div>
                        <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={18} /></button>
                    </div>
                    {/* Day headers */}
                    <div className="calendar-grid" style={{ marginBottom: 4 }}>
                        {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
                    </div>
                    {/* Cells */}
                    <div className="calendar-grid">
                        {cells.map((cell, i) => (
                            <div key={i}
                                className={`calendar-day${!cell.current ? ' other-month' : ''}${cell.isToday ? ' today' : ''}${cell.holiday ? ' holiday' : ''}`}
                                title={cell.holiday?.name || ''}
                            >
                                {cell.day}
                            </div>
                        ))}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary)' }} />Today</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--danger-light)', border: '1px solid var(--danger)' }} />Holiday</div>
                    </div>
                </div>

                {/* Upcoming Holidays List */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 16 }}>Upcoming Holidays</div>
                    {upcomingHolidays.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Calendar size={48} /></div><h3>No upcoming holidays</h3></div>
                    ) : (
                        upcomingHolidays.map(h => {
                            const d = new Date(h.date);
                            const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={h._id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div style={{ minWidth: 48, textAlign: 'center', background: `${typeColors[h.type]}15`, borderRadius: 'var(--radius-sm)', padding: '8px 4px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: typeColors[h.type], textTransform: 'uppercase' }}>{MONTHS[d.getMonth()].slice(0, 3)}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: typeColors[h.type], lineHeight: 1 }}>{d.getDate()}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{h.type} holiday · {DAYS[d.getDay()]}</div>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                        {daysLeft === 0 ? ' Today' : daysLeft === 1 ? ' Tomorrow' : `${daysLeft}d away`}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* All Holidays for Year */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>All Holidays in {current.year} ({holidays.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
                    {holidays.map(h => {
                        const d = new Date(h.date);
                        return (
                            <div key={h._id} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                                <span style={{ fontSize: 20 }}></span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{h.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', weekday: 'short' })}</div>
                                </div>
                                <span className="badge" style={{ marginLeft: 'auto', background: `${typeColors[h.type]}15`, color: typeColors[h.type] }}>{h.type}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HolidayCalendar;
