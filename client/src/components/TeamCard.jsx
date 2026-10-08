import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, User, ChevronRight } from 'lucide-react';

export default function TeamCard({ team }) {
  if (!team) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5">
      
      {/* Top Banner with Group */}
      <div className="p-6 flex items-start gap-4">
        
        {/* Team Logo */}
        <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-200">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <Shield className="w-8 h-8 text-primary-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700">
              สาย {team.group || 'A'}
            </span>
          </div>
          
          <h3 className="font-bold text-base sm:text-lg text-slate-800 mt-1 truncate group-hover:text-primary-600 transition-colors">
            {team.name}
          </h3>

          <div className="mt-2 space-y-1 text-xs text-slate-500">
            {team.city && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{team.city}</span>
              </div>
            )}
            {team.coach && (
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{team.coach}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Stats row if available */}
      {team.stats && (
        <div className="grid grid-cols-4 border-t border-slate-100 bg-slate-50/70 text-center py-2.5 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">แข่ง</span>
            <span className="font-bold text-slate-700">{team.stats.played}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">ชนะ</span>
            <span className="font-bold text-emerald-600">{team.stats.won}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">แพ้</span>
            <span className="font-bold text-rose-500">{team.stats.lost}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">แต้ม/นัด</span>
            <span className="font-black text-primary-600">{Number(team.stats.scoringAverage || 0).toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Bottom Action */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium px-2">
          {team.stats?.totalMatches ? `${team.stats.totalMatches} แมตช์ในรายการ` : 'พร้อมลงแข่งขัน'}
        </span>
        <Link
          to={`/teams/${team.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <span>ดูข้อมูลทีม</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
