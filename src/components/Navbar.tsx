/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, Menu, X, Play } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Simulator', path: '/simulator' },
    { name: 'Soil Analysis', path: '/soil-analysis' },
    { name: 'Crop Advice', path: '/crop-advice' },
    { name: 'Data Lab', path: '/data-lab' },
    { name: 'About', path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#2F6B3A]/15">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#1F2A24] whitespace-nowrap shrink-0 hover:text-[#2F6B3A] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[#2F6B3A] text-white flex items-center justify-center shadow-sm">
            <Sprout className="w-5 h-5 text-[#FAF7F0]" />
          </div>
          <span>Crop Advisor</span>
        </Link>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5B665F]">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                isActive(link.path)
                  ? 'text-[#2F6B3A] font-semibold border-b-2 border-[#2F6B3A]'
                  : 'hover:text-[#1F2A24]'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            to="/simulator"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2F6B3A] hover:bg-[#25562e] rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Simulator</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#1F2A24] hover:bg-[#E8F1E4] rounded-lg transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#2F6B3A]/15 bg-[#FAF7F0] px-4 pt-2 pb-5 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                isActive(link.path)
                  ? 'bg-[#E8F1E4] text-[#2F6B3A] font-semibold'
                  : 'text-[#1F2A24] hover:bg-black/5'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              to="/simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2F6B3A] rounded-xl shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Simulator</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
