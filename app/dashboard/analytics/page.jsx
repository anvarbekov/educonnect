'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllUsers, getAllCourses, getAllConversations, getMessageStats } from '@/services/firestore';
import { subDays, format, startOfDay } from 'date-fns';
import { uz } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import Papa from 'papaparse';

const COLORS = ['#6366f1', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl shadow-xl text-sm"
      style={{ background: 'rgba(15,23,42,0.95)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const [stats, setStats] = useState({ users: 0, messages: 0, courses: 0, conversations: 0 });
  const [dailyActivity, setDailyActivity] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [convTypeData, setConvTypeData] = useState([]);
  const [msgTypeData, setMsgTypeData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);

  const [rawMessages, setRawMessages] = useState([]);
  const [rawUsers, setRawUsers] = useState([]);

  const load = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [users, courses, convs, msgs] = await Promise.all([
        getAllUsers(), getAllCourses(), getAllConversations(), getMessageStats(),
      ]);

      setRawMessages(msgs);
      setRawUsers(users);

      setStats({
        users: users.length,
        messages: msgs.length,
        courses: courses.length,
        conversations: convs.length,
      });

      // Daily activity
      const days = [...Array(period)].map((_, i) => {
        const d = subDays(new Date(), period - 1 - i);
        const dayStart = startOfDay(d).getTime() / 1000;
        const dayEnd = dayStart + 86400;
        const count = msgs.filter((m) => {
          const t = m.createdAt?.seconds;
          return t >= dayStart && t < dayEnd;
        }).length;
        return {
          name: format(d, 'd MMM', { locale: uz }),
          xabarlar: count,
        };
      });
      setDailyActivity(days);

      // Role distribution
      setRoleData([
        { name: "Talabalar", value: users.filter((u) => u.role === 'student').length },
        { name: "O'qituvchilar", value: users.filter((u) => u.role === 'teacher').length },
        { name: 'Adminlar', value: users.filter((u) => u.role === 'admin').length },
      ].filter((d) => d.value > 0));

      // Conversation types
      setConvTypeData([
        { name: 'DM', value: convs.filter((c) => c.type === 'dm').length },
        { name: 'Guruh', value: convs.filter((c) => c.type === 'group').length },
        { name: 'Kanal', value: convs.filter((c) => c.type === 'channel').length },
      ].filter((d) => d.value > 0));

      // Message types
      const typeCount = {};
      msgs.forEach((m) => { typeCount[m.type || 'text'] = (typeCount[m.type || 'text'] || 0) + 1; });
      setMsgTypeData(Object.entries(typeCount).map(([k, v]) => ({
        name: { text: 'Matn', image: 'Rasm', file: 'Fayl', voice: 'Ovoz' }[k] || k,
        value: v,
      })));

      // Top users by message count
      const userMsgCount = {};
      msgs.forEach((m) => {
        if (m.senderId) userMsgCount[m.senderId] = (userMsgCount[m.senderId] || 0) + 1;
      });
      const top = Object.entries(userMsgCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([uid, count]) => ({
          name: users.find((u) => u.id === uid)?.name?.split(' ')[0] || 'Noma\'lum',
          xabarlar: count,
        }));
      setTopUsers(top);

      // Hourly distribution
      const hours = Array.from({ length: 24 }, (_, h) => ({
        soat: `${h}:00`,
        xabarlar: msgs.filter((m) => {
          const d = m.createdAt?.toDate?.();
          return d && d.getHours() === h;
        }).length,
      }));
      setHourlyData(hours);

    } catch (e) { console.error(e); }
    setLoading(false);
  }, [userProfile, period]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const data = rawMessages.slice(0, 500).map((m) => ({
      ID: m.id,
      Yuboruvchi: m.senderName,
      Tur: m.type,
      Vaqt: m.createdAt?.toDate ? format(m.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : '',
      Xabar: m.body?.substring(0, 100),
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const growthRate = dailyActivity.length >= 2
    ? ((dailyActivity.at(-1)?.xabarlar - dailyActivity.at(-2)?.xabarlar) / Math.max(1, dailyActivity.at(-2)?.xabarlar) * 100).toFixed(0)
    : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-dots loading-lg text-primary" />
          <p className="text-sm text-base-content/50 mt-2">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-base-100">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-2xl text-base-content">📊 Learning Analytics</h1>
            <p className="text-sm text-base-content/50 mt-0.5">Platforma faollik tahlili</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setPeriod(d)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: period === d ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(0,0,0,0.04)',
                  color: period === d ? 'white' : 'rgba(0,0,0,0.5)',
                }}>
                {d} kun
              </button>
            ))}
            <button onClick={exportCSV}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white ml-2"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              📥 CSV
            </button>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Foydalanuvchilar', value: stats.users, icon: '👥', color: '#6366f1', sub: `${rawUsers.filter((u) => u.role === 'student').length} talaba` },
            { label: "So'nggi kun xabarlari", value: dailyActivity.at(-1)?.xabarlar || 0, icon: '💬', color: '#7c3aed', sub: `${growthRate > 0 ? '+' : ''}${growthRate}% kechagiga nisbatan` },
            { label: 'Jami xabarlar', value: stats.messages, icon: '📨', color: '#0891b2', sub: `${period} kunlik ko'rsatgich` },
            { label: 'Kurslar', value: stats.courses, icon: '📚', color: '#16a34a', sub: `${rawMessages.filter((m) => m.type === 'voice').length} ta ovozli` },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: `${s.color}15` }}>{s.icon}</div>
                <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
              </div>
              <p className="font-semibold text-sm text-base-content">{s.label}</p>
              <p className="text-xs text-base-content/50 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Daily activity chart */}
        <div className="glass-card p-5 mb-4">
          <h3 className="font-bold text-sm text-base-content mb-4">📈 Kunlik xabar faolligi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="xabarlar" stroke="#6366f1" strokeWidth={2} fill="url(#colorMsg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Role distribution pie */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm text-base-content mb-4">👥 Rollar</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Message types */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm text-base-content mb-4">💬 Xabar turlari</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={msgTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {msgTypeData.map((_, i) => <Cell key={i} fill={COLORS[i + 2]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Conv types */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm text-base-content mb-4">🔗 Suhbat turlari</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={convTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {convTypeData.map((_, i) => <Cell key={i} fill={COLORS[i + 4]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top users */}
        <div className="glass-card p-5 mb-4">
          <h3 className="font-bold text-sm text-base-content mb-4">🏆 Eng faol foydalanuvchilar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topUsers} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="xabarlar" radius={[6, 6, 0, 0]}>
                {topUsers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly distribution */}
        <div className="glass-card p-5">
          <h3 className="font-bold text-sm text-base-content mb-4">🕐 Soat bo'yicha faollik</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="soat" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="xabarlar" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}