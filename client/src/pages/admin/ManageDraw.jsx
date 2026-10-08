import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getTeams, manualDraw, prepareDraw, spinDraw as requestSpinDraw, cancelDraw, resetDraw, getTournamentBracket } from '../../services/api';
import FibaBracket from '../../components/FibaBracket';
import { categoryLabel } from '../../utils/category-label';
import { useModal } from '../../context/ModalContext';
import {
  Shuffle,
  Users,
  Settings,
  RotateCcw,
  Save,
  ChevronRight,
  Trophy,
  Zap,
  Check,
  ArrowLeftRight,
  Sparkles,
  CircleDot,
} from 'lucide-react';

// ─── Group color palette ───────────────────────────────────────────────────
const GROUP_COLORS = {
  A: { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', glow: 'shadow-blue-200' },
  B: { bg: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', glow: 'shadow-rose-200' },
  C: { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', glow: 'shadow-emerald-200' },
  D: { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', glow: 'shadow-amber-200' },
  E: { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', glow: 'shadow-purple-200' },
  F: { bg: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', glow: 'shadow-cyan-200' },
};
const getColor = (group) => GROUP_COLORS[group] || GROUP_COLORS.A;

// ─── TeamPill used in both modes ───────────────────────────────────────────
function TeamPill({ team, group, onRemove, onClick, compact = false }) {
  const c = getColor(group);
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${c.light} ${c.border} 
        transition-all duration-200 select-none
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className={`rounded-full object-cover flex-shrink-0 ${compact ? 'w-5 h-5' : 'w-7 h-7'}`} />
      ) : (
        <div className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${c.bg} ${compact ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'}`}>
          {team.name.charAt(0)}
        </div>
      )}
      <span className={`font-semibold text-slate-700 truncate ${compact ? 'max-w-[80px]' : 'max-w-[120px]'}`}>{team.name}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(team.id); }}
          className="ml-auto text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="ย้ายออกจากสาย"
        >✕</button>
      )}
    </div>
  );
}

const WHEEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

function secureRandomIndex(length) {
  if (length < 1) throw new Error('ไม่มีทีมเหลือให้จับสลาก');
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / length) * length;
  const value = new Uint32Array(1);
  do { window.crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % length;
}

