import React from 'react';

export default function VoterAvatars({ voterIds, players, size = '5', borderColor = 'border-white' }) {
    if (!voterIds || voterIds.length === 0) {
        return null;
    }

    const voters = voterIds.map(id => players.find(p => p.id === id)).filter(Boolean);

    // Dynamic class for text size based on avatar size
    const textSizeClass = size === '6' ? 'text-[10px]' : 'text-[9px]';

    return (
        <div className="flex -space-x-2">
            {voters.map(voter => (
                <div
                    key={voter.id}
                    className={`w-${size} h-${size} rounded-full border-2 ${borderColor} flex items-center justify-center ${textSizeClass} font-bold text-white shadow-sm`}
                    style={{ backgroundColor: voter.avatarColor }}
                    title={voter.name}
                >
                    {voter.name[0]}
                </div>
            ))}
        </div>
    );
}
