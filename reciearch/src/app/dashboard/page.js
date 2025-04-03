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
  // const [expandedRecipeId, setExpandedRecipeId] = useState(null); // Remove old state
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [selectedRecipe, setSelectedRecipe] = useState(null); // State for the recipe in the modal
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        // Handle error appropriately, maybe redirect to an error page or login
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login'); // Redirect to login if no session
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
        return null; // Return null if fetch fails
      }
      const data = await response.json();
      return data.meals ? data.meals[0] : null; // Return the first meal object or null
    } catch (error) {
      console.warn(`Error fetching details for recipe ${recipeId}:`, error);
      return null; // Return null on error
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
        break; // Stop if ingredient is null or empty
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

    // Use the first 'include' ingredient for the initial API call
    const primaryIngredient = Array.from(includeSet)[0];
    const searchUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(primaryIngredient)}`;

    try {
      const initialResponse = await fetch(searchUrl);
      if (!initialResponse.ok) throw new Error(`Initial fetch failed: ${initialResponse.status}`);
      const initialData = await initialResponse.json();

      if (!initialData.meals) {
        setRecipes([]); // No initial matches
        setIsSearching(false);
        return;
      }

      // Fetch details for all initial results concurrently
      const detailPromises = initialData.meals.map(meal => fetchRecipeDetails(meal.idMeal));
      const detailedRecipes = (await Promise.all(detailPromises)).filter(Boolean); // Filter out null results

      // Perform client-side filtering
      const filteredRecipes = detailedRecipes.filter(recipe => {
        const recipeIngredients = getIngredientsFromRecipe(recipe);
        const recipeIngredientsSet = new Set(recipeIngredients);

        // Check exclusion criteria first
        for (const excludeIng of excludeSet) {
          if (recipeIngredientsSet.has(excludeIng)) {
            return false; // Exclude if it contains any excluded ingredient
          }
        }

        // Check inclusion criteria
        for (const includeIng of includeSet) {
          if (!recipeIngredientsSet.has(includeIng)) {
            return false; // Exclude if it's missing an included ingredient
          }
        }

        // Check "Only These Ingredients" mode if active
        if (onlyMode) {
           // Allow for common staples implicitly? Or strict match? Let's be strict for now.
           // Check if the recipe contains *any* ingredient NOT in the includeSet
           for (const recipeIng of recipeIngredientsSet) {
               if (!includeSet.has(recipeIng)) {
                   // Optional: Allow common staples like salt, pepper, water, oil?
                   // const commonStaples = new Set(['salt', 'pepper', 'water', 'oil', 'olive oil', 'sugar', 'flour']);
                   // if (!commonStaples.has(recipeIng)) {
                       return false; // Found an ingredient not in the 'include' list
                   // }
               }
           }
        }

        return true; // Recipe passes all checks
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

  // --- Save Recipe Logic (Updated for new schema) ---
  const handleSaveRecipe = async (mealDbRecipeId, mealDbRecipeName) => {
    // mealDbRecipeId is the ID from MealDB (string), mealDbRecipeName is the name
    if (!user) {
      console.error("User not logged in, cannot save recipe.");
      setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'error' })); // Use MealDB ID for status key
      return;
    }

    setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'saving' }));

    try {
      let internalRecipeId;

      // 1. Find or Create Recipe in 'Recipe List'
      // Check if recipe name already exists
      const { data: existingRecipe, error: findError } = await supabase
        .from('Recipe List')
        .select('"RecipeID"') // Select the internal ID, ensure correct quoting for case sensitivity
        .eq('"RecipeName"', mealDbRecipeName) // Ensure correct quoting
        .maybeSingle();

      if (findError) {
        console.error("Error checking Recipe List:", findError);
        throw new Error(`Failed to check Recipe List: ${findError.message}`);
      }

      if (existingRecipe) {
        internalRecipeId = existingRecipe.RecipeID; // Use existing internal ID
        console.log(`Recipe "${mealDbRecipeName}" found with internal ID: ${internalRecipeId}`);
      } else {
        // Insert into 'Recipe List' if not found
        console.log(`Recipe "${mealDbRecipeName}" not found, inserting...`);
        const { data: newRecipe, error: insertRecipeError } = await supabase
          .from('Recipe List')
          .insert([{ "RecipeName": mealDbRecipeName }]) // Ensure correct quoting
          .select('"RecipeID"') // Select the newly generated internal ID
          .single(); // Expecting a single row back

        if (insertRecipeError) {
          console.error("Error inserting into Recipe List:", insertRecipeError);
          throw new Error(`Failed to insert into Recipe List: ${insertRecipeError.message}`);
        }
        internalRecipeId = newRecipe.RecipeID;
        console.log(`Recipe "${mealDbRecipeName}" inserted with internal ID: ${internalRecipeId}`);
      }

      // 2. Insert into 'Favorites List' using internalRecipeId
      if (!internalRecipeId) {
         throw new Error("Failed to get internal RecipeID."); // Should not happen if logic above is correct
      }

      const { error: insertFavoriteError } = await supabase
        .from('Favorites List')
        .insert([{ userid: user.id, recipeid: internalRecipeId }]); // Use lowercase column names

      if (insertFavoriteError) {
        if (insertFavoriteError.code === '23505') { // Handle unique constraint violation (already favorited)
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
      setSaveStatus(prev => ({ ...prev, [mealDbRecipeId]: 'error' }));
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
    // Reset status after a short delay for visual feedback
    setTimeout(() => {
      setReportStatus(prev => ({ ...prev, [recipeId]: undefined }));
    }, 1500); // Reset after 1.5 seconds
  };


  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!user) {
    // This case should ideally be handled by the redirect,
    // but it's good practice to have a fallback.
    return <div>Redirecting to login...</div>;
  }

  // Animation variants for recipe cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: i => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05, // Stagger animation
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    }),
    exit: { opacity: 0, scale: 0.95 },
  };

  // --- Main Dashboard Content ---
  return (
    <div className="min-h-screen bg-gray-100">
       <Navbar userEmail={user?.email} /> {/* Add Navbar here */}
       <main className="container mx-auto px-4 py-8">
         {/* Header section moved below Navbar */}
         <div className="flex justify-between items-center mb-6 pt-4"> {/* Added padding top */}
            <h1 className="text-3xl font-bold text-gray-800">Recipe Search</h1>
         </div>
         <p className="mb-6 text-gray-600">Welcome, {user.email}! Find your next favorite recipe.</p>

         {/* Ingredient Search Component */}
         <IngredientSearch onSearch={handleSearch} />

         {/* Recipe Results Section */}
         <div className="mt-10">
           <h2 className="text-2xl font-semibold mb-4 text-gray-700">Search Results</h2>
           {isSearching && (
             <div className="flex justify-center items-center py-10">
               <p className="text-indigo-600">Searching for recipes...</p>
               {/* Optional: Add a spinner */}
             </div>
           )}
           {searchError && <p className="text-red-600 bg-red-100 p-3 rounded-md">Error: {searchError}</p>}

           {/* Animated Recipe Grid */}
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
             layout // Animate layout changes
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
                    className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" // Removed transform for parent, apply to inner content if needed
                  >
                    {/* Make the main content area clickable to open the modal */}
                    <div
                      className="cursor-pointer flex-grow" // Added flex-grow
                      onClick={() => handleOpenModal(recipe)} // Use new handler
                    >
                      <img src={recipe.strMealThumb} alt={recipe.strMeal} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-800">{recipe.strMeal}</h3>
                      </div>
                    </div>

                    {/* Action Buttons - Remain at the bottom */}
                    <div className="p-4 pt-2 border-t border-gray-100 mt-auto"> {/* Ensure buttons are at bottom */}
                       <div className="flex justify-end space-x-2">
                         <motion.button
                           whileTap={{ scale: 0.95 }}
                         onClick={() => handleSaveRecipe(recipe.idMeal, recipe.strMeal)}
                         className={`px-3 py-1 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${
                           saveStatus[recipe.idMeal] === 'saving' ? 'bg-gray-400 text-white cursor-not-allowed' :
                           saveStatus[recipe.idMeal] === 'saved' ? 'bg-green-600 text-white cursor-default' :
                           saveStatus[recipe.idMeal] === 'already_saved' ? 'bg-blue-500 text-white cursor-default' :
                           saveStatus[recipe.idMeal] === 'error' ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500' :
                           'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' // Default idle state
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
                          saveStatus[recipe.idMeal] === 'already_saved' ? 'Saved' : // Show 'Saved' if already present
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
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </motion.div>
         </div>
       </main>

       {/* Render Recipe Modal */}
       <RecipeModal recipe={selectedRecipe} onClose={handleCloseModal} />
    </div>
  );
}
