'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react'; // Import React for React.memo

// --- Memoized Recipe Card Component (Simplified for Grid Display) ---
const RecipeCard = React.memo(({ fav, details, isLoadingDetails, onClick, onRemove }) => {
  // Helper to get ingredients from details (only needed if showing preview on hover later)
  /* const getIngredientsList = (recipeData) => {
    if (!recipeData || recipeData.error) return [];
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipeData[`strIngredient${i}`];
      const measure = recipeData[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        // Keep original case from API for display
        ingredients.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`);
      } else {
        break;
      }
    }
    return ingredients;
  }; */
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
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out overflow-hidden cursor-pointer"
      onClick={onClick} // Trigger expansion
    >
      <div className="p-4">
        {imageUrl && (
          <img src={imageUrl} alt={fav.recipe_name} className="w-full h-40 object-cover rounded-md mb-3" />
        )}
        {showPlaceholder && (
          <div className="w-full h-40 bg-gray-200 rounded-md mb-3 flex items-center justify-center text-gray-400">
            {/* Placeholder */}
          </div>
        )}
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg text-gray-800 truncate mr-2 flex-1">{fav.recipe_name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when removing
              onRemove(fav.recipe_id);
            }}
            className="p-1 text-xs font-medium rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-300"
            title="Remove Favorite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        {!fav.mealdb_id && <p className="text-xs text-red-500 mt-1">Missing MealDB ID</p>}
      </div>
      {/* No expandable section directly inside the grid card anymore */}
    </motion.div>
  );
});
RecipeCard.displayName = 'RecipeCard';

