import { Fragment } from 'react';
import type { Category } from './categoryManagerTypes';

type CategoryTreeTableProps = {
  categories: Category[];
  loading: boolean;
  parents: Category[];
  childrenByParent: Map<number, Category[]>;
  orphanChildren: Category[];
  parentNameMap: Map<number, string>;
  expandedParents: number[];
  onToggleExpanded: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, newStatus: boolean) => void;
};

const StatusPill = ({ active }: { active: boolean }) => (
  <span
    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
      active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-600'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

const CategoryRow = ({
  category,
  level,
  parentName: _parentName, // eslint-disable-line @typescript-eslint/no-unused-vars
  loading,
  childrenByParent,
  expandedParents,
  onToggleExpanded,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  category: Category;
  level: number;
  parentName: string | null;
  loading: boolean;
  childrenByParent: Map<number, Category[]>;
  expandedParents: number[];
  onToggleExpanded: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, newStatus: boolean) => void;
}) => {
  const children = childrenByParent.get(category.id) ?? [];
  const showToggle = children.length > 0;
  const isExpanded = expandedParents.includes(category.id);
  const paddingLeft = level === 0 ? '1rem' : `${1 + level * 2}rem`;

  // Styling berbeda untuk parent dan child
  const rowBgClass = level === 0 
    ? 'bg-white hover:bg-blue-50' 
    : 'bg-blue-50/40 hover:bg-blue-50';
  
  const nameFontClass = level === 0 
    ? 'font-bold text-gray-900' 
    : 'font-medium text-gray-700';

  return (
    <Fragment>
      <tr className={rowBgClass}>
        <td className="py-3 pr-4" style={{ paddingLeft }}>
          <div className="flex items-center gap-2">
            {/* Icon indentasi untuk sub-category */}
            {level > 0 && <span className="text-blue-400 text-sm">↳</span>}
            
            {/* Tombol expand/collapse untuk parent dengan children */}
            {showToggle ? (
              <button
                type="button"
                onClick={() => onToggleExpanded(category.id)}
                className="flex items-center justify-center rounded-md bg-blue-100 font-bold text-blue-700 hover:bg-blue-200 transition-colors h-6 w-6 text-sm"
                title={isExpanded ? 'Click to collapse' : 'Click to expand'}
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span className="inline-block h-6 w-6" />
            )}
            
            {/* Category name */}
            <span className={nameFontClass}>
              {category.name}
              {showToggle && (
                <span className="ml-2 text-xs text-gray-500">
                  ({children.length} sub)
                </span>
              )}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-600">{category.slug}</td>
        <td className="px-4 py-3">
          <StatusPill active={category.is_active} />
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={loading}
            className="mr-2 rounded bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(category.id, !category.is_active)}
            disabled={loading}
            className={`mr-2 rounded px-3 py-1 text-xs font-bold disabled:opacity-50 transition-colors ${
              category.is_active
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {category.is_active ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            disabled={loading}
            className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </td>
      </tr>
      {isExpanded &&
        children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            level={level + 1}
            parentName={category.name}
            loading={loading}
            childrenByParent={childrenByParent}
            expandedParents={expandedParents}
            onToggleExpanded={onToggleExpanded}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
          />
        ))}
    </Fragment>
  );
};

export function CategoryTreeTable({
  categories,
  loading,
  parents,
  childrenByParent,
  orphanChildren,
  parentNameMap: _parentNameMap, // eslint-disable-line @typescript-eslint/no-unused-vars
  expandedParents,
  onToggleExpanded,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryTreeTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
        <thead className="border-b-2 border-gray-200 bg-gray-100 text-xs uppercase text-gray-700">
          <tr>
            <th className="px-4 py-3 font-bold">Category Name</th>
            <th className="px-4 py-3 font-bold">Slug</th>
            <th className="px-4 py-3 font-bold">Status</th>
            <th className="px-4 py-3 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading && categories.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                Loading categories...
              </td>
            </tr>
          ) : categories.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                No categories found. Create your first one above.
              </td>
            </tr>
          ) : (
            <>
              {parents.map((parent) => (
                <CategoryRow
                  key={parent.id}
                  category={parent}
                  level={0}
                  parentName={null}
                  loading={loading}
                  childrenByParent={childrenByParent}
                  expandedParents={expandedParents}
                  onToggleExpanded={onToggleExpanded}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                />
              ))}

              {orphanChildren.map((child) => (
                <tr key={child.id} className="bg-amber-50 hover:bg-amber-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-sm">⚠</span>
                      <span className="font-medium text-amber-900">
                        {child.name}
                        <span className="ml-2 text-xs text-amber-600">(orphaned - missing parent)</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{child.slug}</td>
                  <td className="px-4 py-3">
                    <StatusPill active={child.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(child)}
                      disabled={loading}
                      className="mr-2 rounded bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(child.id, !child.is_active)}
                      disabled={loading}
                      className={`mr-2 rounded px-3 py-1 text-xs font-bold disabled:opacity-50 transition-colors ${
                        child.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {child.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(child.id)}
                      disabled={loading}
                      className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
