'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface CoreTaskTemplate {
  id: string;
  task_name: string;
  display_order: number;
  is_active: boolean;
}

export default function CoreTasksSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<CoreTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/core-task-templates');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching core tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (task: CoreTaskTemplate) => {
    try {
      const updates = tasks.map(t =>
        t.id === task.id
          ? { id: t.id, task_name: t.task_name, display_order: t.display_order, is_active: !t.is_active }
          : { id: t.id, task_name: t.task_name, display_order: t.display_order, is_active: t.is_active }
      );

      const response = await fetch('/api/core-task-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updates })
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      alert('Failed to update task status');
    }
  };

  const handleStartEdit = (task: CoreTaskTemplate) => {
    setEditingId(task.id);
    setEditingName(task.task_name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (taskId: string) => {
    try {
      const updates = tasks.map(t =>
        t.id === taskId
          ? { id: t.id, task_name: editingName, display_order: t.display_order, is_active: t.is_active }
          : { id: t.id, task_name: t.task_name, display_order: t.display_order, is_active: t.is_active }
      );

      const response = await fetch('/api/core-task-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updates })
      });

      if (response.ok) {
        await fetchTasks();
        setEditingId(null);
        setEditingName('');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task name');
    }
  };

  const handleMoveUp = async (task: CoreTaskTemplate) => {
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    if (currentIndex <= 0) return;

    const newTasks = [...tasks];
    [newTasks[currentIndex - 1], newTasks[currentIndex]] = [newTasks[currentIndex], newTasks[currentIndex - 1]];

    const updates = newTasks.map((t, index) => ({
      id: t.id,
      task_name: t.task_name,
      display_order: index,
      is_active: t.is_active
    }));

    try {
      const response = await fetch('/api/core-task-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updates })
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      alert('Failed to reorder tasks');
    }
  };

  const handleMoveDown = async (task: CoreTaskTemplate) => {
    const currentIndex = tasks.findIndex(t => t.id === task.id);
    if (currentIndex >= tasks.length - 1) return;

    const newTasks = [...tasks];
    [newTasks[currentIndex], newTasks[currentIndex + 1]] = [newTasks[currentIndex + 1], newTasks[currentIndex]];

    const updates = newTasks.map((t, index) => ({
      id: t.id,
      task_name: t.task_name,
      display_order: index,
      is_active: t.is_active
    }));

    try {
      const response = await fetch('/api/core-task-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updates })
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      alert('Failed to reorder tasks');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      alert('Please enter a task name');
      return;
    }

    try {
      const response = await fetch('/api/core-task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: newTaskName,
          display_order: tasks.length,
          is_active: true
        })
      });

      if (response.ok) {
        await fetchTasks();
        setNewTaskName('');
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading core tasks...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/${tenantSubdomain}/settings`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Settings
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <CheckCircle2 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Core Event Tasks
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize the checklist tasks that appear on every event detail page
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Add Task Form */}
          {showAddForm && isAdmin && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Core Task</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-task-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name
                  </label>
                  <input
                    id="new-task-name"
                    name="new-task-name"
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                    placeholder="e.g., Equipment Packed"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTaskName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Core tasks are displayed horizontally at the top of every event detail page.
              Users can check off tasks as they complete them. When all tasks are complete, the event is marked as
              <strong className="text-green-700"> "Ready for Event"</strong>. Use the arrows to reorder tasks.
            </p>
          </div>

          {/* Core Tasks List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Readiness Checklist</h2>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No core tasks configured</p>
              ) : (
                tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm font-medium text-gray-500 w-8">
                        #{index + 1}
                      </span>
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                        />
                      ) : (
                        <span className={`font-medium ${task.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                          {task.task_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {editingId === task.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(task.id)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-700"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleMoveUp(task)}
                                disabled={index === 0}
                                className={`p-1 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-700'}`}
                                title="Move Up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(task)}
                                disabled={index === tasks.length - 1}
                                className={`p-1 ${index === tasks.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-700'}`}
                                title="Move Down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(task)}
                                className="p-1"
                                title={task.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {task.is_active ? (
                                  <ToggleRight className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              <button
                                onClick={() => handleStartEdit(task)}
                                className="p-1 text-gray-600 hover:text-gray-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only administrators can add, edit, or reorder core tasks.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
