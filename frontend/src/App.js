import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark'; // npm i @uiw/react-codemirror codemirror @codemirror/lang-javascript @codemirror/theme-one-dark if missing
import KMeans from 'ml-kmeans';

const socket = io('http://localhost:5000');

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [code, setCode] = useState('// Team code starts here...');
  const [suggestion, setSuggestion] = useState('');
  const [users, setUsers] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  const [patterns, setPatterns] = useState({ react: 0, node: 0 });
  const [darkMode, setDarkMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Voice init
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        const prompt = event.results[0][0].transcript;
        getSuggestion(prompt);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
    }

    // Socket listeners
    socket.on('user-joined', (user) => setUsers((prev) => [...prev, user]));
    socket.on('user-left', (user) => setUsers((prev) => prev.filter(u => u.username !== user.username)));
    socket.on('users-list', setUsers);
    socket.on('code-update', (data) => setCode(data.code));
    socket.on('cursor-update', (data) => {
      setCursorPositions((prev) => ({ ...prev, [data.username]: data.cursorPos }));
    });
    socket.on('patterns-clustered', setPatterns);
    socket.on('anomaly-alert', (alert) => alert(`Alert: ${alert.msg}`)); // Sidebar toast stub

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('users-list');
      socket.off('code-update');
      socket.off('cursor-update');
      socket.off('patterns-clustered');
      socket.off('anomaly-alert');
    };
  }, []);

  const login = async () => {
    const res = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const { token: newToken } = await res.json();
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const joinRoom = () => {
    socket.emit('join-room', roomId, socket.id, username);
  };

  const onCodeChange = (value) => {
    setCode(value);
    socket.emit('code-change', { roomId, code: value, cursorPos: { line: 0, ch: 0 } });

    // Pattern tracking
    const reactCount = (value.match(/import.*React/g) || []).length;
    const nodeCount = (value.match(/require.*express/g) || []).length;
    const newPatterns = { react: reactCount, node: nodeCount };
    setPatterns(newPatterns);
    socket.emit('pattern-update', { roomId, patterns: newPatterns });
  };

  const getSuggestion = async (prompt) => {
    const res = await fetch('http://localhost:5000/ai/complete', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ prompt, context: code, patterns, roomId })
    });
    const { suggestion: sug, warnings, secure } = await res.json();
    setSuggestion(sug || `Warning: ${warnings?.join(', ')}`);
    if (!secure) alert('Vuln detected – check logs!');
  };

  const startVoice = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert('Voice not supported in this browser');
    }
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (!token) {
    return (
      <div style={{ padding: '20px', background: darkMode ? '#1e1e1e' : '#fff', color: darkMode ? '#fff' : '#000' }}>
        <h1>CodeForge AI: PS8 Hackathon Co-Editor</h1>
        <input placeholder="Username (e.g., akil)" value={username} onChange={(e) => setUsername(e.target.value)} style={{ margin: '10px' }} />
        <button onClick={login}>Login & Join Room</button>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div style={{ padding: '20px', background: darkMode ? '#1e1e1e' : '#fff', color: darkMode ? '#fff' : '#000' }}>
        <h1>Enter Room ID</h1>
        <input placeholder="e.g., test-room or hackathon-demo" onChange={(e) => setRoomId(e.target.value)} style={{ margin: '10px' }} />
        <button onClick={joinRoom}>Join</button>
        <button onClick={toggleDarkMode}>Dark Mode</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: darkMode ? '#1e1e1e' : '#fff', color: darkMode ? '#fff' : '#000' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', padding: '10px', borderRight: '1px solid #ccc' }}>
        <h3>Team ({users.length})</h3>
        <ul>{users.map((u) => <li key={u.userId}>{u.username}</li>)}</ul>
        <button onClick={() => getSuggestion('Add React useState hook')}>Quick AI Suggest</button>
        <br />
        <button onClick={startVoice} disabled={isListening}>
          {isListening ? 'Listening...' : '🎤 Voice Prompt'}
        </button>
        <div>Patterns: React {patterns.react} | Node {patterns.node}</div>
        <div>Suggestion:<pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>{suggestion}</pre></div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, position: 'relative' }}>
        <CodeMirror
          value={code}
          onChange={onCodeChange}
          extensions={[javascript()]}
          theme={darkMode ? oneDark : undefined}
          onCursorActivity={(view) => {
            const pos = view.state.selection.main.head;
            socket.emit('cursor-move', { roomId, cursorPos: pos, username });
          }}
          style={{ height: '100%' }}
        />
        {Object.entries(cursorPositions).map(([user, pos]) => (
          <div key={user} style={{ position: 'absolute', top: `${pos.line * 20}px`, left: `${pos.ch * 10}px`, color: 'red', fontSize: '12px' }}>
            | {user.slice(0,3)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;