import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from '../../types/ticket';
import TagBadge from '../common/TagBadge';
import { useTranslation } from 'react-i18next';

interface TagSelectorProps {
  ticketId: number;
  currentTags: Tag[];
}

const TagSelector: React.FC<TagSelectorProps> = ({ ticketId, currentTags }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags/');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tagIds: number[]) => {
      const response = await fetch(`/api/v1/tickets/${ticketId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      if (!response.ok) throw new Error('Failed to update tags');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const toggleTag = (tagId: number) => {
    const isSelected = currentTags.some(t => t.id === tagId);
    let newTagIds: number[];
    if (isSelected) {
      newTagIds = currentTags.filter(t => t.id !== tagId).map(t => t.id);
    } else {
      newTagIds = [...currentTags.map(t => t.id), tagId];
    }
    updateTagsMutation.mutate(newTagIds);
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
        {currentTags.map((tag) => (
          <TagBadge 
            key={tag.id} 
            tag={tag} 
            onRemove={() => toggleTag(tag.id)} 
          />
        ))}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none"
        >
          <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('common:tags.add', 'Add Tag')}
        </button>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="origin-top-right absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
            <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical">
              {allTags.length === 0 ? (
                <div className="px-4 py-2 text-xs text-gray-500">
                  {t('common:tags.no_tags', 'No tags available')}
                </div>
              ) : (
                allTags.map((tag) => {
                  const isSelected = currentTags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 ${
                        isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        ></span>
                        {tag.name}
                      </div>
                      {isSelected && (
                        <svg className="h-4 w-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
              <button 
                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                onClick={() => {
                  setIsOpen(false);
                  // Link to settings management would go here
                }}
              >
                {t('common:tags.manage', 'Manage tags')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TagSelector;
