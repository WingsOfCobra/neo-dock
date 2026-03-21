/* ── TodoList – task list with create/toggle ────────────────── */

import { useState, useCallback, type FormEvent } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post, patch } from '@/lib/api';
import type { Todo } from '@/types';

export function TodoList() {
  const rawTodos = useMetricsStore((s) => s.todos);
  const todos = Array.isArray(rawTodos) ? rawTodos : [];
  const setTodos = useMetricsStore((s) => s.setTodos);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const title = newTitle.trim();
      if (!title || submitting) return;

      setSubmitting(true);
      try {
        const created = await post<Todo>('/chef/todo', { title });
        setTodos([...todos, created]);
        setNewTitle('');
      } catch {
        // Silent fail
      } finally {
        setSubmitting(false);
      }
    },
    [newTitle, submitting, todos, setTodos],
  );

  const handleToggle = useCallback(
    async (todo: Todo) => {
      const newCompleted = !todo.completed;
      // Optimistic update
      setTodos(
        todos.map((t) =>
          t.id === todo.id ? { ...t, completed: newCompleted } : t,
        ),
      );

      try {
        await patch(`/chef/todo/${todo.id}`, {
          completed: newCompleted,
        });
      } catch {
        // Revert on failure
        setTodos(
          todos.map((t) =>
            t.id === todo.id ? { ...t, completed: todo.completed } : t,
          ),
        );
      }
    },
    [todos, setTodos],
  );

  const incomplete = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <Card title="Todo" glowColor="cyan">
      <div className="space-y-3">
        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task..."
            className="flex-1 bg-neo-bg-deep border border-neo-border px-2 py-1.5 text-xs font-mono text-neo-text-primary placeholder:text-neo-text-disabled focus:border-neo-cyan focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !newTitle.trim()}
            className="px-3 py-1.5 text-[10px] uppercase font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </form>

        {/* Incomplete */}
        <div className="space-y-0.5">
          {incomplete.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
          ))}
        </div>

        {/* Completed (collapsed) */}
        {completed.length > 0 && (
          <div className="border-t border-neo-border pt-2">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled mb-1">
              Completed ({completed.length})
            </p>
            <div className="space-y-0.5 opacity-50">
              {completed.slice(0, 5).map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
              ))}
            </div>
          </div>
        )}

        {todos.length === 0 && (
          <p className="text-xs text-neo-text-disabled text-center py-4">
            No tasks yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function TodoItem({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-neo-bg-elevated/50 transition-colors group"
      onClick={() => onToggle(todo)}
    >
      <span
        className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
          todo.completed
            ? 'border-neo-cyan bg-neo-cyan/20'
            : 'border-neo-border group-hover:border-neo-cyan/50'
        }`}
      >
        {todo.completed && (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#55EAD4" strokeWidth="2" />
          </svg>
        )}
      </span>
      <span
        className={`text-xs ${
          todo.completed
            ? 'text-neo-text-disabled line-through'
            : 'text-neo-text-primary'
        }`}
      >
        {todo.title}
      </span>
    </button>
  );
}