function DrawWheel({ plan, teams, revealed, onReveal, onFinish, onCancel, saving }) {
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinError, setSpinError] = useState('');
  const timerRef = useRef(null);
  const activeResult = revealed.at(-1) || null;
  const remaining = plan.total - revealed.length;
  const revealedIds = new Set(revealed.map((item) => item.teamId));
  const remainingTeams = teams.filter((team) => !revealedIds.has(team.id));
  const segmentSize = 360 / Math.max(remainingTeams.length, 1);
  const wheelGradient = remainingTeams.length
    ? `conic-gradient(${remainingTeams.map((_, index) => `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${index * segmentSize}deg ${(index + 1) * segmentSize}deg`).join(', ')})`
    : '#1e293b';

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const spinWheel = async () => {
    if (spinning || remainingTeams.length === 0) return;
    setSpinError('');
    setSpinning(true);
    try {
      const { data } = await requestSpinDraw(plan.sessionId);
      const selectedIndex = remainingTeams.findIndex((team) => team.id === data.teamId);
      if (selectedIndex < 0) throw new Error('ผลที่ได้ไม่ตรงกับรายชื่อที่เหลือ กรุณาเริ่มรอบใหม่');
      const centerAngle = (selectedIndex + 0.5) * segmentSize;
      const currentRotation = wheelRotation % 360;
      const alignment = ((90 - centerAngle - currentRotation) % 360 + 360) % 360;
      const targetRotation = wheelRotation + (360 * 6) + alignment;
      setWheelRotation(targetRotation);
      timerRef.current = setTimeout(() => {
        setSpinning(false);
        onReveal(data);
      }, 5200);
    } catch (error) {
      setSpinError(error.response?.data?.message || error.message || 'หมุนวงล้อไม่สำเร็จ');
      setSpinning(false);
    }
  };

  const resultGroup = activeResult?.group;
  const color = getColor(resultGroup || 'A');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4">
      <section role="dialog" aria-modal="true" aria-label="วงล้อจับสลากสด" className="max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Live group draw</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">วงล้อจับสลากสด</h2>
            <p className="mt-1 text-sm text-slate-500">หมุนเองทีละทีม · เหลือ {remaining} ทีม</p>
          </div>
          <button onClick={onCancel} disabled={saving || spinning} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-40">ปิด</button>
        </div>

        <div className="my-5 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-violet-800 p-4 text-center text-white sm:p-6">
            <div className="relative mx-auto w-fit py-2">
              <div className="absolute -right-3 top-1/2 z-20 h-0 w-0 -translate-y-1/2 border-y-[15px] border-r-[27px] border-y-transparent border-r-cyan-300 drop-shadow-lg" />
              <div className="relative h-[min(72vw,58vh,440px)] w-[min(72vw,58vh,440px)]">
                <div className="absolute inset-0 overflow-hidden rounded-full border-[9px] border-white shadow-2xl shadow-black/40" style={{ background: wheelGradient, transform: `rotate(${wheelRotation}deg)`, transition: spinning ? 'transform 5.2s cubic-bezier(0.12, 0.72, 0.12, 1)' : 'none' }}>
                  {remainingTeams.map((team, index) => {
                    const angle = (index + 0.5) * segmentSize;
                    const radius = remainingTeams.length > 10 ? 38 : 35;
                    const labelWidth = Math.max(16, 2 * radius * Math.sin((segmentSize / 2) * (Math.PI / 180)) * 0.9);
                    const radians = (angle - 90) * (Math.PI / 180);
                    const left = 50 + radius * Math.cos(radians);
                    const top = 50 + radius * Math.sin(radians);
                    let textAngle = angle;
                    if (textAngle > 90 && textAngle < 270) textAngle += 180;
                    return <span key={team.id} className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(9px,1.2vw,14px)] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ left: `${left}%`, top: `${top}%`, maxWidth: `${labelWidth}%`, transform: `translate(-50%, -50%) rotate(${textAngle}deg)` }}>{team.name}</span>;
                  })}
                </div>
                <button type="button" onClick={spinWheel} disabled={spinning || saving || remaining === 0} aria-label="กดหมุนวงล้อจับสลาก" className="absolute inset-[38%] z-10 flex items-center justify-center rounded-full border-[5px] border-white bg-slate-950/95 px-2 text-center text-xs font-black leading-tight text-white shadow-xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80 sm:text-sm">
                  {spinning ? 'กำลังหมุน…' : 'กดเพื่อหมุน'}
                </button>
              </div>
            </div>
            {activeResult ? (
              <div className="animate-fade-in">
                <p className="text-sm text-blue-100">ผลการหมุนครั้งล่าสุด</p>
                <div className="mx-auto mt-1 text-xl font-black sm:text-2xl">{activeResult.team.name}</div>
                <div className={`mx-auto mt-2 inline-flex items-center gap-2 rounded-full ${color.bg} px-6 py-2 text-lg font-black shadow-lg`}>
                  <CircleDot className="h-5 w-5" /> เข้าสาย {resultGroup}
                </div>
              </div>
            ) : <p className="text-sm text-blue-100">{spinning ? 'วงล้อกำลังหมุน...' : `เหลือ ${remaining} ทีม · คลิกกลางวงล้อเพื่อจับทีละทีม`}</p>}
            {spinError && <p role="alert" className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800">{spinError}</p>}
          </div>

          <aside className="space-y-4">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {Object.keys(plan.groupCounts).map((group) => (
                <div key={group} className={`rounded-xl border p-3 text-center lg:text-left ${getColor(group).light} ${getColor(group).border}`}>
                  <p className={`text-sm font-black ${getColor(group).text}`}>สาย {group}</p>
                  <p className="mt-1 text-xs text-slate-600">ออกแล้ว {revealed.filter((item) => item.group === group).length} / {plan.groupCounts[group]} ทีม</p>
                </div>
              ))}
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-50 p-3 lg:max-h-[36vh]">
              <p className="mb-2 text-xs font-bold text-slate-500">ผลที่ออกแล้ว ({revealed.length})</p>
              {revealed.length === 0 ? <p className="text-xs text-slate-400">กดหมุนเพื่อเริ่มจับทีมแรก</p> : revealed.map((item, index) => <div key={item.teamId} className="flex items-center justify-between gap-2 border-b border-slate-200 py-1.5 text-xs last:border-0"><span className="min-w-0 truncate text-slate-700">{index + 1}. {item.team.name}</span><span className={`shrink-0 font-bold ${getColor(item.group).text}`}>สาย {item.group}</span></div>)}
            </div>
          </aside>
        </div>

        {remaining === 0 ? (
          <button onClick={onFinish} disabled={saving || spinning} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white shadow-lg disabled:opacity-50">
            {saving ? 'กำลังบันทึกผล...' : <><Check className="h-5 w-5" /> ยืนยันผลและบันทึกการจัดสาย</>}
          </button>
        ) : <p className="text-center text-sm font-semibold text-slate-500">คลิกปุ่มกลางวงล้อเพื่อหมุนครั้งที่ {revealed.length + 1} / {plan.total}</p>}
      </section>
    </div>
  );
}


