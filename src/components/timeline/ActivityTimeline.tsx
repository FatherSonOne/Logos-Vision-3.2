import React, { useState } from 'react';
import {
  Clock,
  Filter,
  ChevronDown,
  Calendar,
  Phone,
  Mail,
  Users,
  FileText,
  DollarSign,
  CheckCircle2,
  MessageSquare,
  Video,
  AlertCircle
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface TimelineEvent {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task' | 'note' | 'file' | 'payment' | 'milestone' | 'message';
  title: string;
  description: string;
  timestamp: Date;
  user: { name: string; avatar?: string };
  metadata?: any;
  status?: 'completed' | 'scheduled' | 'cancelled';
}

// ============================================
// ACTIVITY TIMELINE
// ============================================

interface ActivityTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  groupByDate?: boolean;
  showFilter?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  onEventClick,
  groupByDate = true,
  showFilter = true,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call':
        return (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <Phone className="w-4 h-4" />
          </div>
        );
      case 'meeting':
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <Users className="w-4 h-4" />
          </div>
        );
      case 'email':
        return (
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
            <Mail className="w-4 h-4" />
          </div>
        );
      case 'task':
        return (
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'note':
        return (
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'file':
        return (
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'payment':
        return (
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
            <DollarSign className="w-4 h-4" />
          </div>
        );
      case 'milestone':
        return (
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'message':
        return (
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
            <Clock className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const groupEventsByDate = (events: TimelineEvent[]) => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    
    events.forEach(event => {
      const date = event.timestamp.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });

    return groups;
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const groupedEvents = groupByDate ? groupEventsByDate(filteredEvents) : { 'All': filteredEvents };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status as keyof typeof colors] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {showFilter && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Activity Timeline
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          {['all', 'call', 'meeting', 'email', 'task', 'note', 'file', 'payment', 'milestone', 'message'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            {groupByDate && (
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-3">
                  {date}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            )}

            <div className="space-y-3">
              {dateEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="relative flex gap-4 cursor-pointer group"
                >
                  {/* Timeline Line */}
                  {index < dateEvents.length - 1 && (
                    <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0 relative z-10">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {event.title}
                          </h4>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {event.description}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        {event.user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{event.user.name}</span>
                      {event.metadata?.duration && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span>{event.metadata.duration}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No activities found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {filter !== 'all' ? 'Try adjusting your filter' : 'Activities will appear here'}
          </p>
        </div>
      )}
    </div>
  );
};
