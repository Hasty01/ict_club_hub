import React, { useMemo, useState, useEffect } from 'react';
import { User } from '../types';
import { useData } from '../DataContext';
import { TrophyIcon } from './icons/TrophyIcon';
import { UsersIcon } from './icons/UsersIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface CommunityProps {
    currentUser: User;
}

type Team = {
    id: string;
    name: string;
    description: string;
    members: string[];
    createdBy: string;
    createdAt: string;
};

type TeamChallenge = {
    id: string;
    teamId: string;
    title: string;
    description: string;
    dueDate: string;
    createdBy: string;
    createdAt: string;
    submissions: Record<string, { note: string; submittedAt: string }>;
};

const TEAM_STORAGE_KEY = 'clubhub_teams';
const TEAM_CHALLENGE_KEY = 'clubhub_team_challenges';

const loadFromStorage = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const Community: React.FC<CommunityProps> = ({ currentUser }) => {
    const { allUsers, showcaseItems, suggestions } = useData();
    const [teams, setTeams] = useState<Team[]>(() => loadFromStorage<Team[]>(TEAM_STORAGE_KEY, []));
    const [teamChallenges, setTeamChallenges] = useState<TeamChallenge[]>(() => loadFromStorage<TeamChallenge[]>(TEAM_CHALLENGE_KEY, []));
    const [teamForm, setTeamForm] = useState({ name: '', description: '' });
    const [challengeForm, setChallengeForm] = useState({ teamId: '', title: '', description: '', dueDate: '' });
    const [submissionNote, setSubmissionNote] = useState<Record<string, string>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teams));
        }
    }, [teams]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(TEAM_CHALLENGE_KEY, JSON.stringify(teamChallenges));
        }
    }, [teamChallenges]);

    const userMap = useMemo(() => {
        return new Map(allUsers.map(user => [user.uid, user]));
    }, [allUsers]);

    const recognitionBoard = useMemo(() => {
        const showcaseCount = new Map<string, number>();
        const suggestionCount = new Map<string, number>();
        const badgeCount = new Map<string, number>();

        showcaseItems.forEach(item => {
            showcaseCount.set(item.userUid, (showcaseCount.get(item.userUid) || 0) + 1);
        });

        suggestions.forEach(item => {
            suggestionCount.set(item.userId, (suggestionCount.get(item.userId) || 0) + 1);
        });

        allUsers.forEach(user => {
            badgeCount.set(user.uid, user.badges?.length || 0);
        });

        const scored = allUsers
            .filter(user => user.status === 'APPROVED')
            .map(user => {
                const showcaseScore = showcaseCount.get(user.uid) || 0;
                const suggestionScore = suggestionCount.get(user.uid) || 0;
                const badges = badgeCount.get(user.uid) || 0;
                const score = showcaseScore * 3 + suggestionScore + badges * 2;
                return {
                    user,
                    score,
                    showcaseScore,
                    suggestionScore,
                    badges
                };
            })
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return scored;
    }, [allUsers, showcaseItems, suggestions]);

    const topMember = recognitionBoard[0];

    const handleCreateTeam = () => {
        if (!teamForm.name.trim()) return;
        const newTeam: Team = {
            id: `team_${Date.now()}`,
            name: teamForm.name.trim(),
            description: teamForm.description.trim(),
            members: [currentUser.uid],
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString()
        };
        setTeams(prev => [newTeam, ...prev]);
        setTeamForm({ name: '', description: '' });
    };

    const handleJoinTeam = (teamId: string) => {
        setTeams(prev => prev.map(team => (
            team.id === teamId && !team.members.includes(currentUser.uid)
                ? { ...team, members: [...team.members, currentUser.uid] }
                : team
        )));
    };

    const handleLeaveTeam = (teamId: string) => {
        setTeams(prev => prev.map(team => (
            team.id === teamId
                ? { ...team, members: team.members.filter(id => id !== currentUser.uid) }
                : team
        )));
    };

    const handleCreateChallenge = () => {
        if (!challengeForm.teamId || !challengeForm.title.trim()) return;
        const newChallenge: TeamChallenge = {
            id: `team_ch_${Date.now()}`,
            teamId: challengeForm.teamId,
            title: challengeForm.title.trim(),
            description: challengeForm.description.trim(),
            dueDate: challengeForm.dueDate,
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            submissions: {}
        };
        setTeamChallenges(prev => [newChallenge, ...prev]);
        setChallengeForm({ teamId: '', title: '', description: '', dueDate: '' });
    };

    const handleSubmitChallenge = (challengeId: string) => {
        const note = submissionNote[challengeId]?.trim();
        if (!note) return;
        setTeamChallenges(prev => prev.map(challenge => (
            challenge.id === challengeId
                ? {
                    ...challenge,
                    submissions: {
                        ...challenge.submissions,
                        [currentUser.uid]: {
                            note,
                            submittedAt: new Date().toISOString()
                        }
                    }
                }
                : challenge
        )));
        setSubmissionNote(prev => ({ ...prev, [challengeId]: '' }));
    };

    const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Community Hub</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Celebrate wins, form teams, and ship together.</p>
                </div>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <TrophyIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recognition Board</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Points from showcases, suggestions, and badges.</p>
                        </div>
                    </div>

                    {recognitionBoard.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recognition data yet. Submit showcases or suggestions to appear here.</p>
                    ) : (
                        <div className="space-y-3">
                            {recognitionBoard.map((entry, index) => (
                                <div key={entry.user.uid} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <img
                                        src={entry.user.avatarUrl || `https://i.pravatar.cc/40?u=${entry.user.username}`}
                                        alt={entry.user.name}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-white">{entry.user.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">@{entry.user.username}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-pink-600 dark:text-pink-400">{entry.score} pts</p>
                                        <p className="text-[11px] text-gray-400">Showcases {entry.showcaseScore} • Ideas {entry.suggestionScore} • Badges {entry.badges}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 dark:from-pink-500/20 dark:via-purple-500/20 dark:to-indigo-500/10 border border-pink-200/40 dark:border-pink-500/20 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <SparklesIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Member Spotlight</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Top community contributor.</p>
                        </div>
                    </div>
                    {topMember ? (
                        <div className="flex items-center gap-4">
                            <img
                                src={topMember.user.avatarUrl || `https://i.pravatar.cc/80?u=${topMember.user.username}`}
                                alt={topMember.user.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-pink-400"
                            />
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{topMember.user.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">@{topMember.user.username}</p>
                                <p className="text-sm text-pink-600 dark:text-pink-400 font-semibold mt-1">{topMember.score} points this week</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No spotlight yet. Start contributing to appear here.</p>
                    )}
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <UsersIcon />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Form squads for challenges and projects.</p>
                        </div>
                    </div>
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={handleCreateTeam}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700 transition-colors"
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Create Team
                        </button>
                    )}
                </div>

                {currentUser.role === 'PATRON' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                        <input
                            value={teamForm.name}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Team name"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <input
                            value={teamForm.description}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Short description"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm md:col-span-2"
                        />
                    </div>
                )}

                {teams.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No teams yet. Create the first one.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {teams.map(team => {
                            const isMember = team.members.includes(currentUser.uid);
                            return (
                                <div key={team.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">{team.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{team.description || 'No description'}</p>
                                        </div>
                                        {isMember ? (
                                            <button
                                                onClick={() => handleLeaveTeam(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                            >
                                                Leave
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleJoinTeam(team.id)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700"
                                            >
                                                Join
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {team.members.slice(0, 6).map(uid => {
                                            const user = userMap.get(uid);
                                            return (
                                                <img
                                                    key={uid}
                                                    src={user?.avatarUrl || `https://i.pravatar.cc/40?u=${user?.username || uid}`}
                                                    alt={user?.name || 'Member'}
                                                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                                                />
                                            );
                                        })}
                                        {team.members.length > 6 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">+{team.members.length - 6} more</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircleIcon />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Challenges</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Work together and submit progress notes.</p>
                    </div>
                </div>

                {currentUser.role === 'PATRON' && teams.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                        <select
                            value={challengeForm.teamId}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, teamId: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        >
                            <option value="">Select team</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                        <input
                            value={challengeForm.title}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Challenge title"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <input
                            value={challengeForm.dueDate}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            type="date"
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <button
                            onClick={handleCreateChallenge}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700"
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Add Challenge
                        </button>
                        <textarea
                            value={challengeForm.description}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Short description"
                            className="md:col-span-4 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                            rows={2}
                        />
                    </div>
                )}

                {teamChallenges.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No team challenges yet.</p>
                ) : (
                    <div className="space-y-4">
                        {teamChallenges.map(challenge => {
                            const team = teamsById.get(challenge.teamId);
                            const isMember = team?.members.includes(currentUser.uid);
                            const submission = challenge.submissions[currentUser.uid];
                            return (
                                <div key={challenge.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">{challenge.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Team: {team?.name || 'Unknown team'} • Due {challenge.dueDate || 'TBD'}</p>
                                            {challenge.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{challenge.description}</p>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {Object.keys(challenge.submissions).length} submissions
                                        </div>
                                    </div>
                                    {isMember && (
                                        <div className="mt-3">
                                            <textarea
                                                value={submissionNote[challenge.id] ?? ''}
                                                onChange={(e) => setSubmissionNote(prev => ({ ...prev, [challenge.id]: e.target.value }))}
                                                placeholder={submission ? 'Update your progress note' : 'Add a progress note'}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                                                rows={2}
                                            />
                                            <div className="mt-2 flex items-center gap-3">
                                                <button
                                                    onClick={() => handleSubmitChallenge(challenge.id)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
                                                >
                                                    Submit Note
                                                </button>
                                                {submission && (
                                                    <span className="text-xs text-green-600 dark:text-green-400">
                                                        Submitted {new Date(submission.submittedAt).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Community;