// ─── Visual Group Bracket ─────────────────────────────────────────────────
function GroupBracket({ groups }) {
  const groupKeys = Object.keys(groups).filter(k => k !== 'Unassigned').sort();
  if (groupKeys.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {groupKeys.map((g) => {
          const c = getColor(g);
          const teams = groups[g] || [];
          return (
            <div key={g} className={`rounded-2xl border-2 ${c.border} overflow-hidden shadow-lg ${c.glow}`}>
              {/* Group Header */}
              <div className={`${c.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white/80" />
                  <span className="font-extrabold text-white tracking-widest text-sm">สาย {g}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                  {teams.length} ทีม
                </span>
              </div>

              {/* Teams list */}
              <div className={`${c.light} p-3 space-y-2 min-h-[120px]`}>
                {teams.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">ยังไม่มีทีม</div>
                ) : (
                  teams.map((team, idx) => (
                    <div key={team.id} className="flex items-center gap-2.5 group">
                      {/* Seed number */}
                      <span className={`text-xs font-black w-5 h-5 rounded-full ${c.bg} text-white flex items-center justify-center flex-shrink-0`}>
                        {idx + 1}
                      </span>
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full ${c.bg} text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0`}>
                          {team.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-slate-700 truncate">{team.name}</span>
                      {team.city && <span className="text-xs text-slate-400 hidden sm:block ml-auto truncate">{team.city}</span>}
                    </div>
                  ))
                )}
              </div>

              {/* VS connector lines between teams */}
              {teams.length >= 2 && (
                <div className={`border-t ${c.border} ${c.light} px-4 py-2`}>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>{Math.floor(teams.length * (teams.length - 1) / 2)} แมตช์ในสาย</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bracket connector visualization */}
      {groupKeys.length >= 2 && (
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-rose-500 to-emerald-500" />
          <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            แผนผังทัวร์นาเมนต์
          </h3>

          <div className="flex items-center justify-center gap-0 flex-wrap">
            {/* Group stage */}
            <div className="flex flex-col gap-3">
              {groupKeys.map((g) => {
                const c = getColor(g);
                return (
                  <div key={g} className={`px-4 py-2 rounded-lg ${c.bg} text-white font-bold text-sm w-24 text-center shadow-md`}>
                    สาย {g}
                  </div>
                );
              })}
            </div>

            {/* Arrow lines */}
            <div className="flex flex-col items-center px-2">
              {groupKeys.map((_, i) => (
                <div key={i} className="flex items-center h-10">
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              ))}
            </div>

            {/* Semifinal / Quarterfinal */}
            <div className="flex flex-col gap-3 justify-center">
              {Array.from({ length: Math.ceil(groupKeys.length / 2) }).map((_, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-amber-100 border-2 border-amber-300 text-amber-700 font-bold text-xs w-28 text-center">
                  รอบ {groupKeys.length <= 2 ? 'รองชนะเลิศ' : 'ก่อนรองฯ'}
                </div>
              ))}
            </div>

            <div className="px-2">
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Final */}
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-amber-200 text-center w-28">
                🏆 ชิงชนะเลิศ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ManageDraw() {
  const { confirm, alert } = useModal();

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawPlan, setDrawPlan] = useState(null);
  const [revealedDraw, setRevealedDraw] = useState([]);
  const [bracketData, setBracketData] = useState(null);

  const [category, setCategory] = useState('รุ่น A');

  // Mode: 'view' | 'manual'
  const [mode, setMode] = useState('view');
  // groupCount for auto draw
  const [groupCount, setGroupCount] = useState(3);

  // Manual mode state: teamId -> group
  const [manualAssignments, setManualAssignments] = useState({});

  // ── Load current draw state ─────────────────────────────────────────────
  const loadData = useCallback(async (cat = category) => {
    try {
      setLoading(true);
      const [teamsRes, bracketRes] = await Promise.all([
        getTeams({ category: cat }),
        getTournamentBracket(cat),
      ]);
      setGroups(teamsRes.data.reduce((grouped, team) => {
        const groupName = team.group || 'Unassigned';
        grouped[groupName] = [...(grouped[groupName] || []), team];
        return grouped;
      }, {}));
      setTeams(teamsRes.data);
      setBracketData(bracketRes.data);
      setLoadError('');

      // Populate manual assignments from current data
      const init = {};
      teamsRes.data.forEach(t => { init[t.id] = t.group || ''; });
      setManualAssignments(init);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.message || 'โหลดข้อมูลสายการแข่งขันไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { loadData(category); }, [loadData, category]);

  // ── Auto Draw ──────────────────────────────────────────────────────────
  const handleAutoDraw = async () => {
    const ok = await confirm({
      title: `🎲 สุ่มจับสลากแบ่งสายอัตโนมัติ (${groupCount} สาย)`,
      message: `คุณต้องการสุ่มจัดสายให้กับ ${teams.length} ทีม ใช่หรือไม่?\n\nระบบจะสุ่มทีมเข้ากลุ่ม A, B, C อย่างยุติธรรมและโปร่งใส โดยข้อมูลสายเดิมจะถูกจัดสรรใหม่`,
      confirmText: '🎲 เริ่มสุ่มจับสายเลย!',
      cancelText: 'ยกเลิก',
      type: 'info',
    });
    if (!ok) return;

    try {
      const res = await prepareDraw({ groupCount, category });
      setTeams(res.data.teams);
      setRevealedDraw([]);
      setDrawPlan({ sessionId: res.data.sessionId, groupCounts: res.data.groupCounts, total: res.data.teams.length });
    } catch (err) {
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || err.message,
        type: 'error',
      });
    }
  };

  const revealNextTeam = useCallback((team) => {
    if (team) setRevealedDraw((current) => [...current, team]);
  }, []);

  const finishDraw = async () => {
    try {
      setSaving(true);
      const assignments = revealedDraw.map(({ teamId, group }) => ({ teamId, group }));
      const result = await manualDraw(assignments, category, drawPlan.sessionId);
      setDrawPlan(null);
      setRevealedDraw([]);
      await loadData(category);
      const createdMatches = result.data?.createdMatches || 0;
      await alert({
        title: 'จับสลากสำเร็จ',
        message: createdMatches > 0
          ? `บันทึกผลครบทุกทีมและสร้างคู่แข่งรอบแบ่งกลุ่ม ${createdMatches} แมตช์แล้ว (เริ่มพรุ่งนี้ 09:00 น. ใช้ 2 สนาม)`
          : 'บันทึกผลการจับสลากครบทุกทีมแล้ว',
        type: 'success',
      });
    } catch (err) {
      await alert({ title: 'บันทึกผลไม่สำเร็จ', message: err.response?.data?.message || err.message, type: 'error' });
    } finally { setSaving(false); }
  };

  // ── Manual Save ────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    const assignments = Object.entries(manualAssignments).map(([teamId, group]) => ({
      teamId: Number(teamId),
      group: group || null,
    }));
    try {
      setSaving(true);
      const res = await manualDraw(assignments, category);
      setGroups(res.data.teams.reduce((grouped, team) => {
        const groupName = team.group || 'Unassigned';
        grouped[groupName] = [...(grouped[groupName] || []), team];
        return grouped;
      }, {}));
      setTeams(res.data.teams);
      setMode('view');
      await alert({
        title: 'สำเร็จ',
        message: 'บันทึกการจัดสายเรียบร้อยแล้ว ✅',
        type: 'success',
      });
    } catch (err) {
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || err.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = async () => {
    const ok = await confirm({
      title: '🔄 ยืนยันการรีเซ็ตการจัดสายทั้งหมด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตการจัดสาย?\nทีมทุกทีมจะกลับมาเป็นสถานะ "ไม่มีสาย" และข้อมูลการแบ่งกลุ่มจะถูกล้างออก',
      confirmText: 'ยืนยันรีเซ็ตสาย',
      cancelText: 'ยกเลิก',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await resetDraw(category);
      await loadData();
      await alert({
        title: 'รีเซ็ตสำเร็จ',
        message: 'รีเซ็ตการจัดสายของทุกทีมเรียบร้อยแล้ว',
        type: 'success',
      });
    } catch (err) {
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถรีเซ็ตการจัดสายได้',
        type: 'error',
      });
    }
  };

  // ── Manual assignment helpers ──────────────────────────────────────────
  const groupLabels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

  const assignedGroups = {};
  groupLabels.forEach(g => { assignedGroups[g] = []; });
  const unassigned = [];

  teams.forEach(team => {
    const g = manualAssignments[team.id];
    if (g && assignedGroups[g]) assignedGroups[g].push(team);
    else unassigned.push(team);
  });

  const setTeamGroup = (teamId, group) => {
    setManualAssignments(prev => ({ ...prev, [teamId]: group }));
  };

  const hasAnyGroup = Object.keys(groups).some(k => k !== 'Unassigned' && groups[k]?.length > 0);
  const changeCategory = (nextCategory) => {
    if (nextCategory === category) return;
    setCategory(nextCategory);
    setDrawPlan(null);
    setRevealedDraw([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {drawPlan && <DrawWheel
        plan={drawPlan}
        teams={teams}
        revealed={revealedDraw}
        saving={saving}
        onReveal={revealNextTeam}
        onFinish={finishDraw}
        onCancel={() => { cancelDraw(drawPlan.sessionId).catch(() => {}); setDrawPlan(null); setRevealedDraw([]); }}
      />}

      <div className="space-y-8 pb-16">
        {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex justify-between text-sm text-rose-800"><span>{loadError}</span><button onClick={() => loadData(category)} className="font-bold underline">ลองอีกครั้ง</button></div>}
        {teams.some((team) => team.category !== category) && <div role="status" className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-900">ข้อมูลแอดมินแสดงทั้ง 2 รุ่น ส่วนการจับสายและผังด้านล่างแสดง {categoryLabel(category)} เท่านั้น</div>}

        {/* ── Page Header ── */}
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-primary-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-2">
                <Shuffle className="w-3.5 h-3.5" />
                <span>ระบบจัดสายการแข่งขัน</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Group Draw</h1>
              <p className="text-sm text-primary-100 mt-1">
                {teams.length} ทีม · {hasAnyGroup
                  ? `จัดสายแล้ว (${Object.keys(groups).filter(k => k !== 'Unassigned').length} สาย)`
                  : 'ยังไม่ได้จับสาย'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {mode === 'view' ? (
                <>
                  <button
                    onClick={() => setMode('manual')}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    จัดสายเอง
                  </button>
                  {hasAnyGroup && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 border border-red-400/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      รีเซ็ต
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMode('view')}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleManualSave}
                    disabled={saving}
                    className="px-4 py-2.5 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-60"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึก
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── AUTO DRAW panel ── */}
        {mode === 'view' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              วงล้อจับสลากสด (จับทีละทีม)
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">รุ่นการแข่งขัน</label>
                <div className="flex gap-2">
                  {['รุ่น A', 'รุ่น B'].map((division) => (
                    <button key={division} onClick={() => changeCategory(division)} className={`rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all ${category === division ? 'border-primary-600 bg-primary-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}>
                      {categoryLabel(division)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">จำนวนสาย</label>
                <div className="flex gap-2">
                  {[2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setGroupCount(n)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all ${groupCount === n
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed max-w-xs">
                ทีม {teams.length} ทีม จะถูกสุ่มเข้า {groupCount} สาย<br />
                โดยมีทีมไม่เกิน 4 ทีมต่อสาย และบันทึกเมื่อเปิดผลครบทุกทีม
              </div>
              <button
                onClick={handleAutoDraw}
                disabled={teams.length === 0 || teams.length > groupCount * 4}
                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 
                  text-white rounded-xl font-bold text-sm shadow-md shadow-primary-200 transition-all flex items-center gap-2 
                  disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                <Sparkles className="w-4 h-4" />
                จับสายเดี๋ยวนี้!
              </button>
            </div>
          </div>
        )}

        {/* ── MANUAL mode ── */}
        {mode === 'manual' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                จัดสายด้วยตนเอง
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">จำนวนสาย:</span>
                {[2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setGroupCount(n)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs border-2 transition-all ${groupCount === n
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Unassigned pool */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border-2 border-dashed border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      ยังไม่ได้จัดสาย ({unassigned.length})
                    </span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[200px] bg-white">
                    {unassigned.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
                        <Check className="w-8 h-8" />
                        <span className="text-xs font-medium">จัดสายครบทุกทีมแล้ว</span>
                      </div>
                    ) : (
                      unassigned.map(team => (
                        <div key={team.id} className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-medium px-1">เลือกสายสำหรับ {team.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm flex-1 min-w-0">
                              {team.logoUrl
                                ? <img src={team.logoUrl} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-5 h-5 rounded-full bg-slate-300 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{team.name.charAt(0)}</div>
                              }
                              <span className="font-semibold text-slate-700 truncate text-xs">{team.name}</span>
                            </div>
                            {groupLabels.map(g => {
                              const c = getColor(g);
                              return (
                                <button
                                  key={g}
                                  onClick={() => setTeamGroup(team.id, g)}
                                  className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${c.bg} text-white hover:scale-110 shadow-sm`}
                                  title={`เข้าสาย ${g}`}
                                >
                                  {g}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Group columns */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                {groupLabels.map(g => {
                  const c = getColor(g);
                  const teamsInGroup = assignedGroups[g] || [];
                  return (
                    <div key={g} className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
                      <div className={`${c.bg} px-3 py-2 flex items-center justify-between`}>
                        <span className="font-extrabold text-white text-sm">สาย {g}</span>
                        <span className="text-xs text-white/80">{teamsInGroup.length} ทีม</span>
                      </div>
                      <div className={`${c.light} p-2 space-y-1.5 min-h-[140px]`}>
                        {teamsInGroup.length === 0 ? (
                          <div className="flex items-center justify-center h-20 text-slate-400 text-xs">
                            ลากหรือคลิกทีมเพื่อเพิ่ม
                          </div>
                        ) : (
                          teamsInGroup.map(team => (
                            <TeamPill
                              key={team.id}
                              team={team}
                              group={g}
                              compact
                              onRemove={(id) => setTeamGroup(id, '')}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Current Group Bracket ── */}
        {mode === 'view' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {hasAnyGroup ? 'ผลการจัดสายปัจจุบัน' : 'ยังไม่ได้จัดสาย'}
              </h2>
              {hasAnyGroup && (
                <span className="text-xs text-slate-400 font-medium">
                  {teams.length} ทีม · {Object.keys(groups).filter(k => k !== 'Unassigned').length} สาย
                </span>
              )}
            </div>

            {hasAnyGroup ? (
              <GroupBracket groups={groups} />
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Shuffle className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-600">ยังไม่มีการจัดสาย</p>
                  <p className="text-sm text-slate-400 mt-1">กดปุ่ม "จับสายเดี๋ยวนี้!" หรือ "จัดสายเอง" ด้านบน</p>
                </div>
              </div>
            )}

            {/* Unassigned teams warning */}
            {hasAnyGroup && groups['Unassigned']?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-amber-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-amber-700">มีทีมที่ยังไม่ได้จัดสาย ({groups['Unassigned'].length} ทีม)</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {groups['Unassigned'].map(t => t.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* FIBA 3x3 Tournament Bracket with Lines & Qualification */}
            <div className="pt-8 border-t border-slate-200">
              <FibaBracket
                bracketData={bracketData}
                onRefresh={() => loadData(category)}
                activeCategory={category}
                onCategoryChange={(newCat) => {
                  changeCategory(newCat);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
