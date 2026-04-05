import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { SplitSquareHorizontal, CheckCircle } from 'lucide-react';

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  
  // Get potential groupId from query param
  const queryParams = new URLSearchParams(location.search);
  const initialGroupId = queryParams.get('groupId') || '';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState(initialGroupId);
  const [splitType, setSplitType] = useState('equal'); // 'equal', 'custom', 'percentage'
  
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]); // Members of selected group
  const [participants, setParticipants] = useState({}); // { userId: amountOwed }
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch groups on load
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        setGroups(data);
        if (initialGroupId) {
          const group = data.find(g => g._id === initialGroupId);
          if (group) updateMembers(group.members);
        } else if (data.length > 0) {
          // Select first group by default
          setGroupId(data[0]._id);
          updateMembers(data[0].members);
        }
      } catch (err) {
        console.error('Failed to fetch groups');
      }
    };
    fetchGroups();
  }, []);

  const handleGroupChange = (e) => {
    const selectedId = e.target.value;
    setGroupId(selectedId);
    
    const group = groups.find(g => g._id === selectedId);
    if (group) {
      updateMembers(group.members);
    } else {
      setMembers([]);
      setParticipants({});
    }
  };

  const updateMembers = (memberList) => {
    setMembers(memberList);
    // Initialize equal split
    const parts = {};
    memberList.forEach(m => parts[m._id] = 0);
    setParticipants(parts);
  };

  const handleParticipantChange = (userId, val) => {
    setParticipants({
      ...participants,
      [userId]: Number(val)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) {
      return setError('Please provide valid description and amount');
    }

    if (!groupId) {
      return setError('Please select a group');
    }

    const numericAmount = parseFloat(amount);
    let finalParticipants = [];

    if (splitType === 'equal') {
      const splitAmt = numericAmount / members.length;
      finalParticipants = members.map(m => ({ user: m._id, amountOwed: splitAmt }));
    } else if (splitType === 'custom') {
      let totalCustom = 0;
      finalParticipants = members.map(m => {
        const owed = participants[m._id] || 0;
        totalCustom += owed;
        return { user: m._id, amountOwed: owed };
      });
      // Math.abs to handle small floating point precision differences
      if (Math.abs(totalCustom - numericAmount) > 0.1) {
        return setError(`Custom splits (₹${totalCustom}) must equal total amount (₹${numericAmount})`);
      }
    } else if (splitType === 'percentage') {
      let totalPercentage = 0;
      finalParticipants = members.map(m => {
        const pct = participants[m._id] || 0;
        totalPercentage += pct;
        return { user: m._id, amountOwed: (pct / 100) * numericAmount };
      });
      if (Math.abs(totalPercentage - 100) > 0.1) {
        return setError(`Percentages (${totalPercentage}%) must equal exactly 100%`);
      }
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        description,
        amount: numericAmount,
        groupId,
        splitType,
        participants: finalParticipants
      });
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add an Expense</h1>
        <p className="text-gray-500 text-sm mt-1">Record a new payment for the group</p>
      </div>

      <div className="card p-6 md:p-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">You must be part of a group to add an expense.</p>
            <button onClick={() => navigate('/groups/create')} className="btn-primary">
              Create a Group First
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field py-3 bg-gray-50 text-lg"
                  placeholder="Dinner, Taxi, etc."
                />
              </div>

              <div className="md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-lg font-medium">₹</span>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field py-3 pl-8 text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
              <select
                value={groupId}
                onChange={handleGroupChange}
                className="input-field"
              >
                <option value="">Select a Group</option>
                {groups.map(g => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>

            {members.length > 0 && (
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Split Method</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['equal', 'custom', 'percentage'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSplitType(type)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-shadow capitalize ${
                          splitType === type ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <SplitSquareHorizontal className="h-4 w-4" />
                    {splitType === 'equal' ? 'Split equally between:' : `Enter ${splitType === 'custom' ? 'amounts' : 'percentages'} for each:`}
                  </h4>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {members.map(m => (
                      <div key={m._id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="bg-primary-100 text-primary-700 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {m.name.charAt(0)}
                          </span>
                          {m.name} {m._id === user._id && '(You)'}
                        </span>
                        
                        {splitType === 'equal' ? (
                          <span className="text-sm font-medium text-gray-500">
                            ₹{(parseFloat(amount || 0) / members.length).toFixed(2)}
                          </span>
                        ) : (
                          <div className="relative w-24">
                            {splitType === 'custom' && (
                              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 font-medium">₹</div>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={participants[m._id] || ''}
                              onChange={(e) => handleParticipantChange(m._id, e.target.value)}
                              className={`input-field py-1 text-sm ${splitType === 'custom' ? 'pl-6' : 'pr-6'}`}
                              placeholder="0"
                            />
                            {splitType === 'percentage' && (
                              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-500">%</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !groupId || !amount}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddExpense;
