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

    // Form state for creating position
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

    // Helper to completely scrub active states when closing overlays
    const closeModalsAndResetLocalData = () => {
        setShowVoteModal(false);
        setShowResultsModal(false);
        setShowContestModal(false);
        setShowStatusModal(false);
        setContestants([]);
        setVotes([]);
        setSelectedPosition(null);
    };

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
            showToast('Poll/Election created successfully!', 'success');
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
            showToast('Application submitted successfully!', 'success');
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
            showToast(`Voting opens on ${formatDateTime(selectedPosition.startDate)}.`, 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await castVote(selectedPosition.id, contestantId);
            showToast('Your vote has been counted!', 'success');
            closeModalsAndResetLocalData();
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
                    title: 'Contest Period Closed',
                    message: 'Contest entries for this position are now closed. You can view the final results in the Results tab.',
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
                title: 'Voting Not Yet Open',
                message: 'Voting for this position has not started yet. You can still review candidates and manifestos before the opening time.',
                type: 'upcoming',
                date: pos.startDate
            });
        } else {
            setStatusModalConfig({
                title: 'Voting Period Closed',
                message: 'The voting period for this position has ended. You can view the final results in the Results tab.',
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
        return `${hours}h remaining`;
    };

    const isPatron = currentUser?.role === 'PATRON';

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        Elections & Polls Hub
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Cast your vote, apply for leadership, or manage active institutional polls.
                    </p>
                </div>
                
                {/* Global Tab Switchers */}
                <div className="flex flex-wrap p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-max self-start md:self-center">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Active Polls ({electionStats.open + electionStats.upcoming})
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Past Results ({electionStats.closed})
                    </button>
                    
                    {isPatron && (
                        <>
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'create' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                Create Poll
                            </button>
                            <button
                                onClick={() => setActiveTab('vetting')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'vetting' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                Vetting ({pendingContestants.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                Analytics
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* TAB CONTENT: ACTIVE ELECTIONS */}
            {activeTab === 'active' && (
                <div className="space-y-6">
                    {/* Filter and Instant Creation Row */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search elections by title or description..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="open">Open Now</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>

                        {/* CRITICAL: Explicit New Poll Button Visible to Creators */}
                        {isPatron && (
                            <button
                                onClick={() => setActiveTab('create')}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md shadow-sky-500/10 transition-all text-sm whitespace-nowrap"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create New Poll
                            </button>
                        )}
                    </div>

                    {isLoadingVoting ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredActiveElections.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                            <ClipboardListIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No active polls found</h3>
                            <p className="text-sm text-gray-400 mt-1">Adjust your filters or query params above.</p>
                            {isPatron && (
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className="mt-4 text-xs font-bold text-sky-600 hover:underline inline-flex items-center gap-1"
                                >
                                    Launch one now <ChevronRightIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredActiveElections.map((pos) => {
                                const openNow = isVotingOpen(pos);
                                const upCom = isUpcoming(pos);

                                return (
                                    <div key={pos.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
                                        <div>
                                            <div className="flex justify-between items-start gap-2 mb-3">
                                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${openNow ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : upCom ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-gray-50 text-gray-500'}`}>
                                                    {openNow ? 'Live Voting' : upCom ? 'Upcoming' : 'Closed'}
                                                </span>
                                                <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                                                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    {getTimeRemaining(pos.dueDate)}
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                                                {pos.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                                                {pos.description || 'No additional summary details provided for this entry.'}
                                            </p>

                                            {getContestantStatus(pos.id) && (
                                                <div className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/60">
                                                    <InfoIcon className="w-3.5 h-3.5 text-sky-500" />
                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                        Your Status: <strong className="uppercase font-bold text-gray-700 dark:text-gray-200">{getContestantStatus(pos.id)}</strong>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`grid gap-2.5 mt-5 ${isPatron ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            {isPatron ? (
                                                <button
                                                    onClick={() => handleActionClick(pos, 'contest')}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                                                >
                                                    <UserIcon className="w-3.5 h-3.5" />
                                                    Add Candidate
                                                </button>
                                            ) : (
                                                !userContestantFor.has(pos.id) && (
                                                    <button
                                                        onClick={() => handleActionClick(pos, 'contest')}
                                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                                                    >
                                                        <PlusIcon className="w-3.5 h-3.5" />
                                                        Apply
                                                    </button>
                                                )
                                            )}

                                            <button
                                                onClick={() => handleActionClick(pos, 'vote')}
                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-white text-xs font-bold rounded-xl transition-all ${openNow ? 'bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-500/10' : 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'}`}
                                            >
                                                <VoteIcon className="w-3.5 h-3.5" />
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

            {/* TAB CONTENT: PAST RESULTS */}
            {activeTab === 'past' && (
                <div className="space-y-6">
                    {pastElections.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                            <HourglassIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No archival election metrics</h3>
                            <p className="text-sm text-gray-400 mt-1">When an election timeline finishes, its results display here.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastElections.map((pos) => (
                                <div key={pos.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                CONCLUDED
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                Ended {new Date(pos.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{pos.title}</h3>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                            {pos.description || 'No additional background documentation logged.'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleOpenResults(pos)}
                                        className="mt-5 w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-sky-100 dark:border-gray-700 hover:bg-sky-50 dark:hover:bg-gray-700/50 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-xl transition-all"
                                    >
                                        <BarChart3Icon className="w-3.5 h-3.5" />
                                        View Ballot Tallies
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: CREATE NEW POLL / POSITION FORM */}
            {activeTab === 'create' && isPatron && (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                        <div className="p-2.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                            <PlusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configure New Public Poll</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Initialize a new secure ballot or election timeline container.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreatePosition} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                Title / Role Position *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Guild President, Vice Chairman, Tech Lead"
                                value={newPos.title}
                                onChange={(e) => setNewPos({ ...newPos, title: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                Description Context
                            </label>
                            <textarea
                                rows={3}
                                placeholder="State responsibilities, scope, expectations, or background parameters..."
                                value={newPos.description}
                                onChange={(e) => setNewPos({ ...newPos, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                Entry Filters / Nomination Criteria
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g., Must have a CGPA > 3.5, must be in Senior 5 or second year..."
                                value={newPos.criteria}
                                onChange={(e) => setNewPos({ ...newPos, criteria: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                    Start Operational Window *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newPos.startDate}
                                    onChange={(e) => setNewPos({ ...newPos, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                    Due Closing Deadline *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newPos.dueDate}
                                    onChange={(e) => setNewPos({ ...newPos, dueDate: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-sky-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Writing to Ledger...' : 'Publish Active Poll Container'}
                        </button>
                    </form>
                </div>
            )}

            {/* TAB CONTENT: VETTING INTERFACE */}
            {activeTab === 'vetting' && isPatron && (
                <div className="space-y-4 max-w-4xl mx-auto">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Pending Candidate Approvals ({pendingContestants.length})
                    </h2>
                    
                    {pendingContestants.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                            <CheckIcon className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Vetting queue is empty</h3>
                            <p className="text-xs text-gray-400 mt-0.5">No new member submissions are awaiting approval.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingContestants.map((c) => {
                                const matchedUser = allUsers?.find(u => u.uid === c.userId);
                                const positionName = votingPositions.find(p => p.id === c.positionId)?.title || 'Unknown Position';

                                return (
                                    <div key={c.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-2">
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                                    {matchedUser?.name || 'Anonymous User'} 
                                                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-2">({matchedUser?.email})</span>
                                                </h4>
                                                <p className="text-xs text-sky-600 dark:text-sky-400 font-bold mt-0.5">
                                                    Applying for: {positionName}
                                                </p>
                                            </div>
                                            <blockquote className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border-l-2 border-gray-200 dark:border-gray-700 italic text-gray-600 dark:text-gray-400">
                                                "{c.manifesto || 'No written manifesto declared.'}"
                                            </blockquote>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-center">
                                            <button
                                                onClick={() => updateContestantStatus(c.id, 'REJECTED')}
                                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold rounded-lg transition-all"
                                            >
                                                Deny Entry
                                            </button>
                                            <button
                                                onClick={() => updateContestantStatus(c.id, 'APPROVED')}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
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

            {/* TAB CONTENT: ANALYTICS RUNTIME VIEW */}
            {activeTab === 'analytics' && isPatron && (
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Real-Time Poll Diagnostics</h2>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Tracked Containers</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{votingPositions.length}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Approved Running Candidates</span>
                            <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">{approvedContestants.length}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Cached Ballots Computed</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{analyticsVotes.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL OVERLAY: APPLY / CONTEST POSITION */}
            {showContestModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submit Candidate Profile</h3>
                                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">{selectedPosition.title}</p>
                            </div>
                            <button onClick={closeModalsAndResetLocalData} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedPosition.criteria && (
                            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60 rounded-xl space-y-1.5">
                                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-xs font-bold">
                                    <AlertIcon className="w-4 h-4" /> Threshold Prerequisites
                                </div>
                                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                    {selectedPosition.criteria}
                                </p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Written Manifesto / Statement</label>
                            <textarea
                                rows={4}
                                required
                                value={manifesto}
                                onChange={(e) => setManifesto(e.target.value)}
                                placeholder="Explain why members should cast their ballot for you..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </div>

                        {selectedPosition.criteria && (
                            <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={criteriaAgreed}
                                    onChange={(e) => setCriteriaAgreed(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                                    I completely confirm that I meet all stated pre-requisites for this role.
                                </span>
                            </label>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={closeModalsAndResetLocalData}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleContest}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Register Candidate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL OVERLAY: LIVE CAST BALLOT MODAL */}
            {showVoteModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col justify-between animate-in zoom-in-95 duration-200">
                        <div>
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cast Your Secure Vote</h3>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Select a candidate below for: <strong>{selectedPosition.title}</strong></p>
                                </div>
                                <button onClick={closeModalsAndResetLocalData} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {hasUserVoted ? (
                                <div className="p-4 text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl space-y-1">
                                    <AlertIcon className="w-6 h-6 text-amber-500 mx-auto" />
                                    <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">Ballot Already Processed</h4>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">You have already submitted a ballot entry for this election position.</p>
                                </div>
                            ) : approvedContestants.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-xs">
                                    No vetted candidates are currently running in this category.
                                </div>
                            ) : (
                                <div className="space-y-3 overflow-y-auto max-h-[45vh] pr-1">
                                    {approvedContestants.map((c) => {
                                        const profile = allUsers?.find(u => u.uid === c.userId);
                                        return (
                                            <div key={c.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-sky-300 dark:hover:border-sky-500 flex items-start justify-between gap-4 transition-all bg-gray-50/50 dark:bg-gray-900/40">
                                                <div className="space-y-1.5 flex-1">
                                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{profile?.name || 'Candidate Member'}</h4>
                                                    <p className="text-xs text-gray-550 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60">
                                                        "{c.manifesto || 'No written manifesto declared.'}"
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleCastVote(c.id)}
                                                    disabled={isSubmitting}
                                                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700 mt-4">
                            <button
                                onClick={closeModalsAndResetLocalData}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL OVERLAY: BALLOT TALLIES / RESULTS VIEW */}
            {showResultsModal && selectedPosition && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Final Election Metrics</h3>
                                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">{selectedPosition.title}</p>
                            </div>
                            <button onClick={closeModalsAndResetLocalData} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {sortedResults.length === 0 ? (
                                <p className="text-center py-6 text-xs text-gray-400">No active tracking history logs found.</p>
                            ) : (
                                sortedResults.map((c, idx) => {
                                    const profile = allUsers?.find(u => u.uid === c.userId);
                                    const tally = getVoteCount(c.id);
                                    const grossVotes = votes.length || 1;
                                    const ratio = Math.round((tally / grossVotes) * 100);

                                    return (
                                        <div key={c.id} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                                                <span>
                                                    {idx === 0 && tally > 0 ? '👑 ' : ''}
                                                    {profile?.name || 'Running Candidate'}
                                                </span>
                                                <span>{tally} votes ({ratio}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${idx === 0 && tally > 0 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                                    style={{ width: `${ratio}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={closeModalsAndResetLocalData}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                            >
                                Dismiss Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL OVERLAY: STATUS ALERTS (UPCOMING/CLOSED WARNINGS) */}
            {showStatusModal && statusModalConfig && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-5 shadow-xl space-y-3.5 text-center animate-in zoom-in-95 duration-150">
                        <div className={`p-3 rounded-full max-w-max mx-auto ${statusModalConfig.type === 'upcoming' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40' : 'bg-red-50 text-red-500 dark:bg-red-950/40'}`}>
                            {statusModalConfig.type === 'upcoming' ? <ClockIcon className="w-6 h-6" /> : <AlertIcon className="w-6 h-6" />}
                        </div>
                        
                        <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">{statusModalConfig.title}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed px-2">
                                {statusModalConfig.message}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            {statusModalConfig.type === 'upcoming' ? 'Opens: ' : 'Closed: '}
                            {formatDateTime(statusModalConfig.date)}
                        </div>

                        <button
                            onClick={closeModalsAndResetLocalData}
                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VotingPage;