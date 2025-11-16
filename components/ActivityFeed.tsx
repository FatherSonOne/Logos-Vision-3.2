import React, { useState, useMemo } from 'react';
import type { Activity, Client, Project, TeamMember } from '../types';
import { ActivityType } from '../types';
import { ExportButton, type ExportField } from './export/ExportButton';
import { PlusIcon, PhoneIcon, MailIcon, UsersIcon, DocumentTextIcon, PencilIcon, TrashIcon } from './icons';

interface ActivityFeedProps {
    activities: Activity[];
    projects: Project[];
    clients: Client[];
    teamMembers: TeamMember[];
    onLogActivity: () => void;
    onEdit: (activity: Activity) => void;
    onDelete: (activityId: string) => void;
}

const ActivityTypeIcon: React.FC<{ type: ActivityType }> = ({ type }) => {
    const icons: Record<ActivityType, React.ReactNode> = {
        [ActivityType.Call]: <PhoneIcon />,
        [ActivityType.Email]: <MailIcon />,
        [ActivityType.Meeting]: <UsersIcon />,
        [ActivityType.Note]: <DocumentTextIcon />
    }
    return <div className="h-10 w-10 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center text-slate-500 flex-shrink-0 dark:text-slate-400 shadow-inner">{icons[type] || <DocumentTextIcon />}</div>
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, projects, clients, teamMembers, onLogActivity, onEdit, onDelete }) => {
    const [typeFilter, setTypeFilter] = useState('all');
    const [memberFilter, setMemberFilter] = useState('all');
    
    const findName = (id: string | undefined | null, type: 'client' | 'project' | 'teamMember') => {
        if (!id) return '';
        switch(type) {
            case 'client': return clients.find(c => c.id === id)?.name;
            case 'project': return projects.find(p => p.id === id)?.name;
            case 'teamMember': return teamMembers.find(m => m.id === id)?.name;
            default: return '';
        }
    }

    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            const typeMatch = typeFilter === 'all' || activity.type === typeFilter;
            const memberMatch = memberFilter === 'all' || activity.createdById === memberFilter;
            return typeMatch && memberMatch;
        });
    }, [activities, typeFilter, memberFilter]);

    const exportFields: ExportField[] = [
      { key: 'title', label: 'Activity' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { 
        key: 'activityDate', 
        label: 'Date',
        format: (date) => new Date(date).toLocaleDateString()
      },
      {
        key: 'clientId',
        label: 'Client',
        format: (id) => clients.find(c => c.id === id)?.name || ''
      },
    ];

    return (
        <div className="text-shadow-strong">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Activity Feed</h2>
                  <p className="text-slate-600 mt-1 dark:text-slate-300">A chronological log of all team and client interactions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton
                      data={filteredActivities}
                      fields={exportFields}
                      filename="activities"
                      label="Export Activities"
                    />
                    <button 
                        onClick={onLogActivity}
                        className="flex items-center bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md"
                    >
                        <PlusIcon />
                        Log Activity
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl rounded-lg border border-white/20 shadow-lg">
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                >
                    <option value="all">All Types</option>
                    {Object.values(ActivityType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                >
                    <option value="all">All Team Members</option>
                    {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </select>
            </div>

            <div className="space-y-6">
                {filteredActivities.map(activity => (
                    <div key={activity.id} className="flex space-x-4">
                        <ActivityTypeIcon type={activity.type} />
                        <div 
                            onClick={() => onEdit(activity)}
                            className="flex-1 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-lg border border-white/20 group relative cursor-pointer hover:border-white/40 dark:hover:border-white/20 transition-colors"
                        >
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(activity); }} title="Edit Activity" className="p-1.5 text-slate-500 hover:bg-white/50 rounded-md dark:text-slate-400 dark:hover:bg-black/20">
                                    <PencilIcon />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }} title="Delete Activity" className="p-1.5 text-slate-500 hover:bg-white/50 rounded-md dark:text-slate-400 dark:hover:bg-black/20">
                                    <TrashIcon />
                                </button>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{activity.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Logged by {findName(activity.createdById, 'teamMember')} on {new Date(activity.activityDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${activity.status === 'Completed' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                                    {activity.status}
                                </span>
                            </div>

                            {activity.notes && (
                                <p className="text-sm text-slate-600 mt-3 border-l-2 border-slate-200 pl-3 whitespace-pre-wrap dark:text-slate-300 dark:border-slate-600">{activity.notes}</p>
                            )}

                            <div className="text-xs text-slate-500 mt-3 flex flex-wrap gap-x-4 gap-y-1 dark:text-slate-400">
                                {activity.clientId && <span>Client: <span className="font-medium text-teal-600 dark:text-teal-400">{findName(activity.clientId, 'client')}</span></span>}
                                {activity.projectId && <span>Project: <span className="font-medium text-teal-600 dark:text-teal-400">{findName(activity.projectId, 'project')}</span></span>}
                            </div>
                        </div>
                    </div>
                ))}
                 {filteredActivities.length === 0 && (
                    <div className="text-center p-12 bg-white/30 dark:bg-black/20 backdrop-blur-xl rounded-lg border border-dashed border-white/20 text-slate-500 dark:text-slate-400">
                        <p className="font-semibold">No activities found</p>
                        <p className="text-sm">Try adjusting your filters or logging a new activity.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
