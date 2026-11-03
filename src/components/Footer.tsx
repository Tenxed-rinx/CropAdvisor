/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sprout } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FAF7F0] border-t border-[#2F6B3A]/15 mt-20 text-[#5B665F] text-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#2F6B3A]/10">
          <div className="flex items-center gap-2 text-[#1F2A24] font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-[#2F6B3A] text-white flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-[#FAF7F0]" />
            </div>
            <span>Crop Advisor</span>
          </div>
          <p className="text-xs text-[#5B665F] text-center md:text-right max-w-md">
            Know your soil. Choose the right crop. Precision agricultural soil analysis and smart crop recommendation platform.
          </p>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B665F]">
          <div>
            Built with Arduino UNO, React and TypeScript.
          </div>
          <div>
            © {new Date().getFullYear()} Crop Advisor · Precision Agriculture System
          </div>
        </div>
      </div>
    </footer>
  );
};
