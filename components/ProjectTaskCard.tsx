
import React, { memo } from 'react';
import { ProjectTask, User } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';

interface ProjectTaskCardProps {
  task: ProjectTask;
  columnId: string;
  isBeingDragged: boolean;
  isPatron: boolean;
  currentUser: User;
  allUsers: User[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  onAssignTask: (taskId: string, assigneeId: string | undefined) => void;
  onToggleTaskCompletion: (taskId: string, currentStatus: boolean) => void;
  onEditTask: (task: ProjectTask) => void;
}

const DRAGGING_CLASSES = ['opacity-75', 'ring-2', 'ring-pink-500', 'rotate-3', 'scale-105', 'shadow-2xl'];

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    if (priority === 'HIGH') colorClass = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    if (priority === 'MEDIUM') colorClass = "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    if (priority === 'LOW') colorClass = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";

    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${colorClass}`}>
            {priority}
        </span>
    );
};

const ProjectTaskCard: React.FC<ProjectTaskCardProps> = (props) => {
    const { 
        task, columnId, isBeingDragged, isPatron, currentUser, allUsers, 
        onDragStart, onDeleteTask, onAssignTask, onToggleTaskCompletion, onEditTask
    } = props;

  const assignee = task.assigneeId ? allUsers.find(u => u.uid === task.assigneeId) : null;
  const approvedMembers = allUsers.filter(u => u.status === 'APPROVED');
  const isCompleted = task.isCompleted;

  // Determine if due date is passed
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && !isCompleted : false;

  // Allow completion toggling if user is a Patron OR the assigned user
  const canToggleCompletion = isPatron || (task.assigneeId === currentUser.uid);

  return (
    <div
      draggable={isPatron}
      onDragStart={isPatron ? (e) => {
        DRAGGING_CLASSES.forEach(c => e.currentTarget.classList.add(c));
        onDragStart(e, task.id, columnId);
      } : undefined}
      onDragEnd={isPatron ? (e) => {
        DRAGGING_CLASSES.forEach(c => e.currentTarget.classList.remove(c));
      } : undefined}
      onClick={() => isPatron && onEditTask(task)} // Click to edit
      data-task-id={task.id}
      data-dragging={isBeingDragged}
      className={`bg-white dark:bg-gray-800 p-4 rounded-md border transform transition-all shadow-sm relative group ${
          isPatron ? 'cursor-grab hover:border-pink-300 dark:hover:border-pink-700' : ''
      } ${
          isBeingDragged ? 'opacity-40' : ''
      } ${
          isCompleted 
            ? 'border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' 
            : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Priority & Edit Hint */}
      <div className="flex justify-between items-center mb-2">
          <PriorityBadge priority={task.priority} />
          {isPatron && <PencilIcon className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>

      <div className="flex items-start gap-3">
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 canToggleCompletion && onToggleTaskCompletion(task.id, !!isCompleted);
             }}
             disabled={!canToggleCompletion}
             className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                 isCompleted 
                 ? 'bg-green-500 border-green-500 text-white' 
                 : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-transparent hover:border-green-400'
             } ${!canToggleCompletion ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
          >
              <CheckIcon />
          </button>
          <p className={`text-gray-800 dark:text-gray-200 mb-1 flex-grow text-sm font-medium ${isCompleted ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>
              {task.content}
          </p>
      </div>

      {/* Metadata Row: Due Date & Tags */}
      {(task.dueDate || (task.tags && task.tags.length > 0)) && (
          <div className="mt-2 pl-8 flex flex-wrap gap-2">
              {task.dueDate && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isOverdue ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400'}`}>
                      📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
              )}
              {task.tags?.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                      #{tag}
                  </span>
              ))}
          </div>
      )}

      <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center min-w-0" onClick={e => e.stopPropagation()}>
            {assignee ? (
                <>
                    <img
                        src={assignee.avatarUrl || `https://i.pravatar.cc/24?u=${assignee.username}`}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                        title={`Assigned to ${assignee.name}`}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate hidden sm:inline">{assignee.name}</span>
                </>
            ) : (
                <div className="flex items-center" title="Unassigned">
                    <div className="w-6 h-6 rounded-full mr-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
        {isPatron && (
            <div className="flex items-center space-x-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                 <select
                    value={task.assigneeId || ''}
                    onChange={(e) => onAssignTask(task.id, e.target.value ? e.target.value : undefined)}
                    className="text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50 h-6"
                 >
                    <option value="">Assign</option>
                    {approvedMembers.map(user => (
                        <option key={user.uid} value={user.uid}>{user.name}</option>
                    ))}
                 </select>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id, columnId);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" 
                    aria-label="Delete task"
                >
                    <TrashIcon />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default memo(ProjectTaskCard);
