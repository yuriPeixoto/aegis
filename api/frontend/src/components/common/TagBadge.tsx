import React from 'react';
import { Tag } from '../../types/ticket';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, className = '' }) => {
  // Determine if text color should be white or black based on background color brightness
  // Simple heuristic: if hex starts with # and we can parse it
  const isLight = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const textColor = isLight(tag.color) ? 'text-gray-900' : 'text-white';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor} ${className}`}
      style={{ backgroundColor: tag.color }}
      title={tag.description || tag.name}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`ml-1 inline-flex items-center p-0.5 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none`}
        >
          <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 1" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default TagBadge;
