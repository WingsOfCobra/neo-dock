/* ── TodoList – task list with create/toggle (db + file sources) ── */

import { useState, useCallback, type FormEvent } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post, patch, del } from '@/lib/api';
import type { TodoItem, ChefTodoCreated } from '@/types';

interface TodoListProps {
  compact?: boolean;
}

export function TodoList({ compact = false }: TodoListProps) {
  const rawTodos = useMetricsStore((s) => s.todos);
  const todoTotal = useMetricsStore((s) => s.todoTotal);
  const todos = Array.isArray(rawTodos) ? rawTodos : [];
  const setTodos = useMetricsStore((s) => s.setTodos);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const title = newTitle.trim();
      if (!title || submitting) return;

      setSubmitting(true);
      try {
        const created = await post<ChefTodoCreated>('/chef/todo', { title });
        if (created) {
          setTodos([
            ...todos,
            {
              id: created.id ?? 0,
              title: created.title ?? title,
              description: created.description,
              completed: created.completed === 1,
              source: 'db',
              createdAt: created.created_at,
              updatedAt: created.updated_at,
            },
          ]);
        }
        setNewTitle('');
      } catch {
        // Silent fail — will refresh via next poll
      } finally {
        setSubmitting(false);
      }
    },
    [newTitle, submitting, todos, setTodos],
  );

  const handleToggle = useCallback(
    async (todo: TodoItem) => {
      if (todo.source === 'file') return; // File-based todos can't be toggled via API
      const newCompleted = !todo.completed;
      setTodos(
        todos.map((t) =>
          t.id === todo.id && t.source === todo.source
            ? { ...t, completed: newCompleted }
            : t,
        ),
      );

      try {
        await patch(`/chef/todo/${todo.id}`, {
          completed: newCompleted,
        });
      } catch {
        setTodos(
          todos.map((t) =>
            t.id === todo.id && t.source === todo.source
              ? { ...t, completed: todo.completed }
              : t,
          ),
        );
      }
    },
    [todos, setTodos],
  );

  const handleDelete = useCallback(
    async (todo: TodoItem) => {
      if (todo.source === 'file') return; // File-based todos can't be deleted
      setDeleteConfirm(null);
      setTodos(todos.filter((t) => !(t.id === todo.id && t.source === 'db')));
      try {
        await del(`/chef/todo/${todo.id}`);
      } catch {
        // Revert on failure — next poll will fix state
      }
    },
    [todos, setTodos],
  );

  const dbTodos = todos.filter((t) => t.source === 'db');
  const fileTodos = todos.filter((t) => t.source === 'file');
  const incomplete = dbTodos.filter((t) => !t.completed);
  const completed = dbTodos.filter((t) => t.completed);
  const incompleteFile = fileTodos.filter((t) => !t.completed);
  const completedFile = fileTodos.filter((t) => t.completed);

  return (
    <Card title="Todo">
      <div className={`space-y-3 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {/* Summary */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-neo-red">{incomplete.length + incompleteFile.length} pending</span>
          <span className="text-neo-text-disabled">{todoTotal} total</span>
          {fileTodos.length > 0 && (
            <span className="text-neo-text-disabled">({fileTodos.length} from file)</span>
          )}
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task..."
            className="flex-1 bg-neo-bg-deep border border-neo-border px-2 py-1.5 text-xs font-mono text-neo-text-primary placeholder:text-neo-text-disabled focus:border-neo-red focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !newTitle.trim()}
            className="px-3 py-1.5 text-[10px] uppercase font-mono border border-neo-red text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30"
          >
            +ADD
          </button>
        </form>

        {/* Incomplete (db) */}
        <div className="space-y-0.5">
          {incomplete.map((todo) => (
            <TodoItemRow
              key={`db-${todo.id}`}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
            />
          ))}
        </div>

        {/* Incomplete (file) */}
        {incompleteFile.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled font-mono">
              From {incompleteFile[0]?.fileSource ?? 'file'}
            </p>
            {incompleteFile.map((todo) => (
              <TodoItemRow
                key={`file-${todo.id}`}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
              />
            ))}
          </div>
        )}

        {/* Completed */}
        {(completed.length > 0 || completedFile.length > 0) && (
          <div className="border-t border-neo-border pt-2">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled mb-1 font-mono">
              Completed ({completed.length + completedFile.length})
            </p>
            <div className="space-y-0.5 opacity-50">
              {(compact ? completed.slice(0, 5) : completed).map((todo) => (
                <TodoItemRow
                  key={`db-${todo.id}`}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  deleteConfirm={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                />
              ))}
              {(compact ? completedFile.slice(0, 3) : completedFile).map((todo) => (
                <TodoItemRow
                  key={`file-${todo.id}`}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  deleteConfirm={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                />
              ))}
            </div>
          </div>
        )}

        {todos.length === 0 && (
          <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
            No tasks yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function TodoItemRow({
  todo,
  onToggle,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
}: {
  todo: TodoItem;
  onToggle: (todo: TodoItem) => void;
  onDelete: (todo: TodoItem) => void;
  deleteConfirm: number | null;
  setDeleteConfirm: (id: number | null) => void;
}) {
  const isFile = todo.source === 'file';
  const isConfirming = deleteConfirm === todo.id && !isFile;

  return (
    <div className="group flex items-center gap-1">
      <button
        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left hover:bg-neo-red/5 transition-colors"
        onClick={() => onToggle(todo)}
        disabled={isFile}
      >
        <span
          className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
            todo.completed
              ? 'border-neo-red bg-neo-red/20'
              : isFile
                ? 'border-neo-border'
                : 'border-neo-border group-hover:border-neo-red/50'
          }`}
        >
          {todo.completed && (
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#FF0033" strokeWidth="2" />
            </svg>
          )}
        </span>
        <span
          className={`text-xs font-mono flex-1 ${
            todo.completed
              ? 'text-neo-text-disabled line-through'
              : 'text-neo-text-primary'
          }`}
        >
          {todo.title}
        </span>
        {isFile && (
          <span className="text-[8px] font-mono text-neo-text-disabled uppercase px-1 border border-neo-border/40">
            file
          </span>
        )}
        {todo.description && (
          <span className="text-[9px] font-mono text-neo-text-disabled truncate max-w-[100px]">
            {todo.description}
          </span>
        )}
      </button>

      {/* Delete button (db only) */}
      {!isFile && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {isConfirming ? (
            <button
              onClick={() => onDelete(todo)}
              className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-neo-red text-neo-red hover:bg-neo-red/20 transition-colors"
            >
              DEL?
            </button>
          ) : (
            <button
              onClick={() => setDeleteConfirm(todo.id)}
              className="px-1.5 py-0.5 text-[9px] font-mono uppercase text-neo-text-disabled hover:text-neo-red transition-colors"
            >
              X
            </button>
          )}
        </div>
      )}
    </div>
  );
}
