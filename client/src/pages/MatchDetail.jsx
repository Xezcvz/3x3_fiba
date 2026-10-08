import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatchById } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, MapPin, Trophy, Shield, Edit3, Clock } from 'lucide-react';

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchMatch = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getMatchById(id);
      setMatch(res.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.status !== 404);
      if (err.response?.status === 404) setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);
  useLiveUpdates(() => fetchMatch({ showLoading: false }));

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลการแข่งขัน...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-20 text-center">
        {loadError ? <ApiErrorNotice onRetry={() => fetchMatch()} /> : <h2 className="text-xl font-bold text-slate-800">ไม่พบข้อมูลแมตช์นี้</h2>}
        <Link to="/schedule" className="mt-4 inline-flex items-center gap-2 text-primary-600 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าตารางแข่งขัน</span>
        </Link>
      </div>
    );
  }

  const matchDate = new Date(match.matchDate);
  const formattedDate = matchDate.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = matchDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const scoreDetails = match.quarterScoresObj || {};
  const has3x3Details = ['onePtHome', 'onePtAway', 'twoPtHome', 'twoPtAway', 'foulsHome', 'foulsAway']
    .some((key) => scoreDetails[key] !== undefined && scoreDetails[key] !== null);

  const homeWin = isFinished && match.homeScore > match.awayScore;
  const awayWin = isFinished && match.awayScore > match.homeScore;

  return (
    <div className="space-y-8 pb-16">

      {/* Navigation & Admin Action */}
      <div className="flex items-center justify-between">
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปตารางแข่งขัน</span>
        </Link>

        {isAuthenticated && (
          <Link
            to={`/admin/matches?edit=${match.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>แก้ไขแมตช์ / อัปเดตคะแนน (Admin)</span>
          </Link>
        )}
      </div>

      {/* Main Match Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">

        {/* Top Info Bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary-700 bg-primary-100/70 px-2.5 py-1 rounded-md">
              {match.round || 'รอบแบ่งกลุ่ม'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              สาย {match.homeTeam?.group || 'A'}
            </span>
          </div>
          <StatusBadge status={match.status} />
        </div>

        {/* Big Teams Face-Off */}
        <div className="p-6 sm:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 text-center">

            {/* Home Team */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary-50 border-2 border-primary-100 overflow-hidden flex items-center justify-center p-2 shadow-sm">
                {match.homeTeam?.logoUrl ? (
                  <img
                    src={match.homeTeam.logoUrl}
                    alt={match.homeTeam.name}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Shield className="w-12 h-12 text-primary-500" />
                )}
              </div>
              <Link
                to={match.homeTeam ? `/teams/${match.homeTeam.id}` : '/schedule'}
                className="font-extrabold text-lg sm:text-xl text-slate-800 hover:text-primary-600 transition-colors"
              >
                {match.homeTeam?.name || 'TBD · รอทีมชนะรอบก่อนหน้า'}
              </Link>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                เจ้าบ้าน (Home)
              </span>
            </div>

            {/* Score & Status Center */}
            <div className="flex flex-col items-center justify-center space-y-3">
              {(isLive || isFinished) ? (
                <div className="flex items-center justify-center gap-4 sm:gap-6 bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5">
                  <span className={`text-4xl sm:text-5xl font-black tabular-nums ${homeWin ? 'text-primary-600' : 'text-slate-700'}`}>
                    {match.homeScore ?? 0}
                  </span>
                  <span className="text-2xl font-light text-slate-300">-</span>
                  <span className={`text-4xl sm:text-5xl font-black tabular-nums ${awayWin ? 'text-primary-600' : 'text-slate-700'}`}>
                    {match.awayScore ?? 0}
                  </span>
                </div>
              ) : (
                <div className="bg-primary-50 text-primary-700 px-6 py-4 rounded-2xl font-black text-2xl tracking-wider">
                  VS
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-500 font-medium">
                <div className="flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary-500" />
                  <span>เวลา {formattedTime} น.</span>
                </div>
                {match.venue && (
                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" />
                    <span>{match.venue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary-50 border-2 border-primary-100 overflow-hidden flex items-center justify-center p-2 shadow-sm">
                {match.awayTeam?.logoUrl ? (
                  <img
                    src={match.awayTeam.logoUrl}
                    alt={match.awayTeam.name}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Shield className="w-12 h-12 text-primary-500" />
                )}
              </div>
              <Link
                to={match.awayTeam ? `/teams/${match.awayTeam.id}` : '/schedule'}
                className="font-extrabold text-lg sm:text-xl text-slate-800 hover:text-primary-600 transition-colors"
              >
                {match.awayTeam?.name || 'TBD · รอทีมชนะรอบก่อนหน้า'}
              </Link>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                ทีมเยือน (Away)
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* 3x3 Score Summary (if match is live or finished) */}
      {(isLive || isFinished) && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary-600" />
              <span>สรุปคะแนน 3×3 (Score Summary)</span>
            </h3>
            {isLive && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-pulse">
                ⚫ LIVE • กำลังอัปเดตแบบสด
              </span>
            )}
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-4 items-center text-center">
            {/* Home */}
            <div className={`rounded-2xl p-4 border-2 ${
              homeWin ? 'border-primary-400 bg-primary-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="text-xs font-semibold text-slate-500 mb-2 truncate">{match.homeTeam?.name}</p>
              <p className={`text-5xl font-black ${
                homeWin ? 'text-primary-600' : 'text-slate-700'
              }`}>{match.homeScore ?? '-'}</p>
              {homeWin && <p className="text-xs font-bold text-primary-500 mt-1">WIN 🏆</p>}
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-slate-300 font-black text-2xl">VS</span>
              {isFinished && !homeWin && !awayWin && (
                <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">เสมอ</span>
              )}
              <span className="text-xs text-slate-400 font-medium">3×3</span>
            </div>

            {/* Away */}
            <div className={`rounded-2xl p-4 border-2 ${
              awayWin ? 'border-primary-400 bg-primary-50' : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="text-xs font-semibold text-slate-500 mb-2 truncate">{match.awayTeam?.name}</p>
              <p className={`text-5xl font-black ${
                awayWin ? 'text-primary-600' : 'text-slate-700'
              }`}>{match.awayScore ?? '-'}</p>
              {awayWin && <p className="text-xs font-bold text-primary-500 mt-1">WIN 🏆</p>}
            </div>
          </div>

          {/* 3x3 win condition note */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              3×3 — ทีมแรกที่ทำได้ <strong className="text-slate-700">21 แต้มชนะทันที</strong> หรือหมดเวลา <strong className="text-slate-700">10 นาที</strong> ทีมที่คะแนนมากกว่าชนะ • Overtime: ทีมแรกที่ทำได้ 2 แต้มชนะ
            </p>
          </div>
        </div>
      )}

      {has3x3Details && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="score-breakdown-title">
          <h3 id="score-breakdown-title" className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
            <Trophy className="h-5 w-5 text-primary-600" aria-hidden="true" />
            สถิติการทำคะแนน 3×3
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:gap-4 sm:text-sm">
            <span className="font-semibold text-slate-500">รายการ</span>
            <span className="font-semibold text-slate-700">{match.homeTeam?.name}</span>
            <span className="font-semibold text-slate-700">{match.awayTeam?.name}</span>
            <span className="text-slate-500">ยิง 1 แต้ม</span>
            <span>{scoreDetails.onePtHome ?? '—'}</span>
            <span>{scoreDetails.onePtAway ?? '—'}</span>
            <span className="text-slate-500">ยิง 2 แต้ม</span>
            <span>{scoreDetails.twoPtHome ?? '—'}</span>
            <span>{scoreDetails.twoPtAway ?? '—'}</span>
            <span className="text-slate-500">ฟาวล์ทีม</span>
            <span>{scoreDetails.foulsHome ?? '—'}</span>
            <span>{scoreDetails.foulsAway ?? '—'}</span>
          </div>
        </section>
      )}

      {/* Match Details & Venue Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">ข้อมูลสนามแข่งขัน</h4>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{match.venue || 'NVC Court'}</p>
              <p className="text-xs text-slate-500 mt-0.5">เปิดให้แฟนกีฬาและสมาชิกชมฟรี กรุณาปฏิบัติตามกฎของสนาม</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">กติกาการแข่งขัน FIBA 3×3</h4>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-800 text-sm">FIBA 3×3 Official Rules</p>
              <ul className="text-xs text-slate-500 space-y-1 list-none">
                <li>• <strong>เวลา / แต้มชนะ</strong>: 1 ช่วงเวลา 10 นาที หรือทีมแรกที่ทำได้ <strong>21 แต้มชนะทันที</strong></li>
                <li>• <strong>Overtime (ต่อเวลา)</strong>: ไม่มีจับเวลา ทีมแรกที่ทำได้เพิ่ม <strong>2 แต้ม</strong> ชนะเกม</li>
                <li>• <strong>ระบบแต้ม</strong>: ในเส้นโค้ง 1 แต้ม · นอกเส้นโค้ง (Arc) 2 แต้ม · ลูกโทษ 1 แต้ม</li>
                <li>• <strong>Shot Clock</strong>: <strong>12 วินาที</strong> · ผู้เล่นในสนามทีมละ 3 คน (สำรอง 1 คน)</li>
                <li>• <strong>Team Fouls</strong>: ฟาวล์ทีมครั้งที่ 7-9 ได้ยิง 2 โทษ · ฟาวล์ครั้งที่ 10+ ยิง 2 โทษพร้อมได้ครองบอล</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