// --- Expanded View Component (Overlay) ---
const ExpandedRecipeView = ({ recipeId, details, isLoading, onClose }) => {
  // Helper to get ingredients from details
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
      {/* Overlay */}
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
        <div className="relative flex-shrink-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 bg-gray-700 bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close recipe details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Image */}
          {details?.strMealThumb && !details.error && (
            <img src={details.strMealThumb} alt={details.strMeal} className="w-full h-64 object-cover" />
          )}
          {!details?.strMealThumb && !details?.error && !isLoading && (
            <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
              <span>Image not available</span>
            </div>
          )}
           {isLoading && (
            <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-5">
          <h2 className="text-3xl font-bold text-gray-900">{details?.strMeal || 'Loading...'}</h2>

          {isLoading && <p className="text-gray-600">Loading details...</p>}
          {details?.error && <p className="text-red-600 bg-red-50 p-3 rounded">Error loading details: {details.message}</p>}

          {!isLoading && details && !details.error && (
            <>
              <div>
                <h4 className="font-semibold text-xl text-gray-800 mb-2 border-b pb-1">Ingredients</h4>
                <ul className="list-disc list-inside text-base text-gray-700 space-y-1 pl-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {ingredientsList.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
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


export default function FavoritesPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]); // Holds { recipe_id, recipe_name, mealdb_id }
  const [fetchError, setFetchError] = useState(null);
  const [expandedFavoriteId, setExpandedFavoriteId] = useState(null); // Track expanded card (using internal recipe_id)
  const [detailedFavoriteData, setDetailedFavoriteData] = useState({}); // Cache for MealDB details { recipe_id: mealDbData }
  const [detailLoading, setDetailLoading] = useState({}); // Track loading state for details { recipe_id: boolean }
  const router = useRouter();

  // --- Fetch Full Recipe Details from MealDB ---
  const fetchFavoriteDetails = useCallback(async (mealDbId, internalRecipeId) => {
    // ... (fetch logic remains the same)
     if (!mealDbId || detailedFavoriteData[internalRecipeId] || detailLoading[internalRecipeId]) {
      return;
    }
    setDetailLoading(prev => ({ ...prev, [internalRecipeId]: true }));
    try {
      const detailUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealDbId}`;
      const response = await fetch(detailUrl);
      if (!response.ok) throw new Error(`Failed to fetch details: ${response.status}`);
      const data = await response.json();
      if (data.meals && data.meals[0]) {
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: data.meals[0] }));
      } else {
        console.warn(`No details found for MealDB ID ${mealDbId}`);
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: 'Details not found.' } }));
      }
    } catch (error) {
      console.error(`Error fetching details for MealDB ID ${mealDbId}:`, error);
      setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: error.message } }));
    } finally {
      setDetailLoading(prev => ({ ...prev, [internalRecipeId]: false }));
    }
  }, [detailedFavoriteData, detailLoading]);

  // --- Handle Card Click (Expand/Collapse & Fetch) ---
   const handleCardClick = (internalRecipeId, mealDbId) => {
     const isCurrentlyExpanded = expandedFavoriteId === internalRecipeId;
     const targetId = isCurrentlyExpanded ? null : internalRecipeId;
     setExpandedFavoriteId(targetId);

     // Fetch details only if expanding and needed
     if (targetId && mealDbId && !detailedFavoriteData[internalRecipeId] && !detailLoading[internalRecipeId]) {
       fetchFavoriteDetails(mealDbId, internalRecipeId);
     }
   };

   // --- Handle Remove Favorite ---
   const handleRemoveFavorite = async (internalRecipeIdToRemove) => {
    // ... (remove logic remains the same)
     if (!user) return;
     const originalFavorites = [...favorites];
     setFavorites(prev => prev.filter(fav => fav.recipe_id !== internalRecipeIdToRemove));
     if (expandedFavoriteId === internalRecipeIdToRemove) {
        setExpandedFavoriteId(null);
     }
     try {
       const { error } = await supabase
         .from('Favorites List')
         .delete()
         .match({ userid: user.id, recipeid: internalRecipeIdToRemove });
       if (error) {
         console.error('Error removing favorite:', error);
         setFetchError(`Failed to remove favorite: ${error.message}`);
         setFavorites(originalFavorites);
       } else {
         console.log(`Favorite ${internalRecipeIdToRemove} removed successfully.`);
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
       console.error('Unexpected error removing favorite:', err);
       setFetchError('An unexpected error occurred while removing the favorite.');
       setFavorites(originalFavorites);
     }
   };

   // --- Handle Close Expanded Card ---
   const handleCloseCard = useCallback(() => {
       setExpandedFavoriteId(null);
   }, []);


  useEffect(() => {
    // ... (fetch favorites logic remains the same)
    const checkAndFetchFavorites = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error('Session fetch failed');
        if (!session) {
          router.push('/login');
          return;
        }
        setUser(session.user);

        let favoriteRecipeIds = [];
        const { data: favoriteLinks, error: linkError } = await supabase
          .from('Favorites List')
          .select('recipeid')
          .eq('userid', session.user.id);
        if (linkError) throw new Error('Could not fetch your list of favorite recipes.');
        favoriteRecipeIds = favoriteLinks ? favoriteLinks.map(link => link.recipeid) : [];

        if (favoriteRecipeIds.length > 0) {
          const { data: recipeDetails, error: detailError } = await supabase
            .from('Recipe List')
            .select('"RecipeID", "RecipeName", mealdb_id')
            .in('"RecipeID"', favoriteRecipeIds);
          if (detailError) throw new Error('Could not load details for your favorite recipes.');

          const mappedFavorites = recipeDetails.map(detail => ({
            recipe_id: detail.RecipeID,
            recipe_name: detail.RecipeName,
            mealdb_id: detail.mealdb_id
          }));
          setFavorites(mappedFavorites || []);
          setFetchError(null);
        } else {
          setFavorites([]);
          setFetchError(null);
        }
      } catch (error) {
        if (error.message !== 'Session fetch failed') {
             setFetchError(error.message || 'An unexpected error occurred.');
        }
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    checkAndFetchFavorites();
  }, [router, fetchFavoriteDetails]); // Add fetchFavoriteDetails dependency back if needed, though likely stable with useCallback

  if (loading) {
    return <div>Loading favorites...</div>;
  }

  if (!user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar userEmail={user?.email} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Favorite Recipes</h1>

        {fetchError && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">Error: {fetchError}</p>}

        {favorites.length === 0 && !fetchError && (
          <p className="text-gray-500">You haven&apos;t saved any favorite recipes yet.</p>
        )}

        {/* Grid for simple cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((fav) => (
              <RecipeCard
                key={fav.recipe_id}
                fav={fav}
                // Pass only necessary props for grid display
                details={detailedFavoriteData[fav.recipe_id]} // Needed for image initially
                isLoadingDetails={detailLoading[fav.recipe_id]} // To show placeholder state
                onClick={() => handleCardClick(fav.recipe_id, fav.mealdb_id)}
                onRemove={handleRemoveFavorite}
              />
            ))}
        </div>

        {/* Overlay and Expanded View - Rendered outside the grid flow */}
        <AnimatePresence>
          {expandedFavoriteId && (
            <ExpandedRecipeView
              key="expanded-view" // Add key for AnimatePresence
              recipeId={expandedFavoriteId}
              details={detailedFavoriteData[expandedFavoriteId]}
              isLoading={detailLoading[expandedFavoriteId]}
              onClose={handleCloseCard}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
