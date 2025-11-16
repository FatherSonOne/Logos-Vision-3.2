import React, { useState, useCallback, useEffect } from 'react';
import type { Project, Client, TeamMember, Task, Case, Volunteer, RecommendedVolunteer } from '../types';
import { ProjectStatus, TaskStatus } from '../types';
import { generateProjectSummary, generateSpokenText, analyzeProjectRisk, RiskAnalysisResult, recommendVolunteers } from '../services/geminiService';
import { Modal } from './Modal';
import { TaskTimeline } from './TaskTimeline';
import { decodeAudioData, decode } from '../utils/audio';
import { getDeadlineStatus } from '../utils/dateHelpers';
import { AiEnhancedTextarea } from './AiEnhancedTextarea';
import { Breadcrumbs } from '../src/components/ui/Breadcrumbs';
import { useToast } from '../src/components/ui/Toast';
import { ClockIcon, SparklesIcon, ShieldExclamationIcon, ShieldCheckIconSolid, ShieldExclamationIconSolid, NoteIcon, SoundWaveIcon, PlayIcon, UsersIcon } from './icons';

const StatusBadge: React.FC<{ status: ProjectStatus | TaskStatus }> = ({ status }) => {
  const colors = {
    // Project Statuses
    [ProjectStatus.Planning]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [ProjectStatus.InProgress]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [ProjectStatus.Completed]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    [ProjectStatus.OnHold]: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    // Task Statuses
    [TaskStatus.ToDo]: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    [TaskStatus.Done]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
};

interface ProjectDetailProps {
  project: Project;
  client?: Client;
  projectTeamMembers: TeamMember[];
  allTeamMembers: TeamMember[];
  cases: Case[];
  volunteers: Volunteer[];
  onBack: () => void;
  onUpdateTaskNote: (projectId: string, taskId: string, notes: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, client, projectTeamMembers, allTeamMembers, cases, volunteers, onBack, onUpdateTaskNote }) => {
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [summarySources, setSummarySources] = useState<any[]>([]);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [taskView, setTaskView] = useState<'list' | 'timeline'>('list');
    const [activeNoteTaskId, setActiveNoteTaskId] = useState<string | null>(null);
    const [currentNote, setCurrentNote] = useState('');
    const [riskAnalysisResult, setRiskAnalysisResult] = useState<RiskAnalysisResult | null>(null);
    const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [selectedTaskForRecs, setSelectedTaskForRecs] = useState<Task | null>(null);
    const [recommendations, setRecommendations] = useState<RecommendedVolunteer[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);

    const projectDeadline = getDeadlineStatus(project.endDate, project.status === ProjectStatus.Completed);

    const handleNoteToggle = (taskId: string, existingNote?: string) => {
        if (activeNoteTaskId === taskId) {
            setActiveNoteTaskId(null);
        } else {
            setActiveNoteTaskId(taskId);
            setCurrentNote(existingNote || '');
        }
    };

    const handleNoteSave = (taskId: string) => {
        onUpdateTaskNote(project.id, taskId, currentNote);
        setActiveNoteTaskId(null);
    };

    const handleGenerateSummary = useCallback(async () => {
        if (!client) return;
        setIsLoadingSummary(true);
        setAiSummary('');
        setSummarySources([]);
        setIsSummaryModalOpen(true);
        const { summary, sources } = await generateProjectSummary(project, client, allTeamMembers);
        setAiSummary(summary);
        setSummarySources(sources);
        setIsLoadingSummary(false);
    }, [project, client, allTeamMembers]);
    
    const handlePlaySummary = async () => {
        if (!aiSummary || isPlayingAudio) return;
        setIsPlayingAudio(true);
        try {
            const audioB64 = await generateSpokenText(aiSummary);
            if (audioB64) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(audioB64), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                source.onended = () => setIsPlayingAudio(false);
            } else {
                setIsPlayingAudio(false);
            }
        } catch (error) {
            console.error("Error playing audio summary:", error);
            setIsPlayingAudio(false);
        }
    };

    const handleAnalyzeRisk = useCallback(async () => {
        setIsAnalyzingRisk(true);
        setRiskAnalysisResult(null);
        const result = await analyzeProjectRisk(project, cases);
        setRiskAnalysisResult(result);
        setIsAnalyzingRisk(false);
    }, [project, cases]);

    const handleFindVolunteers = (task: Task) => {
        setSelectedTaskForRecs(task);
        setIsRecModalOpen(true);
        setIsRecommending(true);
        setRecommendations([]);
    };

    useEffect(() => {
        if (selectedTaskForRecs) {
            const fetchRecommendations = async () => {
                const recs = await recommendVolunteers(selectedTaskForRecs.description, volunteers);
                setRecommendations(recs);
                setIsRecommending(false);
            };
            fetchRecommendations();
        }
    }, [selectedTaskForRecs, volunteers]);

    const riskColorClasses = {
        Low: {
            bg: 'bg-teal-100 dark:bg-teal-900/50',
            text: 'text-teal-700 dark:text-teal-300',
            icon: 'text-teal-500'
        },
        Medium: {
            bg: 'bg-amber-100 dark:bg-amber-900/50',
            text: 'text-amber-700 dark:text-amber-400',
            icon: 'text-amber-500'
        },
        High: {
            bg: 'bg-rose-100 dark:bg-rose-900/50',
            text: 'text-rose-700 dark:text-rose-400',
            icon: 'text-rose-500'
        },
    };

    const completionPercentage = project.tasks.length > 0
        ? (project.tasks.filter(t => t.status === 'Done').length / project.tasks.length) * 100
        : 0;

    const viewButtonClasses = (isActive: boolean) =>
        `px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none ${
            isActive
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`;

    return (
        <div className="space-y-6">
            <Breadcrumbs
              items={[
                { label: 'Projects', onClick: onBack },
                { label: project.name }
              ]}
            />
            
            <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-lg border border-white/20 shadow-lg text-shadow-strong">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start border-b border-white/20 pb-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 dark:text-slate-100">{project.name}</h2>
                        <p className="text-md text-slate-600 dark:text-slate-300">for <span className="font-semibold text-cyan-600 dark:text-cyan-400">{client?.name || 'Unknown Client'}</span></p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex-shrink-0 text-right">
                        <StatusBadge status={project.status} />
                        <p className={`flex items-center justify-end gap-1 font-semibold mt-2 text-sm ${projectDeadline.color}`}>
                            <ClockIcon />
                            {projectDeadline.text}
                        </p>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mb-8">
                    <div className="flex justify-between items-center text-sm text-slate-600 mb-2 dark:text-slate-300">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Overall Progress</h3>
                        <span>{Math.round(completionPercentage)}%</span>
                    </div>
                    <div className="w-full bg-slate-200/50 rounded-full h-2.5 dark:bg-black/20">
                        <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                    </div>
                </div>

                {/* Body Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-2">
                        <h3 className="text-lg font-semibold text-slate-800 mb-3 dark:text-slate-200">Project Description</h3>
                        <p className="text-slate-600 mb-6 dark:text-slate-300">{project.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400">Start Date</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(project.startDate).toLocaleDateString()}</p>
                            </div>
                             <div>
                                <p className="text-slate-500 dark:text-slate-400">End Date</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(project.endDate).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-slate-500 dark:text-slate-400">Assigned Team Members</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{projectTeamMembers.map(c => c.name).join(', ') || 'None'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Tools */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-cyan-50 to-sky-100 p-6 rounded-lg border border-cyan-200/50 dark:bg-gradient-to-br dark:from-slate-800/50 dark:to-slate-900/50 dark:border-white/10">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">AI Project Summary</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Let Gemini create a status report with the latest relevant news.</p>
                            <button 
                                onClick={handleGenerateSummary} 
                                disabled={isLoadingSummary}
                                className="w-full flex justify-center items-center bg-gradient-to-r from-cyan-600 to-sky-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:from-cyan-700 hover:to-sky-700 transition-colors disabled:from-cyan-400 disabled:to-sky-400 dark:disabled:bg-slate-600"
                            >
                                <SparklesIcon />
                                {isLoadingSummary ? 'Generating...' : 'Generate AI Summary'}
                            </button>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-rose-100 p-6 rounded-lg border border-amber-200/50 dark:bg-gradient-to-br dark:from-slate-800/50 dark:to-slate-900/50 dark:border-white/10">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">AI Risk Analysis</h3>
                            
                            {isAnalyzingRisk && (
                                <div className="flex flex-col items-center justify-center h-24">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Analyzing risk factors...</p>
                                </div>
                            )}

                            {!isAnalyzingRisk && !riskAnalysisResult && (
                                <>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Get an AI-powered assessment of potential project risks.</p>
                                    <button 
                                        onClick={handleAnalyzeRisk} 
                                        className="w-full flex justify-center items-center bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:from-amber-600 hover:to-rose-600 transition-colors"
                                    >
                                        <ShieldExclamationIcon />
                                        Analyze Risk
                                    </button>
                                </>
                            )}

                            {!isAnalyzingRisk && riskAnalysisResult && (
                                <div>
                                    <div className={`p-3 rounded-md mb-4 ${riskColorClasses[riskAnalysisResult.riskLevel].bg}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={riskColorClasses[riskAnalysisResult.riskLevel].icon}>
                                                {riskAnalysisResult.riskLevel === 'High' && <ShieldExclamationIconSolid />}
                                                {riskAnalysisResult.riskLevel === 'Medium' && <ShieldExclamationIconSolid />}
                                                {riskAnalysisResult.riskLevel === 'Low' && <ShieldCheckIconSolid />}
                                            </div>
                                            <p className={`font-bold text-lg ${riskColorClasses[riskAnalysisResult.riskLevel].text}`}>
                                                Risk Level: {riskAnalysisResult.riskLevel}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-4">{riskAnalysisResult.explanation}</p>
                                     <button 
                                        onClick={handleAnalyzeRisk} 
                                        className="w-full flex justify-center items-center bg-transparent border border-amber-500/50 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-md text-sm font-semibold hover:bg-amber-500/10 transition-colors"
                                    >
                                        Re-analyze
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Task Section */}
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Tasks</h3>
                         <div className="flex items-center gap-1 p-1 bg-black/10 dark:bg-black/20 rounded-lg border border-white/20">
                            <button onClick={() => setTaskView('list')} className={viewButtonClasses(taskView === 'list')}>
                                List View
                            </button>
                            <button onClick={() => setTaskView('timeline')} className={viewButtonClasses(taskView === 'timeline')}>
                                Timeline View
                            </button>
                        </div>
                    </div>
                    
                    {taskView === 'list' ? (
                        <div className="space-y-2">
                            {project.tasks.length > 0 ? project.tasks.map(task => {
                                const taskDeadline = getDeadlineStatus(task.dueDate, task.status === TaskStatus.Done);
                                return (
                                <div key={task.id}>
                                    <div className="bg-white/20 dark:bg-black/20 p-4 rounded-md border border-white/20 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-slate-300">{task.description}</p>
                                            {task.notes && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 pl-2 border-l-2 border-slate-300 dark:border-slate-600 whitespace-pre-wrap">
                                                    {task.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm flex-shrink-0 self-end sm:self-center">
                                            <span className="text-slate-500 dark:text-slate-400">{allTeamMembers.find(c => c.id === task.teamMemberId)?.name || 'N/A'}</span>
                                            <span className={`${taskDeadline.color}`}>{new Date(task.dueDate).toLocaleDateString()}</span>
                                            <StatusBadge status={task.status} />
                                            <button onClick={() => handleFindVolunteers(task)} className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400" title="Suggest Volunteers for this task">
                                                <UsersIcon />
                                            </button>
                                            <button onClick={() => handleNoteToggle(task.id, task.notes)} className="text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400" title={task.notes ? "View/Edit Note" : "Add Note"}>
                                                <NoteIcon hasNote={!!task.notes} />
                                            </button>
                                        </div>
                                    </div>
                                    {activeNoteTaskId === task.id && (
                                        <div className="p-4 bg-slate-100/50 rounded-b-md border-x border-b border-white/20 dark:bg-black/20">
                                            <label htmlFor={`note-${task.id}`} className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-200">
                                                Task Note
                                            </label>
                                            <AiEnhancedTextarea
                                                id={`note-${task.id}`}
                                                value={currentNote}
                                                onValueChange={setCurrentNote}
                                                rows={3}
                                                placeholder="Add a note for this task..."
                                                className="w-full p-2 text-sm bg-white/50 border border-white/30 rounded-md focus:ring-cyan-500 focus:border-cyan-500 dark:bg-black/30 dark:border-white/20 dark:text-white"
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setActiveNoteTaskId(null)} className="px-3 py-1.5 bg-white/50 border border-white/30 rounded-md text-xs font-semibold text-slate-700 hover:bg-white/80 dark:bg-black/30 dark:text-slate-200 dark:border-white/20 dark:hover:bg-black/50">
                                                    Cancel
                                                </button>
                                                <button onClick={() => handleNoteSave(task.id)} className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-md text-xs font-semibold hover:from-cyan-700 hover:to-sky-700">
                                                    Save Note
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}) : <p className="text-slate-500 text-sm dark:text-slate-400">No tasks assigned to this project yet.</p>}
                        </div>
                    ) : (
                        <TaskTimeline project={project} allTeamMembers={allTeamMembers} />
                    )}
                </div>
            </div>

            <Modal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} title="AI-Generated Project Summary">
                {isLoadingSummary ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                        <p className="mt-4 text-slate-500 dark:text-slate-400">Generating your summary...</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-end mb-2">
                             <button 
                                onClick={handlePlaySummary} 
                                disabled={isPlayingAudio || !aiSummary}
                                className="flex items-center gap-2 text-sm text-cyan-600 disabled:text-slate-400 disabled:cursor-not-allowed hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
                            >
                               {isPlayingAudio ? <SoundWaveIcon /> : <PlayIcon />}
                               {isPlayingAudio ? 'Playing...' : 'Read Aloud'}
                            </button>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap dark:text-slate-300">{aiSummary}</p>
                        {summarySources.length > 0 && (
                            <div className="mt-4 pt-4 border-t dark:border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sources:</h4>
                                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                                    {summarySources.map((source, index) => source.web && (
                                        <li key={index}>
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline dark:text-cyan-400">
                                                {source.web.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
            <VolunteerRecModal
                isOpen={isRecModalOpen}
                onClose={() => setIsRecModalOpen(false)}
                task={selectedTaskForRecs}
                recommendations={recommendations}
                isLoading={isRecommending}
                allVolunteers={volunteers}
            />
        </div>
    );
};

const VolunteerRecModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    recommendations: RecommendedVolunteer[];
    isLoading: boolean;
    allVolunteers: Volunteer[];
}> = ({ isOpen, onClose, task, recommendations, isLoading, allVolunteers }) => {
    const { showToast } = useToast();

    const handleAssign = (volunteerId: string) => {
        const volunteer = allVolunteers.find(v => v.id === volunteerId);
        showToast(`Assigned ${volunteer?.name} to "${task?.description}"! (Simulated)`, 'success');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Volunteer Suggestions for "${task?.description}"`}>
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    <p className="mt-4 text-slate-500">Finding best matches...</p>
                </div>
            )}
            {!isLoading && recommendations.length > 0 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {recommendations.map(rec => {
                        const volunteer = allVolunteers.find(v => v.id === rec.volunteerId);
                        if (!volunteer) return null;
                        return (
                            <div key={rec.volunteerId} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{volunteer.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        <strong>Skills:</strong> {volunteer.skills.join(', ')} <br/>
                                        <strong>Availability:</strong> {volunteer.availability}
                                    </p>
                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 italic">
                                        <strong>AI Justification:</strong> "{rec.justification}" (Match: {rec.matchScore}%)
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAssign(rec.volunteerId)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 flex-shrink-0"
                                >
                                    Assign
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
            {!isLoading && recommendations.length === 0 && (
                <p className="text-center text-slate-500 py-8">Could not find any suitable volunteers.</p>
            )}
        </Modal>
    );
};
