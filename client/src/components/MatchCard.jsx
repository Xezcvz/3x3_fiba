import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';

export default function MatchCard({ match }) {
  if (!match) return null;

  const matchDate = new Date(match.matchDate);
  const formattedDate = matchDate.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const formattedTime = matchDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const homeWin = isFinished && match.homeScore > match.awayScore;
  const awayWin = isFinished && match.awayScore > match.homeScore;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      
      {/* Top Header: Round & Status */}
      <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between text-xs">
        <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
          {match.round || 'รอบแบ่งกลุ่ม'}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Main Match Body: Teams & Scores */}
      <div className="p-5 space-y-4">
        
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200/80 p-0.5">
              {match.homeTeam?.logoUrl ? (
                <img
                  src={match.homeTeam.logoUrl}
                  alt={match.homeTeam.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                  {match.homeTeam?.name?.substring(0, 2) || 'HT'}
                </div>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm sm:text-base ${homeWin ? 'text-primary-700 font-bold' : 'text-slate-800'}`}>
                {match.homeTeam?.name || 'ทีมเจ้าบ้าน'}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">เจ้าบ้าน</span>
            </div>
          </div>
          
          <div className="text-right">
            {(isLive || isFinished) ? (
              <span className={`text-2xl font-black tabular-nums ${homeWin ? 'text-primary-600' : isLive ? 'text-emerald-600' : 'text-slate-700'}`}>
                {match.homeScore ?? '-'}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                VS
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100"></div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200/80 p-0.5">
              {match.awayTeam?.logoUrl ? (
                <img
                  src={match.awayTeam.logoUrl}
                  alt={match.awayTeam.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                  {match.awayTeam?.name?.substring(0, 2) || 'AT'}
                </div>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm sm:text-base ${awayWin ? 'text-primary-700 font-bold' : 'text-slate-800'}`}>
                {match.awayTeam?.name || 'ทีมเยือน'}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">ทีมเยือน</span>
            </div>
          </div>
          
          <div className="text-right">
            {(isLive || isFinished) ? (
              <span className={`text-2xl font-black tabular-nums ${awayWin ? 'text-primary-600' : isLive ? 'text-emerald-600' : 'text-slate-700'}`}>
                {match.awayScore ?? '-'}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400">
                -
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Footer Info: Venue & Date & Action */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-primary-500" />
            <span>{formattedDate} • {formattedTime} น.</span>
          </div>
          {match.venue && (
            <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{match.venue}</span>
            </div>
          )}
        </div>

        <Link
          to={`/matches/${match.id}`}
          className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 hover:border-primary-200 shadow-2xs transition-all flex-shrink-0 ml-2"
        >
          <span>รายละเอียด</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
