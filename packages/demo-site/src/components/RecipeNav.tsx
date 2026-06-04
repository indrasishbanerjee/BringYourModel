import React from 'react';
import { RECIPES } from '../examples/recipes';
import { CATEGORY_LABELS, type RecipeCategory } from '../examples/types';

const CATEGORY_ORDER: RecipeCategory[] = ['setup', 'text', 'structured', 'conversation'];

interface RecipeNavProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export const RecipeNav: React.FC<RecipeNavProps> = ({ activeId, onSelect }) => {
  return (
    <nav className="recipe-nav" aria-label="Recipes">
      {CATEGORY_ORDER.map((category) => {
        const items = RECIPES.filter((r) => r.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="recipe-nav-group">
            <h3>{CATEGORY_LABELS[category]}</h3>
            {items.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                data-testid={`recipe-nav-${recipe.id}`}
                className={activeId === recipe.id ? 'active' : ''}
                onClick={() => onSelect(recipe.id)}
              >
                {recipe.title}
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
};
