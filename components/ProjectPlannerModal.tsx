import React, { useState } from 'react';
import { Modal } from './Modal';
import { generateProjectPlan } from '../services/geminiService';
import type { Client, AiProjectPlan } from '../types';
import { SparklesIcon } from './icons';

interface ProjectPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: AiProjectPlan, clientId: string) => void;
  clients: Client[];
}

export const ProjectPlannerModal: React.FC<ProjectPlannerModalProps> = ({ isOpen, onClose, onSave, clients }) => {
    const [goal, setGoal] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
    const [plan, setPlan] = useState<AiProjectPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!goal.trim() || !selectedClientId) {
            alert('Please describe your project goal and select a client.');
            return;
        }
        setIsLoading(true);
        setPlan(null);
        const generatedPlan = await generateProjectPlan(goal);
        setPlan(generatedPlan);
        setIsLoading(false);
    };

    const handleCreateProject = () => {
        if (plan && selectedClientId) {
            onSave(plan, selectedClientId);
        }
    };
    
    const handleClose = () => {
        setGoal('');
        setPlan(null);
        setIsLoading(false);
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="AI Project Planner">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-200">
                        Project Goal
                    </label>
                    <textarea
                        rows={3}
                        className="w-full p-2 bg-white/50 border border-white/30 rounded-md focus:ring-violet-500 focus:border-violet-500 dark:bg-black/30 dark:border-white/20"
                        placeholder="e.g., Organize a 5K charity run for the Animal Rescue Shelter to raise $10,000"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-200">
                        For Client
                    </label>
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full p-2 bg-white/50 border border-white/30 rounded-md focus:ring-violet-500 focus:border-violet-500 dark:bg-black/30 dark:border-white/20"
                    >
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                >
                    <SparklesIcon />
                    {isLoading ? 'Generating Plan...' : 'Generate Plan'}
                </button>

                {plan && (
                    <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-white/20 max-h-80 overflow-y-auto">
                        {plan.error ? (
                            <p className="text-red-500">{plan.error}</p>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold">{plan.projectName}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">{plan.description}</p>
                                <div className="space-y-3">
                                    {plan.phases.map((phase, index) => (
                                        <div key={index}>
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">{phase.phaseName}</h4>
                                            <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-200 space-y-1 mt-1 pl-2">
                                                {phase.tasks.map((task, i) => <li key={i}>{task}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
                 <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={handleClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">Cancel</button>
                    <button type="button" onClick={handleCreateProject} disabled={!plan || !!plan.error} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-md text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50">
                        Create Project
                    </button>
                </div>
            </div>
        </Modal>
    );
};
