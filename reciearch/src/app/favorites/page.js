'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react'; // Import React for React.memo

// --- Memoized Recipe Card Component (Simplified for Grid Display) ---
// Explanation:
// This component is like a little trading card for each favorite recipe in our grid.
// It's wrapped in React.memo(), which is a performance booster. It means React will
// skip re-rendering this card if its props (fav, details, isLoadingDetails, etc.) haven't changed.
// It shows the recipe name and an image (or a placeholder if the image isn't loaded yet
// or if we're waiting for details). It also has that little trash can button to remove
// the favorite. Clicking the main card area triggers the `onClick` function (passed down
// from the parent) which will handle showing the expanded view.
const RecipeCard = React.memo(({ fav, details, isLoadingDetails, onClick, onRemove }) => {
  // Helper to get ingredients from details (only needed if showing preview on hover later)
  /* const getIngredientsList = (recipeData) => { ... } */
  // const ingredientsList = getIngredientsList(details); // Only needed for preview

  // Determine image source - prioritize fetched details, fallback to potential placeholder if needed
  const imageUrl = details?.strMealThumb; // Assuming details are fetched on click/hover for expanded view
  const showPlaceholder = !imageUrl && !isLoadingDetails;

  return (
    // Removed layout prop - grid handles positioning
    <motion.div
      key={fav.recipe_id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }} // Simple fade for grid items
      className="bg-gradient-to-br from-blue-300 to-purple-300 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out overflow-hidden cursor-pointer"
      onClick={onClick} // Trigger expansion
    >
      <div className="p-4">
        {imageUrl && (
          <img src={imageUrl} alt={fav.recipe_name} className="w-full h-40 object-cover rounded-md mb-3" />
        )}
        {/* Show pulsing placeholder when loading details */}
        {isLoadingDetails && (
           <div className="w-full h-40 bg-gray-200 rounded-md mb-3 animate-pulse"></div>
        )}
        {/* Show static placeholder only if not loading and no image URL */}
        {showPlaceholder && !isLoadingDetails && (
           <div className="w-full h-40 bg-gray-200 rounded-md mb-3 flex items-center justify-center text-gray-400">
             <span>No Image</span> {/* Or keep empty */}
           </div>
        )}
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg text-[#FFF1D5] truncate mr-2 flex-1">{fav.recipe_name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when removing
              onRemove(fav.recipe_id);
            }}
            className="p-1 text-xs font-medium rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-300"
            title="Remove Favorite"
          >
            {/* Remove Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        {/* Indicate if missing MealDB ID */}
        {!fav.mealdb_id && <p className="text-xs text-red-500 mt-1">Missing MealDB ID</p>}
      </div>
      {/* No expandable section directly inside the grid card anymore */}
    </motion.div>
  );
});
RecipeCard.displayName = 'RecipeCard';

