import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-sm">
                3×3
              </div>
              <span className="font-extrabold text-base tracking-tight text-primary-900">
                NVC 3×3 BASKETBALL
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              ระบบจัดการและติดตามผลการแข่งขัน NVC 3×3 Basketball Club Tournament
              ตารางแข่งขัน ผลคะแนนสด และอัปเดตความเคลื่อนไหวของทุกทีม
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">เมนูด่วน</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/schedule" className="hover:text-primary-600 transition-colors">ตารางแข่งขัน</Link>
              </li>
              <li>
                <Link to="/results" className="hover:text-primary-600 transition-colors">ผลการแข่งขัน</Link>
              </li>
              <li>
                <Link to="/teams" className="hover:text-primary-600 transition-colors">ทีมและสโมสร</Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-primary-600 transition-colors">ข่าวสารและประกาศ</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">ระบบจัดการ</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/admin/login" className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
                  <Shield className="w-3.5 h-3.5" />
                  <span>เจ้าหน้าที่จัดการแข่งขัน</span>
                </Link>
              </li>
              <li className="text-xs text-slate-400">
                กติกา FIBA 3×3 Official Rules
              </li>
              <li className="text-xs text-slate-400">
                ชนะเมื่อทำได้ 21 แต้ม หรือหมดเวลา 10 นาที
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} NVC 3×3 Basketball Club. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-medium">FIBA 3×3 Official Rules</p>
        </div>
      </div>
    </footer>
  );
}
