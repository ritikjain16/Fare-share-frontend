import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Users, Search, Plus, X } from 'lucide-react';

const CreateGroup = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/users');
        // Filter out current user from selection list
        setAllUsers(data.filter(u => u._id !== user._id));
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };
    fetchUsers();
  }, [user._id]);

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (userToAdd) => {
    if (selectedMembers.find(m => m._id === userToAdd._id)) {
      setSelectedMembers(selectedMembers.filter(m => m._id !== userToAdd._id));
    } else {
      setSelectedMembers([...selectedMembers, userToAdd]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Group name is required');
    
    setLoading(true);
    try {
      const memberIds = selectedMembers.map(m => m._id);
      const { data } = await api.post('/groups', {
        name,
        members: memberIds
      });
      navigate(`/groups/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create a Group</h1>
        <p className="text-gray-500 text-sm mt-1">Start tracking expenses with friends</p>
      </div>

      <div className="card p-6 md:p-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-lg py-3"
              placeholder="E.g., Goa Trip 2024"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
            
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by name or email"
              />
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedMembers.map(member => (
                  <div key={member._id} className="inline-flex items-center bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm font-medium border border-primary-100">
                    {member.name}
                    <button
                      type="button"
                      onClick={() => toggleMember(member)}
                      className="ml-2 text-primary-400 hover:text-primary-600 focus:outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* User List */}
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-gray-50/50">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No users found</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredUsers.map(u => {
                    const isSelected = selectedMembers.some(m => m._id === u._id);
                    return (
                      <li
                        key={u._id}
                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-white transition-colors ${isSelected ? 'bg-primary-50/50' : ''}`}
                        onClick={() => toggleMember(u)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{u.name}</span>
                          <span className="text-xs text-gray-500">{u.email}</span>
                        </div>
                        {isSelected ? (
                          <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center">
                            <X className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-600 transition-colors">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
