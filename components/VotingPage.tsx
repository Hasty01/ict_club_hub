
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { VotingPosition, VotingContestant, User } from '../types';
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

const VotingPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const {
        votingPositions,
        fetchVotingPositions,
        createVotingPosition,
        updateVotingPosition,
        fetchVotingContestants,
        contestPosition,
        castVote,
        fetchVotingVotes,
        isLoadingVoting,
        votingError,
        showToast,
        allUsers
    } = useData();

    const [activeTab, setActiveTab] = useState<'active' | 'past' | 'create'>('active');
    const [selectedPosition, setSelectedPosition] = useState<VotingPosition | null>(null);
    const [showContestModal, setShowContestModal] = useState(false);
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);

    const [manifesto, setManifesto] = useState('');
    const [criteriaAgreed, setCriteriaAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contestants, setContestants] = useState<VotingContestant[]>([]);
    const [votes, setVotes] = useState<any[]>([]);

    // Form state for creating position
    const [newPos, setNewPos] = useState({
        title: '',
        description: '',
        criteria: '',
        dueDate: ''
    });

    useEffect(() => {
        fetchVotingPositions();
    }, [fetchVotingPositions]);

    const activeElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'OPEN' && new Date(p.dueDate) > new Date()),
        [votingPositions]);

    const pastElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'CLOSED' || new Date(p.dueDate) <= new Date()),
        [votingPositions]);

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
            setNewPos({ title: '', description: '', criteria: '', dueDate: '' });
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
        setIsSubmitting(true);
        try {
            await castVote(selectedPosition.id, contestantId);
            setShowVoteModal(false);
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

    const getVoteCount = (contestantId: string) => {
        return votes.filter(v => v.contestantId === contestantId).length;
    };

    const sortedResults = useMemo(() => {
        return [...contestants].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id));
    }, [contestants, votes]);

    const getTimeRemaining = (dueDate: string) => {
        const total = Date.parse(dueDate) - Date.parse(new Date().toString());
        if (total <= 0) return 'Ended';
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        if (days > 0) return `${days}d ${hours}h left`;
        return `${hours}h remaining`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700 glassmorphism">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900/40 rounded-xl text-pink-600 dark:text-pink-400">
                            <VoteIcon className="w-7 h-7" />
                        </div>
                        Voting Hub
                    </h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                        Shape the future of the club. Contest for positions, review candidates, and cast your vote.
                    </p>
                </div>

                <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Past
                    </button>
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'create' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Post Position
                        </button>
                    )}
                </div>
            </div>

            {votingError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
                    <AlertIcon className="w-5 h-5" />
                    <p>{votingError}</p>
                </div>
            )}

            {isLoadingVoting ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : activeTab === 'active' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeElections.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center px-4">
                            <VoteIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Active Elections</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Check back later or view past results.</p>
                        </div>
                    ) : activeElections.map(pos => (
                        <div key={pos.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Open
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                    <ClockIcon className="w-3 h-3" />
                                    {getTimeRemaining(pos.dueDate)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-pink-600 transition-colors">
                                {pos.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 flex-grow">
                                {pos.description || 'No description provided.'}
                            </p>

                            {pos.criteria && (
                                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
                                        <InfoIcon className="w-3.5 h-3.5" />
                                        Contesting Criteria
                                    </p>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 italic">
                                        {pos.criteria}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => { setSelectedPosition(pos); setShowContestModal(true); }}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    Contest
                                </button>
                                <button
                                    onClick={() => handleOpenVoteModal(pos)}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 shadow-lg shadow-pink-500/25 transition-all text-sm"
                                >
                                    <VoteIcon className="w-4 h-4" />
                                    Vote Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'past' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastElections.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center px-4">
                            <BarChart3Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Past Elections</h3>
                        </div>
                    ) : pastElections.map(pos => (
                        <div key={pos.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Closed
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    Ended {new Date(pos.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {pos.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-6 flex-grow">
                                {pos.description}
                            </p>

                            <button
                                onClick={() => handleOpenResults(pos)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all text-sm"
                            >
                                <BarChart3Icon className="w-4 h-4" />
                                View Results
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Position</h3>
                    <form onSubmit={handleCreatePosition} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Position Title</label>
                            <input
                                type="text"
                                required
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all dark:text-white"
                                placeholder="e.g. Club President"
                                value={newPos.title}
                                onChange={e => setNewPos({ ...newPos, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[120px] dark:text-white"
                                placeholder="Describe the responsibilities..."
                                value={newPos.description}
                                onChange={e => setNewPos({ ...newPos, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Contesting Criteria</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[80px] dark:text-white"
                                placeholder="Who is eligible? (e.g. Must be a member for 6 months)"
                                value={newPos.criteria}
                                onChange={e => setNewPos({ ...newPos, criteria: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Voting Deadline</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all dark:text-white"
                                value={newPos.dueDate}
                                onChange={e => setNewPos({ ...newPos, dueDate: e.target.value })}
                            />
                        </div>
                        <button
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Posting...' : 'Post Position'}
                        </button>
                    </form>
                </div>
            )}

            {/* Contest Modal */}
            {showContestModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Contest for {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">Submit your manifesto to the club</p>
                            </div>
                            <button
                                onClick={() => setShowContestModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {selectedPosition.criteria && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                    <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-2">
                                        <AlertIcon className="w-4 h-4" />
                                        Confirm Eligibility
                                    </h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 italic">
                                        {selectedPosition.criteria}
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 transition-all"
                                            checked={criteriaAgreed}
                                            onChange={e => setCriteriaAgreed(e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-amber-800/80 dark:text-amber-400/80 group-hover:text-amber-900">
                                            I confirm that I meet the criteria for this position.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Your Manifesto</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[160px] dark:text-white text-sm"
                                    placeholder="Explain why you are the best fit for this role..."
                                    value={manifesto}
                                    onChange={e => setManifesto(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowContestModal(false)}
                                    className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting || (selectedPosition.criteria && !criteriaAgreed)}
                                    onClick={handleContest}
                                    className="flex-[2] py-4 bg-pink-600 text-white rounded-2xl font-bold hover:bg-pink-700 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vote Modal */}
            {showVoteModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vote for {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{contestants.length} Contestants</p>
                            </div>
                            <button
                                onClick={() => setShowVoteModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {contestants.length === 0 ? (
                                <div className="text-center py-10">
                                    <UserIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500">No one has contested for this position yet.</p>
                                </div>
                            ) : contestants.map(contestant => (
                                <div key={contestant.id} className="p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src={contestant.userAvatarUrl || `https://i.pravatar.cc/100?u=${contestant.userId}`}
                                            alt={contestant.userName}
                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                        />
                                        <div>
                                            <h4 className="font-extrabold text-gray-900 dark:text-white text-lg">{contestant.userName}</h4>
                                            <p className="text-xs text-pink-600 dark:text-pink-400 font-bold uppercase tracking-widest">Candidate</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl mb-4 text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                        "{contestant.manifesto}"
                                    </div>
                                    <button
                                        disabled={isSubmitting}
                                        onClick={() => handleCastVote(contestant.id)}
                                        className="w-full py-4 bg-white dark:bg-gray-700 border-2 border-pink-100 dark:border-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl font-bold hover:bg-pink-600 hover:text-white dark:hover:bg-pink-600 dark:hover:text-white transition-all shadow-sm"
                                    >
                                        Cast My Vote
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {showResultsModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Results: {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{votes.length} Votes Cast Total</p>
                            </div>
                            <button
                                onClick={() => setShowResultsModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {sortedResults.length === 0 ? (
                                <div className="text-center py-10 font-medium text-gray-500">
                                    No data available for this election.
                                </div>
                            ) : sortedResults.map((contestant, index) => {
                                const count = getVoteCount(contestant.id);
                                const percent = votes.length > 0 ? (count / votes.length) * 100 : 0;

                                return (
                                    <div key={contestant.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {index === 0 && <span className="p-1 px-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-black uppercase">Winner</span>}
                                                <h4 className="font-bold text-gray-900 dark:text-white">{contestant.userName}</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-gray-900 dark:text-white">{count}</span>
                                                <span className="text-xs text-gray-400 ml-1">votes ({percent.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden p-[2px]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-sm' : 'bg-gray-300 dark:bg-gray-500'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="mt-8 p-6 bg-pink-50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/30">
                                <div className="flex items-center gap-3 text-pink-700 dark:text-pink-300">
                                    <CheckIcon className="w-6 h-6" />
                                    <div>
                                        <h5 className="font-bold">Election Finalized</h5>
                                        <p className="text-sm opacity-80">This election is officially closed and the results are final.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VotingPage;
