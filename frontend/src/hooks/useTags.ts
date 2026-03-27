import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Tag } from '../types/ticket';

export interface TagCreate {
  name: string;
  color: string;
  description?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
  description?: string;
}

export function useTags() {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/tags');
      return data;
    },
  });

  const createTag = useMutation({
    mutationFn: async (tagIn: TagCreate) => {
      const { data } = await api.post('/tags', tagIn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, tagIn }: { id: number; tagIn: TagUpdate }) => {
      const { data } = await api.patch(`/tags/${id}`, tagIn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}
