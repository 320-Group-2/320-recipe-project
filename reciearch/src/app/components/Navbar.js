'use client';

 import Link from 'next/link';
 import { usePathname } from 'next/navigation';
 import ProfileDropdown from './ProfileDropdown'; // Import the new component

 // Accept the whole user object or just email? Let's assume email for now.
 export default function Navbar({ userEmail }) {
   const pathname = usePathname();

  const linkClasses = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
      pathname === path
        ? 'bg-indigo-700 text-white'
        : 'text-gray-300 hover:bg-indigo-500 hover:text-white'
    }`;

  return (
    <nav className="bg-indigo-600 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Links */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* Optional: Add a logo here */}
              <span className="text-white font-bold text-xl">ReciSearch</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/dashboard" className={linkClasses('/dashboard')}>
                  Home
                </Link>
                <Link href="/favorites" className={linkClasses('/favorites')}>
                  Favorites
                </Link>
                {/* Add other links here if needed */}
              </div>
            </div>
          </div>

           {/* Right side: Profile Dropdown */}
           <div className="hidden md:block">
             <div className="ml-4 flex items-center md:ml-6">
               {/* Replace span with ProfileDropdown */}
               {userEmail ? (
                 <ProfileDropdown user={{ email: userEmail }} /> // Pass user object (or just email)
               ) : (
                 // Optional: Show Login/Register links if not logged in
                 <Link href="/login" className="text-gray-300 hover:bg-indigo-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                   Login
                 </Link>
               )}
             </div>
           </div>

          {/* Mobile menu button (optional, for future enhancement) */}
          {/* <div className="-mr-2 flex md:hidden"> ... </div> */}
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state (optional) */}
      {/* <div className="md:hidden"> ... </div> */}
    </nav>
  );
}
