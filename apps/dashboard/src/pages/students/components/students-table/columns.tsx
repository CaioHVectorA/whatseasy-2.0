import { Checkbox } from '@/components/ui/checkbox';
import { Contact } from '@/constants/data';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export const columns: ColumnDef<Contact>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecione todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecione uma linha"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: 'NOME'
  },
  {
    accessorKey: 'phone',
    header: 'NÚMERO',
    cell: ({ getValue }) => {
      const phone = getValue() as string;
      const [showPhone, setShowPhone] = useState(false);

      return (
        <div className="flex items-center">
          <span className=' min-w-56'>{showPhone ? phone : '••••••••••'}</span>
          <button
            type="button"
            onClick={() => setShowPhone(!showPhone)}
            className="ml-2"
            aria-label="Toggle phone visibility"
          >
            {showPhone ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'CRIADO EM',
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString()
  },
  {
    accessorKey: 'clusterName',
    header: 'CLUSTER'
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
