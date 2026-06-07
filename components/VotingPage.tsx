import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { VotingPosition, VotingContestant, VotingVote, User } from '../types';
import { VoteIcon } from './icons/VoteIcon';
import { UserIcon } from './icons/UserIcon';
import { PlusCircleIcon as PlusIcon } from './icons/PlusCircleIcon';
import { HourglassIcon as ClockIcon } from './icons/HourglassIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChartBarIcon as BarChart3Icon } from './icons/ChartBarIcon';
import { ExclamationCircleIcon as AlertIcon } from './icons/ExclamationCircleIcon';
import { CheckCircleIcon as CheckIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { InformationCircleIcon as InfoIcon } from './icons/InformationCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface VotingPageProps {
    currentUser: User;
}

const VotingPage: React.FC<VotingPageProps> = ({ currentUser }) => {
    const {
        votingPositions,
        fetchVotingPositions,
        createVotingPosition,
        updateVotingPosition,
        fetchVotingContestants,
        contestPosition,
        castVote,
        fetchVotingVotes,
        updateContestantStatus,
        deleteVotingPosition,
        isLoadingVoting,
        votingError,
        showToast,
        showAlert,
        allUsers,
        votingContestants
    } = useData();

    const [activeTab, setActiveTab] = useState<'active' | 'past' | 'create' | 'vetting' | 'analytics'>('active');
    const [selectedPosition, setSelectedPosition] = useState<VotingPosition | null>(null);
    const [showContestModal, setShowContestModal] = useState(false);
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState<{ title: string, message: string, type: 'upcoming' | 'closed', date: string } | null>(null);

    const [manifesto, setManifesto] = useState('');
    const [criteriaAgreed, setCriteriaAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contestants, setContestants] = useState<VotingContestant[]>([]);
    const [votes, setVotes] = useState<VotingVote[]>([]);
    const [analyticsVotes, setAnalyticsVotes] = useState<VotingVote[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'upcoming' | 'closed'>('all');

    // Form state
    const [newPos, setNewPos] = useState({
        title: '',
        description: '',
        criteria: '',
        startDate: '',
        dueDate: ''
    });

    useEffect(() => {
        fetchVotingPositions();
    }, [fetchVotingPositions]);

    useEffect(() => {
        const loadAnalyticsVotes = async () => {
            if (activeTab !== 'analytics' || votingPositions.length === 0) return;
            try {
                const voteCollections = await Promise.all(votingPositions.map(pos => fetchVotingVotes(pos.id)));
                setAnalyticsVotes(voteCollections.flat());
            } catch (error) {
                console.error('Failed to load analytics votes', error);
            }
        };

        loadAnalyticsVotes();

        if (activeTab === 'analytics') {
            const interval = setInterval(loadAnalyticsVotes, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab, votingPositions, fetchVotingVotes]);

    const activeElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'OPEN' && new Date(p.dueDate) > new Date()),
        [votingPositions]);

    const userContestantFor = useMemo(() => {
        return new Set(votingContestants.filter(c => c.userId === currentUser.uid).map(c => c.positionId));
    }, [votingContestants, currentUser.uid]);

    const getContestantStatus = (posId: string) => {
        return votingContestants.find(c => c.userId === currentUser.uid && c.positionId === posId)?.status;
    };

    const isUpcoming = (pos: VotingPosition) => new Date(pos.startDate) > new Date();
    const isVotingOpen = (pos: VotingPosition) => {
        const now = new Date();
        return now >= new Date(pos.startDate) && now <= new Date(pos.dueDate);
    };

    const formatDateTime = (date: string) => new Date(date).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const pastElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'CLOSED' || new Date(p.dueDate) <= new Date()),
        [votingPositions]);

    const electionStats = useMemo(() => {
        const now = new Date();
        const open = votingPositions.filter(p => now >= new Date(p.startDate) && now <= new Date(p.dueDate)).length;
        const upcoming = votingPositions.filter(p => new Date(p.startDate) > now).length;
        const closed = votingPositions.filter(p => now > new Date(p.dueDate) || p.status === 'CLOSED').length;
        return { open, upcoming, closed };
    }, [votingPositions]);

    const filteredActiveElections = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return activeElections
            .filter(pos => !term || pos.title.toLowerCase().includes(term) || (pos.description || '').toLowerCase().includes(term))
            .filter((pos) => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'open') return isVotingOpen(pos);
                if (statusFilter === 'upcoming') return isUpcoming(pos);
                return !isVotingOpen(pos) && !isUpcoming(pos);
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [activeElections, searchTerm, statusFilter]);

    const handleCreatePosition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPos.title || !newPos.dueDate) {
            showToast('Title and Due Date are required', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await createVotingPosition({
                ...newPos,
                createdBy: currentUser.uid
            });
            setNewPos({ title: '', description: '', criteria: '', startDate: '', dueDate: '' });
            showToast('Position created successfully', 'success');
            setActiveTab('active');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContest = async () => {
        if (!selectedPosition) return;
        if (!manifesto.trim()) {
            showToast('Please provide a manifesto', 'warning');
            return;
        }
        if (selectedPosition.criteria && !criteriaAgreed) {
            showToast('You must agree to the criteria', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await contestPosition(selectedPosition.id, manifesto);
            setShowContestModal(false);
            setManifesto('');
            setCriteriaAgreed(false);
            showToast('Application submitted successfully', 'success');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenVoteModal = async (pos: VotingPosition) => {
        setSelectedPosition(pos);
        const [fetchedContestants, fetchedVotes] = await Promise.all([
            fetchVotingContestants(pos.id),
            fetchVotingVotes(pos.id)
        ]);
        setContestants(fetchedContestants);
        setVotes(fetchedVotes);
        setShowVoteModal(true);
    };

    const handleCastVote = async (contestantId: string) => {
        if (!selectedPosition) return;
        if (!isVotingOpen(selectedPosition)) {
            showToast(`Voting opens on ${formatDateTime(selectedPosition.startDate)}`, 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await castVote(selectedPosition.id, contestantId);
            showToast('Vote cast successfully', 'success');
            setShowVoteModal(false);
            setSelectedPosition(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenResults = async (pos: VotingPosition) => {
        setSelectedPosition(pos);
        const [fetchedContestants, fetchedVotes] = await Promise.all([
            fetchVotingContestants(pos.id),
            fetchVotingVotes(pos.id)
        ]);
        setContestants(fetchedContestants);
        setVotes(fetchedVotes);
        setShowResultsModal(true);
    };

    const handleActionClick = (pos: VotingPosition, action: 'contest' | 'vote') => {
        const now = new Date();
        const hasClosed = now > new Date(pos.dueDate);

        setSelectedPosition(pos);

        if (action === 'contest') {
            if (hasClosed) {
                setStatusModalConfig({
                    title: 'Contest Closed',
                    message: 'Applications for this position are closed.',
                    type: 'closed',
                    date: pos.dueDate
                });
                setShowStatusModal(true);
                return;
            }
            setShowContestModal(true);
            return;
        }

        if (isVotingOpen(pos)) {
            handleOpenVoteModal(pos);
            return;
        }

        if (isUpcoming(pos)) {
            setStatusModalConfig({
                title: 'Voting Not Opened',
                message: 'Voting for this position has not started yet.',
                type: 'upcoming',
                date: pos.startDate
            });
        } else {
            setStatusModalConfig({
                title: 'Voting Closed',
                message: 'The voting window for this position has ended.',
                type: 'closed',
                date: pos.dueDate
            });
        }
        setShowStatusModal(true);
    };

    const getVoteCount = (contestantId: string) => {
        return votes.filter(v => v.contestantId === contestantId).length;
    };

    const hasUserVoted = useMemo(() => votes.some(v => v.voterId === currentUser.uid), [votes, currentUser.uid]);

    const approvedContestants = useMemo(() => {
        if (showResultsModal || showVoteModal) {
            return contestants.filter(c => c.status === 'APPROVED');
        }
        return votingContestants.filter(c => c.status === 'APPROVED');
    }, [contestants, votingContestants, showResultsModal, showVoteModal]);

    const pendingContestants = useMemo(() =>
        votingContestants.filter(c => c.status === 'PENDING'),
        [votingContestants]);

    const sortedResults = useMemo(() => {
        return [...approvedContestants].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id));
    }, [approvedContestants, votes]);

    const getTimeRemaining = (dueDate: string) => {
        const total = Date.parse(dueDate) - Date.parse(new Date().toString());
        if (total <= 0) return 'Ended';
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        if (days > 0) return `${days}d ${hours}h left`;
        return `${hours}h left`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Voting & Polls</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Participate in decision making and student leadership polls.</p>
                </div>
                <div className="flex flex-wrap p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-max">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                        Active ({electionStats.open + electionStats.upcoming})
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                        Past ({electionStats.closed})
                    </button>
                    {currentUser.role === 'PATRON' && (
                        <>
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'create' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                Manage
                            </button>
                            <button
                                onClick={() => setActiveTab('vetting')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'vetting' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                Vetting ({pendingContestants.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                Analytics
                            </button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'active' && (
                <div className="space-y-4">
                    {/* ADDED CREATE BUTTON IN SEARCH ROW HERE */}
                    <div className="flex flex-col lg:flex-row gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search elections by title or description..."
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="all">All statuses</option>
                            <option value="open">Open now</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="closed">Closed</option>
                        </select>

                        {currentUser.role === 'PATRON' && (
                            <button
                                onClick={() => setActiveTab('create')}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm whitespace-nowrap"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create New Poll
                            </button>
                        )}
                    </div>

                    {isLoadingVoting ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredActiveElections.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                            <ClipboardListIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No polls available</h3>
                            <p className="text-xs text-gray-400 mt-0.5">There are no active polls matching your search filter parameters.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredActiveElections.map((pos) => {
                                const openNow = isVotingOpen(pos);
                                const upCom = isUpcoming(pos);

                                return (
                                    <div key={pos.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-xs flex flex-col justify-between group relative overflow-hidden">
                                        <div>
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${openNow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : upCom ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-gray-50 text-gray-500'}`}>
                                                    {openNow ? 'Open' : upCom ? 'Upcoming' : 'Closed'}
                                                </span>
                                                <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                                                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    {getTimeRemaining(pos.dueDate)}
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                                                {pos.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2 min-h-[2rem]">
                                                {pos.description || 'No role context or summary specifications outlined.'}
                                            </p>

                                            {getContestantStatus(pos.id) && (
                                                <div className="mt-2 flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800/60">
                                                    <InfoIcon className="w-3.5 h-3.5 text-sky-500" />
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                        Application: <strong className="uppercase font-bold text-gray-700 dark:text-gray-200">{getContestantStatus(pos.id)}</strong>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`grid gap-2 mt-4 ${currentUser.role === 'PATRON' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            {currentUser.role === 'PATRON' ? (
                                                <button
                                                    onClick={() => handleActionClick(pos, 'contest')}
                                                    className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                                                >
                                                    <UserIcon className="w-4 h-4" />
                                                    Add Candidate
                                                </button>
                                            ) : (
                                                !userContestantFor.has(pos.id) && (
                                                    <button
                                                        onClick={() => handleActionClick(pos, 'contest')}
                                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Apply
                                                    </button>
                                                )
                                            )}

                                            <button
                                                onClick={() => handleActionClick(pos, 'vote')}
                                                className={`flex items-center justify-center gap-1 px-3 py-2 text-white text-xs font-bold rounded-xl transition-all ${openNow ? 'bg-sky-600 hover:bg-sky-700 shadow-sm' : 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'}`}
                                            >
                                                <VoteIcon className="w-4 h-4" />
                                                Vote Now
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'past' && (
                <div className="space-y-4">
                    {pastElections.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                            <HourglassIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No past elections</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Concluded poll archives will be viewable in this tab interface.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pastElections.map((pos) => (
                                <div key={pos.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">CLOSED</span>
                                            <span className="text-[10px] text-gray-400">{new Date(pos.dueDate).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{pos.title}</h3>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                                            {pos.description || 'No structural metrics or summaries registered for role.'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleOpenResults(pos)}
                                        className="mt-4 w-full flex items-center justify-center gap-1 px-3 py-2 border border-sky-100 dark:border-gray-700 hover:bg-sky-50 dark:hover:bg-gray-700/50 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-xl transition-all"
                                    >
                                        <BarChart3Icon className="w-4 h-4" />
                                        View Results
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'create' && currentUser.role === 'PATRON' && (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 max-w-xl mx-auto shadow-xs">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Poll Position</h2>
                    <form onSubmit={handleCreatePosition} className="space-y-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Title *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. ICT Club President"
                                value={newPos.title}
                                onChange={(e) => setNewPos({ ...newPos, title: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</label>
                            <textarea
                                rows={3}
                                placeholder="Responsibilities and scope details..."
                                value={newPos.description}
                                onChange={(e) => setNewPos({ ...newPos, description: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Requirements / Criteria</label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Sub-ICT project completion counts..."
                                value={newPos.criteria}
                                onChange={(e) => setNewPos({ ...newPos, criteria: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Start Date *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newPos.startDate}
                                    onChange={(e) => setNewPos({ ...newPos, startDate: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">End Date *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newPos.dueDate}
                                    onChange={(e) => setNewPos({ ...newPos, dueDate: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating Position...' : 'Publish Position'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'vetting' && currentUser.role === 'PATRON' && (
                <div className="space-y-3 max-w-2xl mx-auto">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Pending Nominations ({pendingContestants.length})</h2>
                    {pendingContestants.length === 0 ? (
                        <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                            <CheckIcon className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                            <h3 className="font-bold text-xs text-gray-800 dark:text-gray-200">Vetting clear</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">No pending applicant profiles require authorization.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingContestants.map((c) => {
                                const matchedUser = allUsers?.find(u => u.uid === c.userId);
                                const positionName = votingPositions.find(p => p.id === c.positionId)?.title || 'Unknown Position';

                                return (
                                    <div key={c.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                                                {matchedUser?.name || 'Anonymous User'} 
                                                <span className="text-[10px] font-normal text-gray-400 ml-1.5">({matchedUser?.email})</span>
                                            </h4>
                                            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">Role: {positionName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                                "{c.manifesto || 'No manifesto summary written.'}"
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                                            <button
                                                onClick={() => updateContestantStatus(c.id, 'REJECTED')}
                                                className="px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg transition-all"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => updateContestantStatus(c.id, 'APPROVED')}
                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'analytics' && currentUser.role === 'PATRON' && (
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Live Diagnostics Dashboard</h2>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Poll Categories</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">{votingPositions.length}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Running Candidates</span>
                            <span className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5 block">{approvedContestants.length}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Computed Votes</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{analyticsVotes.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showContestModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Apply for Position</h3>
                                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">{selectedPosition.title}</p>
                            </div>
                            <button onClick={() => { setShowContestModal(false); setSelectedPosition(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedPosition.criteria && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl space-y-1">
                                <div className="flex items-center gap-1 text-amber-800 dark:text-amber-400 text-xs font-bold">
                                    <AlertIcon className="w-4 h-4" /> Requirements Notice
                                </div>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    {selectedPosition.criteria}
                                </p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Manifesto Statement</label>
                            <textarea
                                rows={4}
                                required
                                value={manifesto}
                                onChange={(e) => setManifesto(e.target.value)}
                                placeholder="State why students should select your candidacy profile..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>

                        {selectedPosition.criteria && (
                            <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={criteriaAgreed}
                                    onChange={(e) => setCriteriaAgreed(e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded-sm border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                                    I certify that I meet all explicit candidate pre-requisite conditions stated above.
                                </span>
                            </label>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => { setShowContestModal(false); setSelectedPosition(null); }}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleContest}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVoteModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4 max-h-[80vh] flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Cast Your Ballot</h3>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Select your preferred choice candidate for: {selectedPosition.title}</p>
                                </div>
                                <button onClick={() => { setShowVoteModal(false); setSelectedPosition(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {hasUserVoted ? (
                                <div className="p-4 text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl space-y-1">
                                    <AlertIcon className="w-5 h-5 text-amber-500 mx-auto" />
                                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">Ballot Counted</h4>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">You have already processed a vote verification ledger entry here.</p>
                                </div>
                            ) : approvedContestants.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-xs">
                                    No authorized structural candidate entities currently listed in pool.
                                </div>
                            ) : (
                                <div className="space-y-2 overflow-y-auto max-h-[45vh] pr-1">
                                    {approvedContestants.map((c) => {
                                        const profile = allUsers?.find(u => u.uid === c.userId);
                                        return (
                                            <div key={c.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-sky-200 flex items-start justify-between gap-3 transition-all bg-gray-50/50 dark:bg-gray-900/40">
                                                <div className="space-y-1 flex-1">
                                                    <h4 className="font-bold text-xs text-gray-900 dark:text-white">{profile?.name || 'Running Candidate'}</h4>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700/60">
                                                        "{c.manifesto || 'No background statement summary reported.'}"
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleCastVote(c.id)}
                                                    disabled={isSubmitting}
                                                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all shrink-0"
                                                >
                                                    Vote
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => { setShowVoteModal(false); setSelectedPosition(null); }}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
                            >
                                Close Ballot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showResultsModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Ballot Tallies</h3>
                                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">{selectedPosition.title}</p>
                            </div>
                            <button onClick={() => { setShowResultsModal(false); setSelectedPosition(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {sortedResults.length === 0 ? (
                                <p className="text-center py-4 text-xs text-gray-400">No active tracking history metrics recorded.</p>
                            ) : (
                                sortedResults.map((c, idx) => {
                                    const profile = allUsers?.find(u => u.uid === c.userId);
                                    const count = getVoteCount(c.id);
                                    const totalVotes = votes.length || 1;
                                    const percentage = Math.round((count / totalVotes) * 100);

                                    return (
                                        <div key={c.id} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                                                <span>{idx === 0 && count > 0 ? '👑 ' : ''}{profile?.name || 'Candidate'}</span>
                                                <span>{count} votes ({percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${idx === 0 && count > 0 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                onClick={() => { setShowResultsModal(false); setSelectedPosition(null); }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStatusModal && statusModalConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-4 shadow-xl space-y-3 text-center">
                        <div className={`p-2 rounded-full max-w-max mx-auto ${statusModalConfig.type === 'upcoming' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                            {statusModalConfig.type === 'upcoming' ? <ClockIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{statusModalConfig.title}</h3>
                            <p className="text-xs text-gray-400 mt-1">{statusModalConfig.message}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border text-[10px] font-bold text-gray-600 dark:text-gray-300">
                            {statusModalConfig.type === 'upcoming' ? 'Opens: ' : 'Closed: '}
                            {formatDateTime(statusModalConfig.date)}
                        </div>
                        <button
                            onClick={() => { setShowStatusModal(false); setStatusModalConfig(null); setSelectedPosition(null); }}
                            className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VotingPage;