import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Users, Zap, Terminal } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const joinRoom = (e) => {
        e.preventDefault();
        if (username.trim() && roomId.trim()) {
            localStorage.setItem('username', username);
            navigate(`/room/${roomId}`);
        }
    };

    const createRoom = () => {
        if (username.trim()) {
            localStorage.setItem('username', username);
            const newRoom = Math.random().toString(36).substring(2, 10);
            navigate(`/room/${newRoom}`);
        } else {
            alert("Please enter a username first.");
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 mix-blend-multiply dark:mix-blend-screen" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 mix-blend-multiply dark:mix-blend-screen" />

            <div className="text-center max-w-3xl mb-12">
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                    Code together,
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                        powered by AI.
                    </span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Real-time collaborative workspace for hackathon teams. Seamless conflict resolution with context-aware smart completions.
                </p>
            </div>

            <div className="w-full max-w-md bg-white/50 dark:bg-darkCard/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8">
                <form onSubmit={joinRoom} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-colors"
                            placeholder="e.g. hackerman"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Room ID</label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-colors font-mono"
                            placeholder="e.g. my-awesome-project"
                        />
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Users size={18} />
                            Join Room
                        </button>
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
                            <span className="shrink-0 px-4 text-sm text-slate-500">or</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <button
                            type="button"
                            onClick={createRoom}
                            className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Zap size={18} className="text-amber-500" />
                            Create New Room
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
                {[
                    { icon: Terminal, title: 'CRDT Sync', desc: 'Flawless real-time editing using Yjs.' },
                    { icon: Zap, title: 'AI Assisted', desc: 'Context-aware completions right as you type.' },
                    { icon: Users, title: 'Multiplayer', desc: 'See cursors and collaborate with no latency.' }
                ].map((feature, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl glass-panel">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                            <feature.icon size={24} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
