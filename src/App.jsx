import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:3001');
const API_URL = 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [noticeFile, setNoticeFile] = useState(null);
  const [noticePreview, setNoticePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const chatEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (user) {
      axios.get(`${API_URL}/api/users`).then(res => setEmployees(res.data));
      axios.get(`${API_URL}/api/messages`).then(res => setMessages(res.data));
      axios.get(`${API_URL}/api/notices`).then(res => setNotices(res.data));

      socket.on('receiveMessage', (msg) => setMessages(prev => [...prev, msg]));
      socket.on('messageEdited', ({ id, content }) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
      });
      socket.on('messageDeleted', (id) => {
        setMessages(prev => prev.filter(m => m.id !== id));
      });
      socket.on('statusUpdated', ({ username, status }) => {
        setEmployees(prev => prev.map(emp => emp.username === username ? { ...emp, status } : emp));
      });
      socket.on('noticeReceived', (notice) => setNotices(prev => [notice, ...prev]));

      return () => {
        socket.off('receiveMessage');
        socket.off('messageEdited');
        socket.off('messageDeleted');
        socket.off('statusUpdated');
        socket.off('noticeReceived');
      };
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username, password });
      setUser(res.data);
      setCustomStatus(res.data.status);
    } catch (err) { alert('Invalid credentials!'); }
  };

  const handleStatusUpdate = (status) => {
    socket.emit('updateStatus', { username: user.username, status });
    setUser(prev => ({ ...prev, status }));
    setCustomStatus(status);
  };

  const handleCustomStatusSubmit = (e) => {
    e.preventDefault();
    if (!customStatus) return;
    handleStatusUpdate(customStatus);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage && !mediaFile) return;
    let mediaUrl = null, mediaType = 'text';
    if (mediaFile) {
      const formData = new FormData();
      formData.append('file', mediaFile);
      const res = await axios.post(`${API_URL}/api/upload`, formData);
      mediaUrl = res.data.url;
      mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
    }
    socket.emit('sendMessage', { userId: user.id, username: user.username, content: newMessage, mediaType, mediaUrl });
    setNewMessage(''); setMediaFile(null); setMediaPreview(null);
  };

  const handleEditMessage = (e) => {
    e.preventDefault();
    if (!editContent) return;
    socket.emit('editMessage', { id: editingMessageId, content: editContent });
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteMessage = (id) => {
    if (window.confirm('Delete this message?')) {
      socket.emit('deleteMessage', id);
    }
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeTitle || !newNoticeContent) return;
    let noticeUrl = null;
    if (noticeFile) {
      const formData = new FormData();
      formData.append('file', noticeFile);
      const res = await axios.post(`${API_URL}/api/upload`, formData);
      noticeUrl = res.data.url;
    }
    socket.emit('sendNotice', { userId: user.id, username: user.username, title: newNoticeTitle, content: newNoticeContent, mediaUrl: noticeUrl });
    setNewNoticeTitle(''); setNewNoticeContent(''); setNoticeFile(null); setNoticePreview(null);
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  if (!user) {
    return (
      <div className="natural-card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <i className='bx bxs-business' style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '15px' }}></i>
          <h2>B and D Trade</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Login with [name] / [name]123</p>
        </div>
        <form onSubmit={handleLogin}>
          <input type="text" className="input-natural" placeholder="Username" style={{ marginBottom: '15px' }} value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" className="input-natural" placeholder="Password" style={{ marginBottom: '25px' }} value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="btn-natural" style={{ width: '100%', justifyContent: 'center' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="natural-card" style={{ width: '95vw', maxWidth: '1200px', height: '90vh', display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: '260px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)' }}>
        <div style={{ padding: '25px' }}>
          <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className='bx bxs-circle' style={{ color: 'var(--primary)' }}></i> B and D</h3>
          <div className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><i className='bx bx-chat'></i> Chat</div>
          <div className={`sidebar-item ${activeTab === 'notices' ? 'active' : ''}`} onClick={() => setActiveTab('notices')}><i className='bx bx-bell'></i> Notices</div>
          <div className={`sidebar-item ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}><i className='bx bx-group'></i> Team</div>
          <div style={{ marginTop: '30px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '15px' }}>THEME</p>
            <div className="sidebar-item" onClick={() => setIsDarkMode(!isDarkMode)}>
              <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'}`}></i>
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontWeight: '600' }}>{user.username} {user.role === 'superadmin' && '👑'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <i className='bx bxs-circle' style={{ fontSize: '8px', color: 'var(--success)' }}></i>
            <p style={{ fontSize: '13px', fontWeight: '500' }}>{user.status}</p>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{user.role}</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--chat-bg)' }}>
        {activeTab === 'chat' ? (
          <>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.username === user.username ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{msg.username}</span>
                    {(msg.username === user.username || user.role === 'superadmin') && (
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                        {msg.username === user.username && <i className='bx bx-edit-alt' style={{ cursor: 'pointer' }} onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}></i>}
                        <i className='bx bx-trash' style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleDeleteMessage(msg.id)}></i>
                      </div>
                    )}
                  </div>
                  <div className={`chat-bubble ${msg.username === user.username ? 'mine' : 'theirs'}`}>
                    {editingMessageId === msg.id ? (
                      <form onSubmit={handleEditMessage} style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" className="input-natural" style={{ padding: '4px 8px', fontSize: '12px' }} value={editContent} onChange={e => setEditContent(e.target.value)} autoFocus />
                        <button type="submit" className="btn-natural" style={{ padding: '4px 8px', fontSize: '10px' }}>Save</button>
                        <button type="button" className="btn-natural" style={{ padding: '4px 8px', fontSize: '10px', background: '#94a3b8' }} onClick={() => setEditingMessageId(null)}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        {msg.content && <p>{msg.content}</p>}
                        {msg.mediaUrl && (msg.mediaType === 'image' ? <img src={`${API_URL}${msg.mediaUrl}`} style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '5px' }} /> : <video controls src={`${API_URL}${msg.mediaUrl}`} style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '5px' }} />)}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
              <label style={{ cursor: 'pointer', color: 'var(--text-muted)', alignSelf: 'center' }}>
                <i className='bx bx-plus-circle' style={{ fontSize: '24px' }}></i>
                <input type="file" style={{ display: 'none' }} onChange={(e) => { setMediaFile(e.target.files[0]); setMediaPreview(URL.createObjectURL(e.target.files[0])); }} />
              </label>
              <input type="text" className="input-natural" placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <button type="submit" className="btn-natural"><i className='bx bx-send'></i></button>
            </form>
          </>
        ) : activeTab === 'notices' ? (
          <div style={{ padding: '30px', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px' }}>Company Notices</h3>
            {isAdmin ? (
              <div className="natural-card" style={{ padding: '25px', marginBottom: '30px', background: 'var(--card-bg)' }}>
                <h4 style={{ marginBottom: '15px' }}>Post New Notice</h4>
                <form onSubmit={handleSendNotice}>
                  <input type="text" className="input-natural" placeholder="Subject / Title" style={{ marginBottom: '10px' }} value={newNoticeTitle} onChange={e => setNewNoticeTitle(e.target.value)} />
                  <textarea className="input-natural" placeholder="Detailed content..." style={{ marginBottom: '15px', height: '100px', resize: 'none' }} value={newNoticeContent} onChange={e => setNewNoticeContent(e.target.value)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <i className='bx bx-image-add' style={{ fontSize: '20px' }}></i> {noticeFile ? noticeFile.name : 'Add Photo'}
                      <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => { setNoticeFile(e.target.files[0]); setNoticePreview(URL.createObjectURL(e.target.files[0])); }} />
                    </label>
                    <button type="submit" className="btn-natural">Broadcast Notice</button>
                  </div>
                  {noticePreview && <img src={noticePreview} style={{ height: '60px', borderRadius: '8px', marginTop: '10px' }} />}
                </form>
              </div>
            ) : (
              <div className="notice-card" style={{ background: 'var(--bg-natural)', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Only Admins (Mandira, Ganesh, Samrat) can post notices.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {notices.map((n, i) => (
                <div key={i} className="notice-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--primary)' }}>{n.title}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(n.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '14px', marginBottom: '10px' }}>{n.content}</p>
                  {n.mediaUrl && <img src={`${API_URL}${n.mediaUrl}`} style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '10px' }} />}
                  <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>Posted by: <strong>{n.username}</strong></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '30px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h3>Team Status</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{employees.length} Members Online</p>
            </div>

            <div className="natural-card" style={{ padding: '25px', marginBottom: '40px', background: 'var(--primary-light)', border: 'none' }}>
              <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className='bx bx-edit' style={{ color: 'var(--primary)' }}></i> What are you doing right now?
              </h4>
              <form onSubmit={handleCustomStatusSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="input-natural"
                  placeholder="Type your current status/activity..."
                  value={customStatus}
                  onChange={e => setCustomStatus(e.target.value)}
                />
                <button type="submit" className="btn-natural">Update Status</button>
              </form>
              <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
                {['At office', 'Delivering', 'Getting materials', 'Break', 'Meeting'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--primary)',
                      background: user.status === s ? 'var(--primary)' : 'transparent',
                      color: user.status === s ? 'white' : 'var(--primary)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {employees.map((emp, i) => (
                <div key={i} className="natural-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <i className='bx bx-user' style={{ fontSize: '20px', color: 'var(--primary)' }}></i>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px' }}>{emp.username}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{emp.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
