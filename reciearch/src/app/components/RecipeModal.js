'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image'; // Keep if using Next Image, otherwise use <img>
import { useClickOutside } from '../hooks/useClickOutside'; // Corrected: Use named import

// Define the component function ONCE
export default function RecipeModal({ recipe, onClose }) {
  const modalRef = useRef(null);

  // Use our custom hook to close on click outside.
  useClickOutside(modalRef, onClose);

  if (!recipe) {
    return null; // Don't render if no recipe is provided
  }

  // Helper to extract ingredients and measures cleanly
  const getIngredientsList = (recipeData) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipeData[`strIngredient${i}`];
      const measure = recipeData[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredients.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`);
      } else {
        break; // Stop if no more ingredients
      }
    }
    return ingredients;
  };

  const ingredientsList = getIngredientsList(recipe);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black bg-opacity-60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          ref={modalRef}
          key="modal"
          className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          {/* Close Button - Corrected Structure */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal Content */}
          <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
            {/* Image Section */}
            <div className="md:w-1/2 flex-shrink-0">
              {/* Using standard <img> tag for simplicity, ensure recipe.strMealThumb is a valid URL */}
              <img
                src={recipe.strMealThumb}
                alt={recipe.strMeal}
                className="w-full h-64 md:h-full object-cover md:rounded-l-xl" // Adjusted rounding
                // If using Next Image, uncomment below and ensure proper setup
                // width={500} // Provide appropriate width
                // height={500} // Provide appropriate height
              />
            </div>

            {/* Details Section (Scrollable) */}
            <div className="p-6 md:w-1/2 space-y-4 overflow-y-auto flex-grow">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {recipe.strMeal}
              </h2>
              <div className="flex space-x-4 text-sm text-gray-500 mb-4">
                <span>Category: {recipe.strCategory}</span>
                <span>Area: {recipe.strArea}</span>
                {/* Add Difficulty/Time if available in your data */}
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800">Ingredients:</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                  {/* Correctly placed ingredient mapping */}
                  {ingredientsList.map((item, index) => (
                    <li key={`ingredient-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">Instructions:</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {recipe.strInstructions}
                </p>
              </div>

              {/* Nutritional Info (if available) */}
              {/* Example:
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">Nutrition (Approx.):</h3>
                <p className="text-sm text-gray-700">Calories: ...</p>
              </div>
              */}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Define PropTypes correctly AFTER the component definition
RecipeModal.propTypes = {
  recipe: PropTypes.shape({
    strMealThumb: PropTypes.string,
    strMeal: PropTypes.string,
    strCategory: PropTypes.string,
    strArea: PropTypes.string,
    strInstructions: PropTypes.string,
    // Add dynamic prop types for ingredients/measures if strictly needed,
    // but often checking for their existence in the loop is sufficient.
    // Example (less common):
    // ...[...Array(20)].reduce((acc, _, i) => {
    //   acc[`strIngredient${i + 1}`] = PropTypes.string;
    //   acc[`strMeasure${i + 1}`] = PropTypes.string;
    //   return acc;
    // }, {})
  }), // Changed isRequired to allow null initially before selection
  onClose: PropTypes.func.isRequired,
};
