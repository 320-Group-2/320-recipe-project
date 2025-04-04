'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion

export default function IngredientSearch({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [onlyMode, setOnlyMode] = useState(false); // State for "Only These Ingredients" mode

  // Fetch all ingredients from MealDB on component mount
  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoadingIngredients(true);
      try {
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list');
        const data = await response.json();
        if (data.meals) {
          // Extract just the ingredient names
          setAllIngredients(data.meals.map(meal => meal.strIngredient));
        } else {
          setAllIngredients([]); // Handle case where API returns no meals
        }
      } catch (error) {
        console.error("Failed to fetch ingredients:", error);
        setAllIngredients([]); // Set empty on error
        // TODO: Add user feedback for API error
      } finally {
        setIsLoadingIngredients(false);
      }
    };
    fetchIngredients();
  }, []);

  // --- Autocomplete Logic (Client-side filtering) ---
  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setIsLoadingSuggestions(true); // Show loading briefly while filtering

    if (value.length > 1 && allIngredients.length > 0) {
      const filteredSuggestions = allIngredients
        .filter(ingredient =>
          ingredient.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 10); // Limit suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
    setIsLoadingSuggestions(false); // Filtering is fast, hide loading
  };

  // --- Ingredient Selection Logic ---
  const handleSelectSuggestion = (ingredient) => {
    if (!selectedIngredients.find(item => item.name === ingredient)) {
      // Add ingredient with default 'include' status
      setSelectedIngredients([...selectedIngredients, { name: ingredient, mode: 'include' }]);
    }
    setSearchTerm(''); // Clear input after selection
    setSuggestions([]); // Clear suggestions
  };

  const handleRemoveIngredient = (ingredientName) => {
    setSelectedIngredients(selectedIngredients.filter(item => item.name !== ingredientName));
  };

  const handleToggleMode = (ingredientName) => {
    setSelectedIngredients(selectedIngredients.map(item =>
      item.name === ingredientName
        ? { ...item, mode: item.mode === 'include' ? 'exclude' : 'include' }
        : item
    ));
  };

  // --- Trigger Search ---
  const handleSearchClick = () => {
    // Pass the selected ingredients list and the mode to the parent component
    if (onSearch) {
      onSearch(selectedIngredients, onlyMode); // Pass onlyMode state
    }
  };

  // Animation variants for list items
  const listItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
      {isLoadingIngredients ? (
        <div className="flex justify-center items-center h-20">
          <p className="text-gray-500">Loading ingredients...</p>
          {/* Add a spinner here if desired */}
        </div>
      ) : (
        <>
          <label htmlFor="ingredient-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search & Select Ingredients
          </label>
          <div className="relative mb-4">
            <input
              type="text"
              id="ingredient-search"
              value={searchTerm}
              onChange={handleInputChange}
              placeholder="e.g., chicken, onion, garlic"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
              autoComplete="off"
            />
            {/* Autocomplete Suggestions Dropdown w/ Animation */}
            <AnimatePresence>
              {(isLoadingSuggestions || suggestions.length > 0) && (
                <motion.ul
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                >
                  {isLoadingSuggestions && <li className="px-3 py-2 text-sm text-gray-500">Loading...</li>}
                  {!isLoadingSuggestions && suggestions.map((suggestion) => (
                    <li
                      key={suggestion} // Use ingredient name as key if unique
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="px-4 py-2 cursor-pointer hover:bg-indigo-50 transition duration-150 ease-in-out"
                    >
                      {suggestion}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* Selected Ingredients List w/ Animation */}
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2 text-gray-800">Selected Ingredients:</h3>
            {selectedIngredients.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No ingredients selected yet.</p>
            ) : (
              <motion.ul layout className="space-y-2">
                <AnimatePresence>
                  {selectedIngredients.map((ingredient) => (
                    <motion.li
                      key={ingredient.name}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout // Enable layout animation
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50 shadow-sm"
                    >
                      <span className="text-gray-700">{ingredient.name}</span>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleMode(ingredient.name)}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-150 ease-in-out ${
                            ingredient.mode === 'include'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {ingredient.mode === 'include' ? 'Include' : 'Exclude'}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveIngredient(ingredient.name)}
                          className="text-gray-400 hover:text-red-600 transition-colors duration-150 ease-in-out"
                          title="Remove"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </motion.button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>

          {/* Search Options */}
          <div className="flex items-center justify-between mt-4">
             {/* "Only These Ingredients" Checkbox */}
             <div className="flex items-center">
                <input
                  id="only-mode-checkbox"
                  type="checkbox"
                  checked={onlyMode}
                  onChange={(e) => setOnlyMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="only-mode-checkbox" className="ml-2 block text-sm text-gray-700">
                  Find recipes with *only* these ingredients
                </label>
              </div>

            {/* Search Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSearchClick}
              className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
              disabled={selectedIngredients.length === 0 || isLoadingSuggestions}
            >
              Search Recipes
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