// --- Expanded Recipe View Component (Overlay) ---
// Explanation:
// This component is the pop-up modal or overlay that shows the full recipe details.
// It takes the recipe ID, the fetched details (or lack thereof), loading status, and a close function (`onClose`) as props.
// It uses Framer Motion for the cool fade-in/scale-up animation.
// Inside, it displays the recipe image, name, ingredients (using a helper function `getIngredientsList`),
// and instructions. It also includes a background overlay that closes the modal when clicked.
const ExpandedRecipeView = ({ recipeId, details, isLoading, onClose }) => {
  // Helper function to parse ingredients from TheMealDB format
  const getIngredientsList = (recipeData) => {
    if (!recipeData || recipeData.error) return [];
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipeData[`strIngredient${i}`];
      const measure = recipeData[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredients.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`);
      } else {
        break;
      }
    }
    return ingredients;
  };
  const ingredientsList = getIngredientsList(details);

  return (
    <>
      {/* Background Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm"
        onClick={onClose} // Close when clicking overlay
      />

      {/* Expanded Card Content */}
      <motion.div
        key="expanded-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
        className="fixed inset-0 m-auto w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[85vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ transform: 'translateZ(0)' }} // Promote to composite layer for performance
      >
        {/* Top Section: Image and Close Button */}
        <div className="relative flex-shrink-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 bg-gray-700 bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close recipe details"
          >
            {/* Close Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Image Display */}
          {details?.strMealThumb && !details.error && (
            <img src={details.strMealThumb} alt={details.strMeal} className="w-full h-64 object-cover" />
          )}
          {/* Placeholder if no image and no error */}
          {!details?.strMealThumb && !details?.error && !isLoading && (
            <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
              <span>Image not available</span>
            </div>
          )}
          {/* Loading Placeholder */}
           {isLoading && (
            <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
          )}
          {/* Error display (implicitly handled by not showing image/placeholder if details.error is true) */}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-5">
          {/* Recipe Title */}
          <h2 className="text-3xl font-bold text-gray-900">{details?.strMeal || 'Loading...'}</h2>

          {/* Loading/Error Indicators */}
          {isLoading && <p className="text-gray-600">Loading details...</p>}
          {details?.error && <p className="text-red-600 bg-red-50 p-3 rounded">Error loading details: {details.message}</p>}

          {/* Recipe Details (Ingredients & Instructions) */}
          {!isLoading && details && !details.error && (
            <>
              <div>
                <h4 className="font-semibold text-xl text-gray-800 mb-2 border-b pb-1">Ingredients</h4>
                <ul className="list-disc list-inside text-base text-gray-700 space-y-1 pl-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {ingredientsList.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
                {ingredientsList.length === 0 && <p className="text-sm text-gray-500 italic mt-1">No ingredients listed.</p> }
              </div>
              <div>
                <h4 className="font-semibold text-xl text-gray-800 mb-2 border-b pb-1">Instructions</h4>
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {details.strInstructions || 'No instructions available.'}
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
};

// --- Main Favorites Page Component ---
// Explanation:
// This is the main page component. It orchestrates everything: checking if the user
// is logged in, fetching the list of their favorite recipe IDs from our Supabase database,
// fetching the basic details (like name) for those recipes from Supabase, and then
// sequentially fetching the full details (image, ingredients, instructions) for each
// recipe from the external TheMealDB API. It manages the loading states, handles errors,
// and renders the grid of `RecipeCard` components and the `ExpandedRecipeView` when a card is clicked.
export default function FavoritesPage() {
  // --- State Variables ---
  // Explanation:
  // These hooks hold the component's state - the data it needs to remember and display.
  // - user: Stores the logged-in user's info from Supabase Auth. Null if not logged in.
  // - loading: Tracks if we're initially loading the *list* of favorites (true/false).
  // - favorites: An array holding the basic info for each favorite { recipe_id, recipe_name, mealdb_id }.
  // - fetchError: Stores any error message encountered during fetching. Null if no error.
  // - expandedFavoriteId: Stores the `recipe_id` of the card that's currently expanded. Null if none are expanded.
  // - detailedFavoriteData: An object used as a cache. Stores the full recipe details fetched from TheMealDB, keyed by `recipe_id`. e.g., { 123: {strMeal: ..., strInstructions: ...} }
  // - detailLoading: An object tracking the loading state *for each individual recipe's details*. Keyed by `recipe_id`. e.g., { 123: true, 456: false }
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]); // Holds { recipe_id, recipe_name, mealdb_id }
  const [fetchError, setFetchError] = useState(null);
  const [expandedFavoriteId, setExpandedFavoriteId] = useState(null); // Track expanded card (using internal recipe_id)
  const [detailedFavoriteData, setDetailedFavoriteData] = useState({}); // Cache for MealDB details { recipe_id: mealDbData }
  const [detailLoading, setDetailLoading] = useState({}); // Track loading state for details { recipe_id: boolean }
  const router = useRouter(); // Next.js hook for navigation (like redirecting to login)

  // --- Fetch Full Recipe Details from TheMealDB ---
  // Explanation:
  // This function fetches the complete details for a *single* recipe from TheMealDB API,
  // using the `mealDbId` we stored in our database. It's wrapped in `useCallback`
  // to prevent it from being recreated on every render unless its dependencies
  // (`detailedFavoriteData`, `detailLoading`) change. This helps optimize performance.
  // It checks if we already have the details or are currently loading them to avoid
  // unnecessary fetches. It updates the `detailedFavoriteData` cache and the
  // `detailLoading` state for that specific recipe (`internalRecipeId`).
  const fetchFavoriteDetails = useCallback(async (mealDbId, internalRecipeId) => {
     // Bail out early if no ID, or if we already have data, or if we're already fetching it
     if (!mealDbId || detailedFavoriteData[internalRecipeId] || detailLoading[internalRecipeId]) {
      return;
    }
    // Mark this specific recipe as loading
    setDetailLoading(prev => ({ ...prev, [internalRecipeId]: true }));
    try {
      const detailUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealDbId}`;
      const response = await fetch(detailUrl);
      if (!response.ok) throw new Error(`Failed to fetch details: ${response.status}`);
      const data = await response.json();
      // Check if the API returned a meal and store it
      if (data.meals && data.meals[0]) {
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: data.meals[0] }));
      } else {
        // Handle cases where the API returns null/empty
        console.warn(`No details found for MealDB ID ${mealDbId}`);
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: 'Details not found.' } }));
      }
    } catch (error) {
      // Store an error object in the cache
      console.error(`Error fetching details for MealDB ID ${mealDbId}:`, error);
      setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: error.message } }));
    } finally {
      // Always mark this specific recipe as finished loading
      setDetailLoading(prev => ({ ...prev, [internalRecipeId]: false }));
    }
  }, [detailedFavoriteData, detailLoading]); // Dependencies for useCallback

  // --- Handle Card Click (Expand/Collapse & Fetch Details) ---
  // Explanation:
  // This function runs when a user clicks on one of the `RecipeCard`s in the grid.
  // It sets the `expandedFavoriteId` state to the ID of the clicked card, which causes
  // the `ExpandedRecipeView` to render. If the card being clicked is *already* expanded,
  // it sets the ID to `null`, effectively closing the expanded view.
  // Crucially, if we're expanding a card *and* we don't already have its details (and aren't loading them),
  // it calls `fetchFavoriteDetails` to go get them from TheMealDB.
   const handleCardClick = (internalRecipeId, mealDbId) => {
     const isCurrentlyExpanded = expandedFavoriteId === internalRecipeId;
     const targetId = isCurrentlyExpanded ? null : internalRecipeId; // Toggle state
     setExpandedFavoriteId(targetId);

     // Fetch details only if expanding and needed
     if (targetId && mealDbId && !detailedFavoriteData[internalRecipeId] && !detailLoading[internalRecipeId]) {
       fetchFavoriteDetails(mealDbId, internalRecipeId);
     }
   };

   // --- Handle Remove Favorite ---
   // Explanation:
   // This function is triggered when the little trash can icon on a `RecipeCard` is clicked.
   // It first checks if a user is logged in. Then, it performs an "optimistic update":
   // it *immediately* removes the favorite from the local `favorites` state array, making the UI
   // feel responsive. If the removed card was the one currently expanded, it also closes the expanded view.
   // *After* updating the UI, it sends a request to Supabase to delete the corresponding record
   // from the 'Favorites List' table. If the Supabase deletion fails, it logs the error,
   // displays an error message to the user, and *reverts* the local state back to how it was before
   // the deletion attempt (puts the card back in the list). If successful, it also cleans up
   // the cached details and loading state for the removed favorite.
   const handleRemoveFavorite = async (internalRecipeIdToRemove) => {
     if (!user) return; // Safety check
     const originalFavorites = [...favorites]; // Backup for potential rollback

     // Optimistic UI update
     setFavorites(prev => prev.filter(fav => fav.recipe_id !== internalRecipeIdToRemove));
     if (expandedFavoriteId === internalRecipeIdToRemove) {
        setExpandedFavoriteId(null); // Close modal if removing the expanded item
     }

     // Attempt DB deletion
     try {
       const { error } = await supabase
         .from('Favorites List')
         .delete()
         .match({ userid: user.id, recipeid: internalRecipeIdToRemove }); // Match user and recipe

       if (error) {
         // Deletion failed: Log, show error, revert UI
         console.error('Error removing favorite:', error);
         setFetchError(`Failed to remove favorite: ${error.message}`);
         setFavorites(originalFavorites); // Put the item back
       } else {
         // Deletion successful: Log, clear error, clean up cache
         console.log(`Favorite ${internalRecipeIdToRemove} removed successfully.`);
         setFetchError(null); // Clear any previous error message
         // Clean up cached data for the removed item
         setDetailedFavoriteData(prev => {
           const updated = { ...prev };
           delete updated[internalRecipeIdToRemove];
           return updated;
         });
         setDetailLoading(prev => {
            const updated = { ...prev };
            delete updated[internalRecipeIdToRemove];
            return updated;
         });
       }
     } catch (err) {
       // Unexpected error during async operation: Log, show error, revert UI
       console.error('Unexpected error removing favorite:', err);
       setFetchError('An unexpected error occurred while removing the favorite.');
       setFavorites(originalFavorites); // Revert UI
     }
   };

   // --- Handle Close Expanded Card ---
   // Explanation:
   // A simple function, wrapped in `useCallback` for consistency, that just sets the
   // `expandedFavoriteId` state back to `null`. This is passed to the `ExpandedRecipeView`
   // component and is called when the user clicks the close button or the background overlay.
   const handleCloseCard = useCallback(() => {
       setExpandedFavoriteId(null);
   }, []); // No dependencies needed

  // --- Function to Fetch Details Sequentially ---
  // Explanation:
  // This function takes the list of basic favorite recipes (fetched from our DB)
  // and iterates through them one by one. For each favorite that has a `mealdb_id`
  // and whose details haven't been fetched yet (or aren't currently being fetched),
  // it calls `fetchFavoriteDetails`. The `await` keyword ensures that it waits for
  // one fetch to complete (or fail) before starting the next. This might be useful
  // to avoid overwhelming TheMealDB API if the user has many favorites.
  // It's wrapped in `useCallback` because it depends on `fetchFavoriteDetails`,
  // `detailedFavoriteData`, and `detailLoading`.
  const fetchFavoritesSequentially = useCallback(async (favoritesToFetch) => {
    console.log("Starting sequential fetch for", favoritesToFetch.length, "favorites");
    for (const fav of favoritesToFetch) {
      // Check conditions before fetching
      if (fav.mealdb_id && !detailedFavoriteData[fav.recipe_id] && !detailLoading[fav.recipe_id]) {
        console.log(`Fetching details for ${fav.recipe_name} (MealDB ID: ${fav.mealdb_id})`);
        // Awaiting ensures sequential fetching
        await fetchFavoriteDetails(fav.mealdb_id, fav.recipe_id);
      } else {
         console.log(`Skipping fetch for ${fav.recipe_name} (MealDB ID: ${fav.mealdb_id}) - already fetched, loading, or no ID`);
      }
    }
     console.log("Sequential fetch completed.");
  }, [fetchFavoriteDetails, detailedFavoriteData, detailLoading]); // Dependencies

  // --- Effect for Authentication Check and Initial Data Fetch ---
  // Explanation:
  // This `useEffect` hook runs once when the component first mounts (due to the `router`, `fetchFavoritesSequentially` dependency array).
  // Its main jobs are:
  // 1. Check if the user is logged in using Supabase Auth.
  // 2. If not logged in, redirect them to the '/login' page.
  // 3. If logged in, store the user info.
  // 4. Fetch the list of `recipeid`s the user has favorited from our 'Favorites List' table.
  // 5. Using those IDs, fetch basic recipe details ('RecipeID', 'RecipeName', 'mealdb_id') from our 'Recipe List' table.
  // 6. Store this list of basic favorite info in the `favorites` state.
  // 7. If favorites were found, trigger `fetchFavoritesSequentially` to get full details from TheMealDB (runs in background).
  // 8. Handle errors and update `fetchError`.
  // 9. Set `loading` state to `false` once initial list/error is processed.
  // 10. Includes a cleanup function to prevent state updates on unmounted components.
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkAndFetchFavorites = async () => {
      if (!isMounted) return; // Check if component is still mounted
      setLoading(true); // Start loading

      try {
        // 1. Check Auth Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return; // Check again after async call
        if (sessionError) throw new Error('Session fetch failed');
        if (!session) {
          // 2. Redirect if no session
          router.push('/login');
          return; // Stop execution here
        }
        // 3. Store User Info
        setUser(session.user);

        // 4. Fetch Favorite Links (recipe IDs)
        const { data: favoriteLinks, error: linkError } = await supabase
          .from('Favorites List')
          .select('recipeid')
          .eq('userid', session.user.id);

        if (!isMounted) return;
        if (linkError) throw new Error('Could not fetch your list of favorite recipes.');

        // Filter valid IDs
        const favoriteRecipeIds = favoriteLinks ? favoriteLinks.map(link => link.recipeid).filter(id => id != null) : [];

        if (favoriteRecipeIds.length > 0) {
          // 5. Fetch Basic Recipe Details (name, mealdb_id)
          const { data: recipeDetails, error: detailError } = await supabase
            .from('Recipe List')
            .select('"RecipeID", "RecipeName", mealdb_id') // Use quotes if column names have capitals
            .in('"RecipeID"', favoriteRecipeIds);

          if (!isMounted) return;
          if (detailError) throw new Error('Could not load details for your favorite recipes.');

          // 6. Map to state format
          const mappedFavorites = recipeDetails
            .map(detail => ({
              recipe_id: detail.RecipeID,
              recipe_name: detail.RecipeName,
              mealdb_id: detail.mealdb_id
            }))
            .filter(fav => fav.recipe_id != null); // Final filter for safety

          if (isMounted) {
            setFavorites(mappedFavorites || []); // Set the basic list
            setFetchError(null); // Clear any previous errors

            // 7. Trigger sequential fetch for full details (don't await)
            if (mappedFavorites.length > 0) {
               fetchFavoritesSequentially(mappedFavorites);
            }
          }
        } else {
           // No favorites found
           if (isMounted) {
             setFavorites([]); // Set empty list
             setFetchError(null); // Clear errors
           }
        }
      } catch (error) {
        // 8. Handle Errors
        console.error("Error in checkAndFetchFavorites:", error);
        if (isMounted) {
            // Avoid setting error if it was just a session fetch issue handled by redirect
            if (error.message !== 'Session fetch failed') {
                 setFetchError(error.message || 'An unexpected error occurred.');
            }
            setFavorites([]); // Clear favorites on error
        }
      } finally {
        // 9. Set loading to false
        if (isMounted) {
            setLoading(false);
        }
      }
    };

    checkAndFetchFavorites();

    // 10. Cleanup function
    return () => {
        isMounted = false;
        console.log("Favorites page unmounted");
    };
  // Dependencies: router and fetchFavoritesSequentially are used inside.
  }, [router, fetchFavoritesSequentially]);

  // --- JSX Rendering ---
  // Explanation:
  // This is what the user actually sees.
  // - It always renders the `Navbar`.
  // - Inside the `main` content area, it uses conditional rendering based on the state:
  //   - Shows "Loading favorites list..." if `loading` is true AND we haven't loaded any favorites yet.
  //   - Shows "Redirecting..." if `user` is null (after initial load attempt).
  //   - Shows an error message if `fetchError` has a value.
  //   - Shows "You haven't saved any..." if not loading, no error, and `favorites` array is empty.
  //   - Otherwise (if loading is done, no error, and favorites exist), it shows the title and maps over the `favorites` array, rendering a `RecipeCard` for each one. It passes down the necessary props, including the cached `details`, loading status, and the `handleCardClick` / `handleRemoveFavorite` functions.
  // - Finally, it uses `<AnimatePresence>` from Framer Motion. This component manages the mounting and unmounting animations. If `expandedFavoriteId` has a value (is not null), it renders the `ExpandedRecipeView` component inside the `AnimatePresence` tags, allowing it to animate in and out smoothly.
  return (
    <div className="min-h-screen bg-[#FFF1D5]">
      {/* Render Navbar immediately */}
      <Navbar userEmail={user?.email} />
      <main className="container mx-auto px-4 py-8">
        {/* Conditional rendering for loading state, error, or content */}
        {/* Initial loading state for the favorites list */}
        {loading && favorites.length === 0 ? (
          <div className="flex justify-center items-center pt-10">
            <p className="text-gray-600">Loading favorites list...</p>
          </div>
        /* Redirecting state (though useEffect handles actual redirect) */
        ) : !user && !loading ? (
           <div className="flex justify-center items-center pt-10">
             <p className="text-gray-600">Redirecting to login...</p>
           </div>
        /* Error state */
        ) : fetchError ? (
            // Render error message centrally if it's the primary state
           <>
            <h1 className="text-3xl font-bold text-red-600 mb-6">Error</h1>
            <p className="text-red-700 bg-red-100 p-4 rounded-md">Error: {fetchError}</p>
           </>
        /* No favorites state */
        ) : favorites.length === 0 ? (
          <>
            <h1 className="text-3xl font-bold text-[#9FB3DF] mb-6">Favorite Recipes</h1>
            <p className="text-gray-500">You haven&#39;t saved any favorite recipes yet.</p>
          </>
        /* Favorites loaded state */
        ) : (
          <>
            <h1 className="text-3xl font-bold text-[#9FB3DF] mb-6">Favorite Recipes</h1>
            {/* Grid for simple cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((fav) => (
                <RecipeCard
                  key={fav.recipe_id}
                  fav={fav}
                  details={detailedFavoriteData[fav.recipe_id]} // Pass cached details
                  isLoadingDetails={!!detailLoading[fav.recipe_id]} // Pass loading status for *this* card
                  onClick={() => handleCardClick(fav.recipe_id, fav.mealdb_id)} // Pass click handler
                  onRemove={handleRemoveFavorite} // Pass remove handler
                />
              ))}
            </div>
          </>
        )}

        {/* Overlay and Expanded View - Rendered outside the main content flow */}
        {/* Ensure user is loaded before potentially showing expanded view */}
        {user && (
            <AnimatePresence>
              {expandedFavoriteId && (
                <ExpandedRecipeView
                  key="expanded-view" // Add key for AnimatePresence
                  recipeId={expandedFavoriteId}
                  details={detailedFavoriteData[expandedFavoriteId]} // Details for the *specific* expanded recipe
                  isLoading={!!detailLoading[expandedFavoriteId]} // Loading status for the *specific* expanded recipe
                  onClose={handleCloseCard} // Pass close handler
                />
              )}
            </AnimatePresence>
        )}
      </main>
    </div>
  );
}