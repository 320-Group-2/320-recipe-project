'use client';

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import IngredientSearch from '../components/IngredientSearch';
import Navbar from '../components/Navbar';
import RecipeModal from '../components/RecipeModal'; // Import RecipeModal
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]); // Holds the detailed recipe objects after filtering
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({});
  const [reportStatus, setReportStatus] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [selectedRecipe, setSelectedRecipe] = useState(null); // State for the recipe in the modal
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  // --- Helper function to fetch full recipe details ---
  const fetchRecipeDetails = async (recipeId) => {
    try {
      const detailUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipeId}`;
      const response = await fetch(detailUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch details for recipe ${recipeId}: ${response.status}`);
        return null;
      }
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.warn(`Error fetching details for recipe ${recipeId}:`, error);
      return null;
    }
  };

  // --- Helper function to extract ingredients from a recipe object ---
  const getIngredientsFromRecipe = (recipe) => {
    const ingredients = [];
    if (!recipe) return ingredients;
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredients.push(ingredient.trim().toLowerCase());
      } else {
        break;
      }
    }
    return ingredients;
  };


  // --- Updated Recipe Search Logic ---
  const handleSearch = async (selectedIngredients, onlyMode) => {
    console.log("Search triggered with:", selectedIngredients, "Only mode:", onlyMode);
    setIsSearching(true);
    setSearchError(null);
    setRecipes([]);

    const includeSet = new Set(
      selectedIngredients
        .filter(ing => ing.mode === 'include')
        .map(ing => ing.name.trim().toLowerCase())
    );
    const excludeSet = new Set(
      selectedIngredients
        .filter(ing => ing.mode === 'exclude')
        .map(ing => ing.name.trim().toLowerCase())
    );

    if (includeSet.size === 0) {
      setSearchError("Please select at least one ingredient to include.");
      setIsSearching(false);
      return;
    }

    const primaryIngredient = Array.from(includeSet)[0];
    const searchUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(primaryIngredient)}`;

    try {
      const initialResponse = await fetch(searchUrl);
      if (!initialResponse.ok) throw new Error(`Initial fetch failed: ${initialResponse.status}`);
      const initialData = await initialResponse.json();

      if (!initialData.meals) {
        setRecipes([]);
        setIsSearching(false);
        return;
      }

      const detailPromises = initialData.meals.map(meal => fetchRecipeDetails(meal.idMeal));
      const detailedRecipes = (await Promise.all(detailPromises)).filter(Boolean);

      const filteredRecipes = detailedRecipes.filter(recipe => {
        const recipeIngredients = getIngredientsFromRecipe(recipe);
        const recipeIngredientsSet = new Set(recipeIngredients);

        for (const excludeIng of excludeSet) {
          if (recipeIngredientsSet.has(excludeIng)) return false;
        }
        for (const includeIng of includeSet) {
          if (!recipeIngredientsSet.has(includeIng)) return false;
        }
        if (onlyMode) {
           for (const recipeIng of recipeIngredientsSet) {
               if (!includeSet.has(recipeIng)) return false;
           }
        }
        return true;
      });

      setRecipes(filteredRecipes);

    } catch (error) {
      console.error("Failed to fetch or filter recipes:", error);
      setSearchError(`Failed to process recipes. ${error.message}`);
      setRecipes([]);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Save Recipe Logic (Corrected for mealdb_id array type) ---
  const handleSaveRecipe = async (mealDbRecipeId, mealDbRecipeName) => {
    if (!user) {
      console.error("User not logged in, cannot save recipe.");
      setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'error' }));
      return;
    }

    setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'saving' }));

    // mealDbRecipeId is already a string, pass it directly


    try {
      let internalRecipeId;

      // 1. Find or Create/Update Recipe in 'Recipe List'
      const { data: existingRecipe, error: findError } = await supabase
        .from('Recipe List')
        .select('"RecipeID", mealdb_id')
        .eq('"RecipeName"', mealDbRecipeName)
        .maybeSingle();

      if (findError) {
        console.error("Error checking Recipe List:", findError);
        throw new Error(`Failed to check Recipe List: ${findError.message}`);
      }

      if (existingRecipe) {
        internalRecipeId = existingRecipe.RecipeID;
        console.log(`Recipe "${mealDbRecipeName}" found with internal ID: ${internalRecipeId}`);
        // Update mealdb_id only if it's currently null and we have a new ID
        if (!existingRecipe.mealdb_id && mealDbRecipeId) { // Use mealDbRecipeId directly
          console.log(`Updating existing recipe ${internalRecipeId} with mealdb_id: ${mealDbRecipeId}`);
          const { error: updateError } = await supabase
            .from('Recipe List')
            .update({ mealdb_id: mealDbRecipeId }) // Pass the string directly
            .eq('"RecipeID"', internalRecipeId);
          if (updateError) {
            console.error(`Error updating mealdb_id for RecipeID ${internalRecipeId}:`, updateError);
            console.warn(`Could not update mealdb_id for existing recipe. Favoriting might proceed without it.`);
          }
        }
      } else {
        // Insert new recipe, including the mealdb_id string
        console.log(`Recipe "${mealDbRecipeName}" not found, inserting with mealdb_id: ${mealDbRecipeId}...`);
        const { data: newRecipe, error: insertRecipeError } = await supabase
          .from('Recipe List')
          .insert([{ "RecipeName": mealDbRecipeName, mealdb_id: mealDbRecipeId }]) // Pass the string directly
          .select('"RecipeID"')
          .single();

        if (insertRecipeError) {
          // Log the specific Supabase error
          console.error("Error inserting into Recipe List:", insertRecipeError);
          // Provide a more informative error message
          throw new Error(`Failed to insert into Recipe List: ${insertRecipeError.message || 'Unknown error'}`);
        }
        internalRecipeId = newRecipe.RecipeID;
        console.log(`Recipe "${mealDbRecipeName}" inserted with internal ID: ${internalRecipeId} and mealdb_id: ${mealDbRecipeId}`); // Log the string ID
      }

      // 2. Insert into 'Favorites List' using internalRecipeId
      if (!internalRecipeId) {
         console.error("Failed to obtain internal RecipeID before favoriting.");
         throw new Error("Failed to get internal RecipeID.");
      }

      const { error: insertFavoriteError } = await supabase
        .from('Favorites List')
        .insert([{ userid: user.id, recipeid: internalRecipeId }]);

      if (insertFavoriteError) {
        if (insertFavoriteError.code === '23505') {
          console.warn(`Favorite link for user ${user.id} and recipe ${internalRecipeId} already exists.`);
          setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'already_saved' }));
        } else {
          console.error("Error inserting into Favorites List:", insertFavoriteError);
          throw new Error(`Failed to insert into Favorites List: ${insertFavoriteError.message}`);
        }
      } else {
        console.log(`Favorite link created for user ${user.id} and recipe ${internalRecipeId} (${mealDbRecipeName})`);
        setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'saved' }));
      }

    } catch (error) {
      console.error("Detailed error in handleSaveRecipe:", error);
      // Ensure the specific error message is displayed if available
      setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'error', message: error.message || 'An unexpected error occurred' }));
    }
  };

  // --- Open Modal Logic ---
  const handleOpenModal = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  // --- Close Modal Logic ---
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
  };

  // --- Report Recipe Logic ---
  const handleReportRecipe = (recipeId, recipeName) => {
    console.log(`Reporting recipe: ID=${recipeId}, Name=${recipeName}`);
    setReportStatus(prev => ({ ...prev, [recipeId]: 'reported' }));
    setTimeout(() => {
      setReportStatus(prev => ({ ...prev, [recipeId]: undefined }));
    }, 1500);
  };


  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Redirecting to login...</div>;
  }

  // Animation variants for recipe cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: i => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    }),
    exit: { opacity: 0, scale: 0.95 },
  };

  // --- Main Dashboard Content ---
  return (
    <div className="min-h-screen bg-[#FFF1D5]">
       <Navbar userEmail={user?.email} />
       <main className="container mx-auto px-4 py-8">
         <div className="flex justify-between items-center mb-6 pt-4">
            <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-300 to-purple-300">Recipe Search</h1>
         </div>
         <p className="mb-6 text-gray-600">Welcome, {user.email}! Find your next favorite recipe.</p>

         <IngredientSearch onSearch={handleSearch} />

         <div className="mt-10">
           <h2 className="text-2xl font-semibold mb-4 text-gray-700">Search Results</h2>
           {isSearching && (
             <div className="flex justify-center items-center py-10">
               <p className="text-indigo-600">Searching for recipes...</p>
             </div>
           )}
           {searchError && <p className="text-red-600 bg-red-100 p-3 rounded-md">Error: {searchError}</p>}

           <AnimatePresence>
             {!isSearching && !searchError && recipes.length === 0 && (
               <motion.p
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="text-center text-gray-500 py-10"
               >
                 No recipes found matching your criteria. Try adjusting your ingredients.
               </motion.p>
             )}
           </AnimatePresence>

           <motion.div
             layout
             className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
           >
             <AnimatePresence>
               {recipes.map((recipe, index) => (
                 <motion.div
                   key={recipe.idMeal}
                   variants={cardVariants}
                   initial="hidden"
                   animate="visible"
                    exit="exit"
                    custom={index}
                    layout
                    className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col"
                  >
                    <div
                      className="cursor-pointer flex-grow"
                      onClick={() => handleOpenModal(recipe)}
                    >
                      <img src={recipe.strMealThumb} alt={recipe.strMeal} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-800">{recipe.strMeal}</h3>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-gray-100 mt-auto">
                       <div className="flex justify-end space-x-2">
                         <motion.button
                           whileTap={{ scale: 0.95 }}
                         onClick={() => handleSaveRecipe(recipe.idMeal, recipe.strMeal)}
                         className={`px-3 py-1 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${
                           saveStatus[recipe.idMeal] === 'saving' ? 'bg-gray-400 text-white cursor-not-allowed' :
                           saveStatus[recipe.idMeal] === 'saved' ? 'bg-green-600 text-white cursor-default' :
                           saveStatus[recipe.idMeal] === 'already_saved' ? 'bg-blue-500 text-white cursor-default' :
                           saveStatus[recipe.idMeal] === 'error' ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500' :
                           'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
                         }`}
                         title={
                            saveStatus[recipe.idMeal] === 'saved' ? 'Saved!' :
                            saveStatus[recipe.idMeal] === 'already_saved' ? 'Already Saved' :
                            'Save Recipe'
                         }
                         disabled={saveStatus[recipe.idMeal] === 'saving' || saveStatus[recipe.idMeal] === 'saved' || saveStatus[recipe.idMeal] === 'already_saved'}
                       >
                         {saveStatus[recipe.idMeal] === 'saving' ? 'Saving...' :
                          saveStatus[recipe.idMeal] === 'saved' ? 'Saved ✓' :
                          saveStatus[recipe.idMeal] === 'already_saved' ? 'Saved' :
                          saveStatus[recipe.idMeal] === 'error' ? 'Error!' :
                          'Save'}
                       </motion.button>
                       <motion.button
                         whileTap={{ scale: 0.95 }}
                         onClick={() => handleReportRecipe(recipe.idMeal, recipe.strMeal)}
                         className={`px-3 py-1 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${
                            reportStatus[recipe.idMeal] === 'reported' ? 'bg-orange-500 text-white cursor-default' :
                            'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500'
                         }`}
                         title="Report Recipe"
                         disabled={reportStatus[recipe.idMeal] === 'reported'}
                       >
                         {reportStatus[recipe.idMeal] === 'reported' ? 'Reported!' : 'Report'}
                       </motion.button>
                     </div>
                     {/* Display specific error message for save action */}
                     {saveStatus[recipe.idMeal] === 'error' && saveStatus[recipe.idMeal]?.message && (
                       <p className="text-xs text-red-500 mt-1 text-right">{saveStatus[recipe.idMeal].message}</p>
                     )}
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </motion.div>
         </div>
       </main>

       <RecipeModal recipe={selectedRecipe} onClose={handleCloseModal} />
    </div>
  );
}
