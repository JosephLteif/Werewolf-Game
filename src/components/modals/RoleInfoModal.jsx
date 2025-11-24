import React from 'react';
import { Info } from 'lucide-react';
import { ROLES } from '../../constants';

export function RoleInfoModal({ showRoleInfo, onClose }) {
    if (!showRoleInfo) return null;

    const isRules = showRoleInfo === 'RULES';
    const role = isRules ? null : Object.values(ROLES).find(r => r.id === showRoleInfo);

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {isRules ? (
                    <>
                        <h3 className="text-2xl font-black text-indigo-400 mb-4 flex items-center gap-2">
                            <Info className="w-6 h-6" /> Rule Book
                        </h3>
                        <div className="space-y-4 text-slate-300 text-sm">
                            <section>
                                <h4 className="font-bold text-white mb-1">Objective</h4>
                                <p>Villagers must find and eliminate all Werewolves. Werewolves must eliminate Villagers until they equal or outnumber them.</p>
                            </section>
                            <section>
                                <h4 className="font-bold text-white mb-1">Game Flow</h4>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong className="text-indigo-300">Night:</strong> Special roles wake up secretly to perform actions (kill, heal, investigate).</li>
                                    <li><strong className="text-orange-300">Day:</strong> Everyone wakes up. Deaths are revealed. Players discuss and vote to eliminate a suspect.</li>
                                </ul>
                            </section>
                            <section>
                                <h4 className="font-bold text-white mb-1">Voting</h4>
                                <p>Majority vote eliminates a player. In case of a tie, no one dies.</p>
                            </section>
                            <section>
                                <h4 className="font-bold text-white mb-1">Winning</h4>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong className="text-blue-400">Villagers:</strong> Kill all Wolves.</li>
                                    <li><strong className="text-red-400">Werewolves:</strong> Equal/outnumber Villagers.</li>
                                    <li><strong className="text-purple-400">Jester/Tanner:</strong> Get voted out.</li>
                                    <li><strong className="text-pink-400">Lovers:</strong> Be the last two alive.</li>
                                </ul>
                            </section>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-4">
                            {React.createElement(role.icon, { className: "w-12 h-12 text-indigo-400" })}
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold">{role.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500 uppercase font-bold">{role.alignment}</span>
                                    <span className="text-xs text-slate-600">•</span>
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                        Weight: {role.weight > 0 ? '+' : ''}{role.weight}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-300 mb-6">{role.desc}</p>
                    </>
                )}
                <button
                    onClick={onClose}
                    className="w-full bg-slate-700 hover:bg-slate-600 mt-6 py-3 rounded-xl font-bold transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
