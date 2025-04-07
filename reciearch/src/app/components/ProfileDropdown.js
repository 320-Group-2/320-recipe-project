'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaSignOutAlt } from 'react-icons/fa'; // Example icons
import { supabase } from '../supabaseClient'; // Adjust path if needed
import { useClickOutside } from '../hooks/useClickOutside'; // Import the hook

// TODO: Define proper user type if available, using placeholder for now
// interface User {
//   email?: string | null;
//   name?: string | null; // Placeholder
//   avatarUrl?: string | null; // Placeholder
// }

export default function ProfileDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Close dropdown when clicking outside
  const dropdownRef = useClickOutside(() => setIsOpen(false));

  // Close dropdown on Escape key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
   }, []);

   const handleLogout = async () => {
     // Confirmation dialog
     if (window.confirm('Are you sure you want to logout?')) {
       console.log("Logging out...");
       try {
         const { error } = await supabase.auth.signOut();
         if (error) {
           console.error('Error logging out:', error);
           // Optionally show an error message to the user
         } else {
           // Redirect to login page after successful logout
           // Use replace to prevent going back to the dashboard via browser history
           router.replace('/login');
         }
       } catch (error) {
         console.error('Unexpected error during logout:', error);
         // Optionally show an error message
       }
     } else {
       console.log("Logout cancelled.");
     }
   };

   const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="profile-menu"
        aria-label="User menu"
      >
        {/* Placeholder Icon - Replace with user.avatarUrl if available */}
        <FaUserCircle className="w-6 h-6" />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="profile-menu"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button" // Assuming button gets an ID later or use aria-label
          >
            <div className="py-1" role="none">
              {/* User Info Section */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                     {/* Placeholder Icon */}
                     <FaUserCircle className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate" role="none">
                      {user?.name || 'User Name'} {/* Placeholder Name */}
                    </p>
                    <p className="text-xs text-gray-500 truncate" role="none">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              {/* Example Item (add more as needed) */}
              {/* <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Your Profile</a> */}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                role="menuitem"
              >
                <FaSignOutAlt className="mr-2 h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
