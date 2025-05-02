import React, { useState } from 'react';

export default function ReportModal({ recipe, onClose, onSubmit }) {
  const [comment, setComment] = useState('');

  const handleReport = () => {
    onSubmit(recipe.idMeal, recipe.strMeal, comment);
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Recipe</h2>
        <p className="mb-2 text-gray-700">You are reporting: <strong>{recipe.strMeal}</strong></p>
        <textarea
          className="w-full border border-gray-300 rounded-md p-2 mb-4 text-black"
          rows={4}
          placeholder="Optional comment (e.g., why you're reporting this recipe)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleReport}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
