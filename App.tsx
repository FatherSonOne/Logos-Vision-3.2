import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Placeholder } from './components/Placeholder';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { mockClients, mockTeamMembers, mockProjects, mockActivities, mockChatRooms, mockChatMessages, mockDonations, mockVolunteers, mockCases, mockDocuments, mockWebpages, mockEvents, mockEmailCampaigns } from './data/mockData';
import { portalDbService } from './services/portalDbService';
import { performAdvancedSearch } from './services/geminiService';
// FIX: Rename imported 'Document' type to 'AppDocument' to avoid collision with global DOM type.
import type { Client, TeamMember, Project, EnrichedTask, Activity, ChatRoom, ChatMessage, Donation, Volunteer, Case, Document as AppDocument, Webpage, CaseComment, Event, PortalLayout, EmailCampaign, WebSearchResult, SearchResults } from './types';
import type { Page } from './types';
import { ClientList } from './components/ClientList';
import { OrganizationDetail } from './components/OrganizationDetail';
import { TeamMemberList } from './components/ConsultantList';
import { ActivityFeed } from './components/ActivityFeed';
import { ActivityDialog } from './components/ActivityDialog';
import { TeamChat } from './components/TeamChat';
import { CreateRoomDialog } from './components/CreateRoomDialog';
import { VideoConference } from './components/VideoConference';
import { AddTeamMemberDialog } from './components/AddTeamMemberDialog';
import { ContactList } from './components/ContactList';
import { AddContactDialog } from './components/AddContactDialog';
import { Donations } from './components/Donations';
import { CalendarView } from './components/CalendarView';
import { TaskView } from './components/TaskView';
import { FormGenerator } from './components/FormGenerator';
import { VolunteerList } from './components/VolunteerList';
import { AddVolunteerDialog } from './components/AddVolunteerDialog';
import { CharityTracker } from './components/CharityTracker';
import { CaseManagement } from './components/CaseManagement';
import { DocumentLibrary } from './components/DocumentLibrary';
import { WebManagement } from './components/WebManagement';
import { GoldPages } from './components/GoldPages';
import { WebpageStatus, DocumentCategory, ActivityType, ActivityStatus, CaseStatus } from './types';
import { AiChatBot } from './components/AiChatBot';
import { AiTools } from './components/AiTools';
import { LiveChat } from './components/LiveChat';
import { CaseDialog } from './components/CaseDialog';
import { SearchResultsPage } from './components/SearchResultsPage';
import { CaseDetail } from './components/CaseDetail';
import { EventEditor } from './components/EventEditor';
import { Reports } from './components/Reports';
import { PortalBuilder } from './components/PortalBuilder';
import { ClientPortalLogin } from './components/ClientPortalLogin';
import { ClientPortal } from './components/ClientPortal';
import { EmailCampaigns } from './components/EmailCampaigns';
import { GrantAssistant } from './components/GrantAssistant';
import { useToast } from './components/ui/Toast';
import { GuidedTour, TourStep } from './components/GuidedTour';
import { QuickAddButton, QuickAction } from './components/quickadd/QuickAddButton';
import { ClipboardListIcon, CaseIcon, BuildingIcon, SparklesIcon, FolderIcon, CalendarIcon, HandHeartIcon } from './components/icons';

const App: React.FC = () => {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activities, setActivities] = useState<Activity[]>(mockActivities.sort((a,b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()));
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(mockChatRooms);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [donations, setDonations] = useState<Donation[]>(mockDonations);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(mockVolunteers);
  const [cases, setCases] = useState<Case[]>(mockCases);
  // FIX: Use the renamed 'AppDocument' type for state.
  const [documents, setDocuments] = useState<AppDocument[]>(mockDocuments);
  const [webpages, setWebpages] = useState<Webpage[]>(mockWebpages);
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(mockEmailCampaigns);
  const [portalLayouts, setPortalLayouts] = useState<PortalLayout[]>([]);
  
  const [currentUserId, setCurrentUserId] = useState<string>('c1'); // Alice Johnson is logged in user

  const [openTabs, setOpenTabs] = useState<Page[]>(['dashboard']);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);

  // State for global search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  // State for Dialogs (centralized)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [isAddTeamMemberDialogOpen, setIsAddTeamMemberDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isAddVolunteerDialogOpen, setIsAddVolunteerDialogOpen] = useState(false);
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // State for Gold Pages editor
  const [isGoldPagesEditorOpen, setIsGoldPagesEditorOpen] = useState(false);
  const [editingWebpage, setEditingWebpage] = useState<Webpage | null>(null);
  
  // State for Notifications
  const [notifications, setNotifications] = useState<Set<Page>>(new Set());

  // State for Guided Tour
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  // State for Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  // Quick Add Actions Configuration
  const quickActions: QuickAction[] = useMemo(() => {
    // This is the full set of general-purpose quick actions
    const allActions: QuickAction[] = [
      {
        id: 'ai-chat',
        label: 'AI Assistant',
        icon: <SparklesIcon />,
        color: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300',
        onClick: () => setIsAiChatOpen(true)
      },
      {
        id: 'new-project',
        label: 'New Project',
        icon: <FolderIcon />,
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
        onClick: () => {
          showToast('Project creation coming soon!', 'info');
        },
      },
      {
        id: 'add-client',
        label: 'Add Organization',
        icon: <BuildingIcon />,
        color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300',
        onClick: () => {
          setIsAddContactDialogOpen(true);
        },
      },
      {
        id: 'schedule-meeting',
        label: 'Schedule Meeting',
        icon: <CalendarIcon />,
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300',
        onClick: () => {
          setEditingActivity({
            id: '',
            type: ActivityType.Meeting,
            title: '',
            status: ActivityStatus.Scheduled,
            activityDate: new Date().toISOString().split('T')[0],
            createdById: currentUserId,
          });
          setIsActivityDialogOpen(true);
        },
      },
      {
        id: 'log-activity',
        label: 'Log Activity',
        icon: <ClipboardListIcon />,
        color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300',
        onClick: () => {
          setEditingActivity(null);
          setIsActivityDialogOpen(true);
        },
      },
      {
        id: 'add-volunteer',
        label: 'Add Volunteer',
        icon: <HandHeartIcon />,
        color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-