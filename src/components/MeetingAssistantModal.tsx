import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { transcribeAudio, analyzeTranscript } from '../services/geminiService';
import type { Activity, Project, TeamMember, Task, MeetingAnalysisResult } from '../types';
import { UploadCloudIcon } from './icons';

interface MeetingAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity | null;
    projects: Project[];
    teamMembers: TeamMember[];
    onSaveTasks: (tasks: Omit<Task, 'id' | 'status' | 'dueDate'>[], projectId: string) => void;
}

type Step = 'upload' | 'processing' | 'review';
type ProcessingStage = 'Transcribing audio...' | 'Analyzing transcript...' | 'Finding action items...' | '';

interface TaskToCreate {
    description: string;
    projectId: string;
    teamMemberId: string;
    include: boolean;
}

export const MeetingAssistantModal: React.FC<MeetingAssistantModalProps> = ({
    isOpen,
    onClose,
    activity,
    projects,
    teamMembers,
    onSaveTasks
}) => {
    const [step, setStep] = useState<Step>('upload');
    const [processingStage, setProcessingStage] = useState<ProcessingStage>('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [result, setResult] = useState<MeetingAnalysisResult | null>(null);
    const [tasks, setTasks] = useState<TaskToCreate[]>([]);

    useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setAudioFile(null);
            setResult(null);
            setTasks([]);
        }
    }, [isOpen]);
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleProcess = async () => {
        if (!audioFile) return;

        setStep('processing');
        try {
            setProcessingStage('Transcribing audio...');
            const audioB64 = await fileToBase64(audioFile);
            const transcript = await transcribeAudio(audioB64, audioFile.type);
            
            if (transcript.startsWith('Error')) throw new Error(transcript);

            setProcessingStage('Analyzing transcript...');
            const analysisResult = await analyzeTranscript(transcript);

            if (analysisResult.error) throw new Error(analysisResult.error);

            setResult(analysisResult);

            // Pre-populate tasks for review
            const newTasks = analysisResult.actionItems.map(item => {
                // Fuzzy match assignee name
                const assignee = teamMembers.find(tm => 
                    item.suggestedAssignee && tm.name.toLowerCase().includes(item.suggestedAssignee.toLowerCase())
                );
                return {
                    description: item.taskDescription,
                    projectId: activity?.projectId || projects[0]?.id || '',
                    teamMemberId: assignee?.id || '',
                    include: true,
                };
            });
            setTasks(newTasks);
            
            setStep('review');
        } catch (error) {
            console.error(error);
            setResult({ summary: `An error occurred: ${error}`, actionItems: [] });
            setStep('review'); // Go to review to show the error
        } finally {
            setProcessingStage('');
        }
    };

    const handleTaskChange = (index: number, field: keyof TaskToCreate, value: string | boolean) => {
        setTasks(prev => {
            const newTasks = [...prev];
            (newTasks[index] as any)[field] = value;
            return newTasks;
        });
    };

    const handleSave = () => {
        const tasksToSave = tasks
            .filter(t => t.include)
            .map(({ description, teamMemberId }) => ({
                description,
                teamMemberId,
                sharedWithClient: false,
                phase: 'Meeting Follow-up' // Add a phase for context
            }));
        
        const projectId = tasks[0]?.projectId;
        if (tasksToSave.length > 0 && projectId) {
            onSaveTasks(tasksToSave, projectId);
        } else {
            onClose();
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Assistant for "${activity?.title}"`}>
            {step === 'upload' && (
                <div className="text-center">
                    <input
                        type="file"
                        id="audio-upload"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)}
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer block p-8 border-2 border-dashed rounded-lg hover:border-violet-500">
                        <UploadCloudIcon />
                        <p className="font-semibold text-slate-700 dark:text-slate-200 mt-2">
                            {audioFile ? audioFile.name : 'Upload meeting recording'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">MP3, WAV, M4A, etc.</p>
                    </label>
                    <button onClick={handleProcess} disabled={!audioFile} className="mt-4 w-full bg-violet-600 text-white px-4 py-2 rounded-md font-semibold disabled:bg-violet-300">
                        Process Recording
                    </button>
                </div>
            )}
            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                    <p className="mt-4 text-slate-500 dark:text-slate-400 font-semibold">{processingStage}</p>
                </div>
            )}
            {step === 'review' && result && (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <h4 className="font-semibold mb-2">Meeting Summary</h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">
                            {result.summary}
                        </div>
                    </div>
                    {tasks.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Suggested Action Items</h4>
                            <div className="space-y-3">
                                {tasks.map((task, index) => (
                                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md space-y-2">
                                        <div className="flex items-start gap-2">
                                            <input type="checkbox" checked={task.include} onChange={e => handleTaskChange(index, 'include', e.target.checked)} className="mt-1 h-4 w-4 rounded text-violet-600"/>
                                            <textarea value={task.description} onChange={e => handleTaskChange(index, 'description', e.target.value)} rows={2} className="flex-1 text-sm p-1 border rounded bg-white dark:bg-slate-800" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pl-6">
                                            <select value={task.projectId} onChange={e => handleTaskChange(index, 'projectId', e.target.value)} className="text-xs p-1 border rounded bg-white dark:bg-slate-800">
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <select value={task.teamMemberId} onChange={e => handleTaskChange(index, 'teamMemberId', e.target.value)} className="text-xs p-1 border rounded bg-white dark:bg-slate-800">
                                                <option value="">Unassigned</option>
                                                {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     <div className="flex justify-end pt-4">
                        <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-md text-sm font-semibold hover:from-teal-700 hover:to-cyan-700">
                            Add {tasks.filter(t=>t.include).length} Tasks to Project
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};