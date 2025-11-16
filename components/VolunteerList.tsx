import React, { useState, useMemo, useEffect } from 'react';
import type { Volunteer, Client, Project, TeamMember } from '../types';
import { VolunteersMap } from './VolunteersMap';
import { MailIcon, LocationMarkerIcon, ClockIcon, PlusIcon, FolderIcon, BuildingIcon } from './icons';
import { ExportButton, type ExportField } from './export/ExportButton';
import { generateOnboardingPacket } from '../services/geminiService';
import { Modal } from './Modal';
import { useToast } from '../src/components/ui/Toast';

interface VolunteerListProps {
  volunteers: Volunteer[];
  clients: Client[];
  projects: Project[];
  teamMembers: TeamMember[];
  onAddVolunteer: () => void;
}

const VolunteerCard: React.FC<{ 
    volunteer: Volunteer; 
    getProjectName: (id: string) => string;
    getClientName: (id: string) => string;
    onGeneratePacket: (volunteer: Volunteer, projectId: string) => void;
}> = ({ volunteer, getProjectName, getClientName, onGeneratePacket }) => (
    <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-lg border border-white/20 shadow-lg flex flex-col hover:border-indigo-400 transition-colors duration-300 text-shadow-strong">
        <h3 className="text-lg font-bold text-slate-900 truncate w-full dark:text-slate-100">{volunteer.name}</h3>
        <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">{volunteer.skills.join(', ')}</p>
        <div className="space-y-2 text-sm text-slate-700 flex-grow mb-4 dark:text-slate-300">
            <div className="flex items-center gap-2">
                <MailIcon />
                <a href={`mailto:${volunteer.email}`} className="text-indigo-600 hover:text-indigo-700 truncate dark:text-indigo-400 dark:hover:text-indigo-300">{volunteer.email}</a>
            </div>
            <div className="flex items-center gap-2">
                <LocationMarkerIcon />
                <span>{volunteer.location}</span>
            </div>
             <div className="flex items-center gap-2">
                <ClockIcon />
                <span>{volunteer.availability}</span>
            </div>
        </div>
        <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 dark:text-slate-400">Assignments</h4>
            <div className="space-y-1 text-xs">
                {volunteer.assignedProjectIds.map(id => (
                     <div key={`proj-${id}`} className="flex items-center justify-between gap-2 bg-slate-100/50 p-1.5 rounded dark:bg-slate-700/50">
                        <div className="flex items-center gap-2">
                            <FolderIcon />
                            <span className="text-slate-700 dark:text-slate-300">{getProjectName(id)}</span>
                        </div>
                        <button 
                            onClick={() => onGeneratePacket(volunteer, id)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            title="Generate Onboarding Packet"
                        >
                            Packet
                        </button>
                    </div>
                ))}
                {volunteer.assignedClientIds.map(id => (
                     <div key={`client-${id}`} className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded dark:bg-indigo-900/30">
                        <BuildingIcon />
                        <span className="text-indigo-700 dark:text-indigo-300">{getClientName(id)}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const AddVolunteerCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button 
        onClick={onClick}
        className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-lg border-2 border-dashed border-white/30 text-center flex flex-col items-center justify-center hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200 text-slate-500 dark:text-slate-400 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
    >
        <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center mb-4 dark:bg-black/20">
            <PlusIcon />
        </div>
        <h3 className="text-lg font-bold">Add Volunteer</h3>
    </button>
);


export const VolunteerList: React.FC<VolunteerListProps> = ({ volunteers, clients, projects, teamMembers, onAddVolunteer }) => {
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    
    const [packetData, setPacketData] = useState<{ volunteer: Volunteer; project: Project } | null>(null);
    const [packetContent, setPacketContent] = useState('');
    const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);

    const filteredVolunteers = useMemo(() => {
        return volunteers.filter(volunteer => {
            const clientMatch = clientFilter === 'all' || volunteer.assignedClientIds.includes(clientFilter);
            const projectMatch = projectFilter === 'all' || volunteer.assignedProjectIds.includes(projectFilter);
            return clientMatch && projectMatch;
        });
    }, [volunteers, clientFilter, projectFilter]);
    
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown Project';
    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown Client';

    const handleGeneratePacket = (volunteer: Volunteer, projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setPacketData({ volunteer, project });
            setIsGeneratingPacket(true);
            setPacketContent('');
        }
    };
    
    useEffect(() => {
        if (packetData) {
            const generate = async () => {
                const content = await generateOnboardingPacket(packetData.volunteer, packetData.project, teamMembers);
                setPacketContent(content);
                setIsGeneratingPacket(false);
            };
            generate();
        }
    }, [packetData, teamMembers]);

    const exportFields: ExportField[] = [
      { key: 'name', label: 'Volunteer Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'location', label: 'Location' },
      {
        key: 'skills',
        label: 'Skills',
        format: (skills) => skills.join(' | ')
      },
      { key: 'availability', label: 'Availability' },
    ];

    return (
        <div className="space-y-8">
            <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-lg border border-white/20 relative aspect-[4/1] overflow-hidden">
                <VolunteersMap 
                    volunteers={filteredVolunteers}
                    clients={clients}
                    selectedClientId={clientFilter !== 'all' ? clientFilter : null}
                />
            </div>
            
            <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Volunteers</h2>
                    <div className="flex items-center gap-4">
                        <ExportButton
                            data={filteredVolunteers}
                            fields={exportFields}
                            filename="volunteers"
                        />
                        <select
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            className="bg-white/50 dark:bg-black/30 backdrop-blur-sm border-white/30 dark:border-white/10 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        >
                            <option value="all">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                         <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="bg-white/50 dark:bg-black/30 backdrop-blur-sm border-white/30 dark:border-white/10 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredVolunteers.map((volunteer) => (
                        <VolunteerCard 
                            key={volunteer.id} 
                            volunteer={volunteer}
                            getProjectName={getProjectName}
                            getClientName={getClientName}
                            onGeneratePacket={handleGeneratePacket}
                        />
                    ))}
                    <AddVolunteerCard onClick={onAddVolunteer} />
                 </div>
            </div>
            <OnboardingPacketModal
                isOpen={!!packetData}
                onClose={() => setPacketData(null)}
                isLoading={isGeneratingPacket}
                content={packetContent}
                volunteerName={packetData?.volunteer.name}
                projectName={packetData?.project.name}
            />
        </div>
    );
};


const OnboardingPacketModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    content: string;
    volunteerName?: string;
    projectName?: string;
}> = ({ isOpen, onClose, isLoading, content, volunteerName, projectName }) => {
    const { showToast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        showToast('Packet content copied to clipboard!', 'success');
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Onboarding Packet for ${volunteerName}`}>
             {isLoading && (
                <div className="flex flex-col items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    <p className="mt-4 text-slate-500">Generating packet for {projectName}...</p>
                </div>
            )}
            {!isLoading && (
                <div>
                    <div className="prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                        {/* A simple markdown renderer would be better, but for now, pre-wrap is fine */}
                        <p className="whitespace-pre-wrap font-sans">{content}</p>
                    </div>
                     <div className="flex justify-end gap-2 mt-4">
                        <button onClick={handleCopy} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700">Copy Content</button>
                    </div>
                </div>
            )}
        </Modal>
    )
}