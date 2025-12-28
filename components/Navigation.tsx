'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CombinedSearchModal from './CombinedSearchModal';

export default function Navigation() {
  const pathname = usePathname();
  const [showSearchModal, setShowSearchModal] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/sonarr', label: 'Sonarr' },
    { href: '/radarr', label: 'Radarr' },
    { href: '/settings', label: 'Settings' },
  ];

  const handleMediaAdded = () => {
    // Refresh the page to show updated media
    window.location.reload();
  };

  return (
    <>
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Unifarr</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowSearchModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>
          </div>
        </div>
      </nav>
      <CombinedSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onMediaAdded={handleMediaAdded}
      />
    </>
  );
}

