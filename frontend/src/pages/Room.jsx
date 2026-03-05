import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';
import { io } from 'socket.io-client';
import { Users, Send, Wand2, ArrowLeft, Play, TerminalSquare } from 'lucide-react';
import axios from 'axios';

const socket = io('http://localhost:5000'); // Or your backend URL

const SUPPORTED_LANGUAGES = [
    { name: 'JavaScript', value: 'javascript' },
    { name: 'Python', value: 'python' },
    { name: 'C++', value: 'cpp' },
    { name: 'Java', value: 'java' },
];

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [username] = useState(localStorage.getItem('username') || 'Anonymous');
    const [users, setUsers] = useState([]);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState('');

    // AI state
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const typingTimeoutRef = useRef(null);

    // Compiler state
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);
    const [isOutputVisible, setIsOutputVisible] = useState(true);

    // Yjs state
    const ydocRef = useRef(new Y.Doc());
    const providerRef = useRef(null);
    const [extensions, setExtensions] = useState([javascript()]);

    // AI Debounce function
    const triggerAiCompletion = async (contextText) => {
        if (contextText.length < 10) return;
        setIsAiLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/ai/complete', {
                context: contextText,
                prompt: "Complete the following code structure.",
                patterns: {}
            });
            if (res.data.suggestion && res.data.suggestion.trim().length > 0) {
                setAiSuggestion(res.data.suggestion.trim());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        if (!username) navigate('/');

        // Socket.io for Presence & Chat
        socket.emit('join-room', roomId, socket.id, username);

        socket.on('users-list', (list) => {
            setUsers(list);
        });

        socket.on('chat-message', (data) => {
            setChat(prev => [...prev, data]);
        });

        // Yjs WebSocket connection for Code Sync
        const provider = new WebsocketProvider(
            'ws://localhost:5000', // Matches backend WSS
            roomId,
            ydocRef.current
        );
        providerRef.current = provider;

        const ytext = ydocRef.current.getText('monaco');
        setExtensions([
            javascript(),
            yCollab(ytext, provider.awareness)
        ]);

        ytext.observe(() => {
            // Debounce AI ghost text logic
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                const text = ytext.toString();
                // Only trigger if we end with a space or newline (rough typing pause)
                if (text.endsWith(' ') || text.endsWith('\n')) {
                    triggerAiCompletion(text);
                }
            }, 2000); // 2 second pause
        });

        provider.awareness.setLocalStateField('user', {
            name: username,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0') // Random color for cursor
        });

        return () => {
            provider.destroy();
            ydocRef.current.destroy();
            socket.off('users-list');
            socket.off('chat-message');
        };
    }, [roomId, username, navigate]);

    const sendChat = (e) => {
        e.preventDefault();
        if (msg.trim()) {
            const data = { username, text: msg };
            socket.emit('chat-message', { roomId, ...data });
            setChat(prev => [...prev, data]);
            setMsg('');
        }
    };

    const handleAskAI = async () => {
        try {
            const currentCode = ydocRef.current.getText('monaco').toString();
            const promptStr = prompt("What should the AI do with this code?");
            if (!promptStr) return;

            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/ai/complete', {
                context: currentCode,
                prompt: promptStr,
                patterns: {}
            }, {
                headers: { Authorization: `Bearer ${token || 'test'}` }
            });

            const ytext = ydocRef.current.getText('monaco');
            ytext.insert(ytext.length, `\n\n/* AI: ${promptStr} */\n${res.data.suggestion}\n`);
        } catch (err) {
            console.error(err);
            alert('AI Request failed.');
        }
    };

    const handleRunCode = async () => {
        setIsCompiling(true);
        setOutput('Executing code...');
        setIsOutputVisible(true);
        try {
            const currentCode = ydocRef.current.getText('monaco').toString();
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/execute', {
                language: selectedLanguage,
                sourceCode: currentCode
            }, {
                headers: { Authorization: `Bearer ${token || 'test'}` }
            });

            if (res.data.compile && res.data.compile.stderr) {
                setOutput(`Compilation Error:\n${res.data.compile.stderr}`);
            } else if (res.data.run && res.data.run.stderr) {
                setOutput(`Runtime Error:\n${res.data.run.stderr}\n\nOutput:\n${res.data.run.stdout}`);
            } else if (res.data.run) {
                setOutput(res.data.run.stdout || 'Program executed successfully with no output.');
            } else {
                setOutput('Unhandled response format.');
            }
        } catch (err) {
            console.error(err);
            setOutput(`Error: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsCompiling(false);
        }
    };

    return (
        <div className="flex-1 flex gap-4 p-4 max-w-screen-2xl mx-auto w-full h-[calc(100vh-4rem)]">
            {/* Editor Main */}
            <div className="flex-1 flex flex-col bg-white dark:bg-darkCard rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition">
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="text-slate-400">Room:</span> {roomId}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAiLoading && <span className="text-xs text-indigo-400 animate-pulse font-medium">AI thinking...</span>}
                        {aiSuggestion && (
                            <div className="text-xs flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 px-3 py-1.5 rounded-lg">
                                <span className="font-bold">✨ Suggestion</span>
                                <span className="opacity-70 truncate max-w-[100px]">{aiSuggestion.split('\n')[0]}...</span>
                                <button onClick={() => {
                                    const ytext = ydocRef.current.getText('monaco');
                                    ytext.insert(ytext.length, aiSuggestion);
                                    setAiSuggestion('');
                                }} className="hover:text-indigo-600 dark:hover:text-indigo-300 font-bold transition ml-1">Accept</button>
                                <button onClick={() => setAiSuggestion('')} className="hover:text-red-500 transition ml-1">Reject</button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-2">
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer pl-2 pr-4 border-r border-slate-200 dark:border-slate-700"
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={lang.value} value={lang.value}>{lang.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleRunCode}
                                disabled={isCompiling}
                                className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md transition ${isCompiling
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-600 text-white shadow-sm active:scale-95'
                                    }`}
                            >
                                <Play size={14} fill={isCompiling ? 'none' : 'currentColor'} />
                                {isCompiling ? 'Running...' : 'Run'}
                            </button>
                        </div>
                        <button
                            onClick={handleAskAI}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition active:scale-95 shadow-sm ml-2"
                        >
                            <Wand2 size={16} />
                            Prompt AI
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-[#282c34] relative code-editor-wrapper">
                    <CodeMirror
                        value={''} // Value is handled by Yjs
                        height="100%"
                        theme={oneDark}
                        extensions={extensions}
                        className="h-full text-base font-mono"
                        basicSetup={{
                            lineNumbers: true,
                            highlightActiveLineGutter: true,
                            foldGutter: true,
                            dropCursor: false,
                            allowMultipleSelections: true,
                            indentOnInput: true,
                        }}
                    />
                </div>

                {/* Output Terminal Pane */}
                {isOutputVisible && (
                    <div className="h-48 border-t border-slate-200 dark:border-slate-800 bg-[#1e2227] flex flex-col shrink-0">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#282c34] border-b border-[#1e2227]">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-wider">
                                <TerminalSquare size={14} />
                                OUTPUT
                            </div>
                            <button
                                onClick={() => setIsOutputVisible(false)}
                                className="text-slate-500 hover:text-slate-300 transition text-xs"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 p-3 overflow-auto font-mono text-sm">
                            {output ? (
                                <pre className={`whitespace-pre-wrap ${output.includes('Error:') || output.includes('Compilation Error') || output.includes('Runtime Error')
                                        ? 'text-red-400'
                                        : 'text-slate-300'
                                    }`}>
                                    {output}
                                </pre>
                            ) : (
                                <div className="text-slate-500 italic">Click "Run" to execute your code...</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar (Chat & Users) */}
            <div className="w-80 flex flex-col gap-4">
                {/* Users */}
                <div className="bg-white dark:bg-darkCard rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 h-64 flex flex-col">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                        <Users size={16} /> Online ({users.length})
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {users.map((u, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{u.username}</span>
                                {u.username === username && <span className="text-xs text-slate-400 ml-auto">(You)</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 bg-white dark:bg-darkCard rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Team Chat</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {chat.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-slate-500 mb-1 px-1">{msg.username}</span>
                                <div className={`px-3 py-2 rounded-2xl text-sm ${msg.username === username
                                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={sendChat} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                        <input
                            type="text"
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none transition"
                        />
                        <button
                            type="submit"
                            disabled={!msg.trim()}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
