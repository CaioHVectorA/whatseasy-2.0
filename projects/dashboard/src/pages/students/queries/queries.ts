import { getStudents } from '@/lib/api/get-students';
import { useQuery } from '@tanstack/react-query';

export const useGetStudents = (offset, pageLimit, country) => {
  return useQuery({
    queryKey: ['students', offset, pageLimit, country],
    queryFn: async () => getStudents(offset, pageLimit, country)
  });
};
