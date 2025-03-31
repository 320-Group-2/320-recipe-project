'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion

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
    if (!mealDbId || detailedFavoriteData[internalRecipeId] || detailLoading[internalRecipeId]) {
      return; // Don't fetch if no ID, already cached, or already loading
    }

    setDetailLoading(prev => ({ ...prev, [internalRecipeId]: true }));
    try {
      const detailUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealDbId}`;
      const response = await fetch(detailUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch details: ${response.status}`);
      }
      const data = await response.json();
      if (data.meals && data.meals[0]) {
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: data.meals[0] }));
      } else {
        // Handle case where MealDB ID is valid but returns no data (rare)
        console.warn(`No details found for MealDB ID ${mealDbId}`);
        setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: 'Details not found.' } }));
      }
    } catch (error) {
      console.error(`Error fetching details for MealDB ID ${mealDbId}:`, error);
      setDetailedFavoriteData(prev => ({ ...prev, [internalRecipeId]: { error: true, message: error.message } }));
    } finally {
      setDetailLoading(prev => ({ ...prev, [internalRecipeId]: false }));
    }
  }, [detailedFavoriteData, detailLoading]); // Dependencies for useCallback

  // --- Handle Card Click (Expand/Collapse & Fetch) ---
   const handleCardClick = (internalRecipeId, mealDbId) => {
     const isCurrentlyExpanded = expandedFavoriteId === internalRecipeId;
     setExpandedFavoriteId(isCurrentlyExpanded ? null : internalRecipeId);

     // Fetch details if expanding and not already cached/loading/error
     if (!isCurrentlyExpanded && mealDbId && !detailedFavoriteData[internalRecipeId] && !detailLoading[internalRecipeId]) {
       fetchFavoriteDetails(mealDbId, internalRecipeId);
     }
   };

   // --- Handle Remove Favorite ---
   const handleRemoveFavorite = async (internalRecipeIdToRemove) => {
     if (!user) return;

     // Optimistic UI update
     const originalFavorites = [...favorites];
     setFavorites(prev => prev.filter(fav => fav.recipe_id !== internalRecipeIdToRemove));
     if (expandedFavoriteId === internalRecipeIdToRemove) {
        setExpandedFavoriteId(null); // Collapse if it was expanded
     }


     try {
       const { error } = await supabase
         .from('Favorites List')
         .delete()
         .match({ userid: user.id, recipeid: internalRecipeIdToRemove });

       if (error) {
         console.error('Error removing favorite:', error);
         setFetchError(`Failed to remove favorite: ${error.message}`);
         // Revert optimistic update on error
         setFavorites(originalFavorites);
       } else {
         console.log(`Favorite ${internalRecipeIdToRemove} removed successfully.`);
         // Remove cached details if any
         setDetailedFavoriteData(prev => {
           const updated = { ...prev };
           delete updated[internalRecipeIdToRemove];
           return updated;
         });
         // Clear any specific loading state for this item
         setDetailLoading(prev => {
            const updated = { ...prev };
            delete updated[internalRecipeIdToRemove];
            return updated;
         });
       }
     } catch (err) {
       console.error('Unexpected error removing favorite:', err);
       setFetchError('An unexpected error occurred while removing the favorite.');
       setFavorites(originalFavorites); // Revert on unexpected error
     }
   };


  useEffect(() => {
    const checkAndFetchFavorites = async () => {
      try { // Wrap the entire sequence in a try block
        // 1. Check user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw new Error('Session fetch failed'); // Throw error to be caught below
        }
        if (!session) {
          router.push('/login');
          // No need to setLoading(false) here, finally will handle it if redirect happens
          return; // Exit early if no session
        }
        setUser(session.user);

        // 2. Fetch favorite recipe IDs for the logged-in user
        let favoriteRecipeIds = [];
        const { data: favoriteLinks, error: linkError } = await supabase
          .from('Favorites List')
          .select('recipeid')
          .eq('userid', session.user.id);

        if (linkError) {
          console.error('Detailed error fetching favorite links:', linkError);
          throw new Error('Could not fetch your list of favorite recipes.');
        }
        favoriteRecipeIds = favoriteLinks ? favoriteLinks.map(link => link.recipeid) : [];

        // 3. Fetch recipe details (including mealdb_id) from 'Recipe List' using the IDs
        if (favoriteRecipeIds.length > 0) {
          const { data: recipeDetails, error: detailError } = await supabase
            .from('Recipe List')
            .select('"RecipeID", "RecipeName", mealdb_id') // Fetch mealdb_id
            .in('"RecipeID"', favoriteRecipeIds);

          if (detailError) {
            console.error('Detailed error fetching recipe details:', detailError);
            throw new Error('Could not load details for your favorite recipes.');
          }

          // Map to include mealdb_id
          const mappedFavorites = recipeDetails.map(detail => ({
            recipe_id: detail.RecipeID, // Internal Supabase ID
            recipe_name: detail.RecipeName,
            mealdb_id: detail.mealdb_id // MealDB ID (e.g., "52772")
          }));
          setFavorites(mappedFavorites || []);
          setFetchError(null);
        } else {
          // No favorite IDs found
          setFavorites([]);
          setFetchError(null);
        }
      } catch (error) {
        // Catch any error from the try block (session, link fetch, detail fetch)
        // Only set fetchError if it's not a redirect scenario
        if (error.message !== 'Session fetch failed') { // Avoid showing error on redirect
             setFetchError(error.message || 'An unexpected error occurred.');
        }
        setFavorites([]); // Clear favorites on any error
        // If session check failed and redirected, user state won't be set
        // If other errors occurred, user state might be set, but data fetch failed
      } finally {
        // This will always run, ensuring loading state is turned off
        setLoading(false);
      }
    };

    checkAndFetchFavorites();
  }, [router]); // Removed fetchFavoriteDetails from dependency array as it's stable due to useCallback

  if (loading) {
    // Optional: Add a more sophisticated loading state within the layout
    return <div>Loading favorites...</div>;
  }

  if (!user) {
    // Should be handled by redirect, but good fallback
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

        {/* Animated Favorites Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence initial={false}> {/* Disable initial animation for existing items */}
            {favorites.map((fav) => {
              const isExpanded = expandedFavoriteId === fav.recipe_id;
              const details = detailedFavoriteData[fav.recipe_id];
              const isLoadingDetails = detailLoading[fav.recipe_id];

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
                <motion.div
                  key={fav.recipe_id} // Use internal ID for key
                  layout // Enable layout animation
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer ${isExpanded ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => handleCardClick(fav.recipe_id, fav.mealdb_id)}
                >
                  {/* Always visible part */}
                  <div className="p-4">
                    {details?.strMealThumb && !details.error && (
                       <img src={details.strMealThumb} alt={fav.recipe_name} className="w-full h-40 object-cover rounded mb-3" />
                    )}
                    {!details?.strMealThumb && !details?.error && !isLoadingDetails && (
                        <div className="w-full h-40 bg-gray-200 rounded mb-3 flex items-center justify-center text-gray-400">
                            {/* Placeholder or fetch image on expand */}
                            <span>(Click to load image)</span>
                        </div>
                    )}
                    <h3 className="font-semibold text-lg text-gray-800 truncate">{fav.recipe_name}</h3>
                    {!fav.mealdb_id && <p className="text-xs text-red-500 mt-1">Missing MealDB ID - cannot load details.</p>}
                  </div>

                  {/* Expandable Section */}
                  <AnimatePresence>
                    {isExpanded && fav.mealdb_id && (
                      <motion.div
                        key="details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking inside details
                      >
                        <div className="p-4 space-y-3">
                          {isLoadingDetails && <p className="text-sm text-gray-500">Loading details...</p>}
                          {details?.error && <p className="text-sm text-red-500">Error loading details: {details.message}</p>}
                          {!isLoadingDetails && details && !details.error && (
                            <>
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-1">Key Ingredients:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5 pl-2">
                                  {ingredientsList.slice(0, 5).map((ing, i) => <li key={i}>{ing}</li>)}
                                  {ingredientsList.length > 5 && <li className="text-xs text-gray-400">...and more</li>}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-1">Quick Steps:</h4>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {details.strInstructions || 'No instructions available.'}
                                </p>
                              </div>
                              <div className="flex justify-end space-x-2 pt-2">
                                 {/* Add Share button later if needed */}
                                <button
                                  onClick={() => handleRemoveFavorite(fav.recipe_id)}
                                  className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  Remove Favorite
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
