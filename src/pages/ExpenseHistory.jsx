import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Clock, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ExpenseHistory = () => {
  const { user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all', 'paid', 'owed'
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  const toggleExpense = (id) => {
    setExpandedExpenseId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, groupsRes] = await Promise.all([
          api.get('/expenses'),
          api.get('/groups')
        ]);
        setExpenses(expensesRes.data);
        setGroups(groupsRes.data);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredExpenses = expenses.filter(exp => {
    // Group filter
    if (filterGroup !== 'all' && exp.groupId !== filterGroup) return false;
    
    // Type filter
    const isPayer = exp.paidBy._id === user._id;
    if (filterType === 'paid' && !isPayer) return false;
    if (filterType === 'owed' && isPayer) return false;
    
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary-600" /> Expense History
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review all your past transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center bg-white">
        <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
          <Filter className="h-4 w-4" /> Filters:
        </div>
        
        <select 
          value={filterGroup} 
          onChange={(e) => setFilterGroup(e.target.value)}
          className="input-field py-2"
        >
          <option value="all">All Groups & Individual</option>
          {groups.map(g => (
            <option key={g._id} value={g._id}>{g.name}</option>
          ))}
        </select>

        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field py-2"
        >
          <option value="all">All Types</option>
          <option value="paid">You Paid</option>
          <option value="owed">You Borrowed</option>
        </select>
      </div>

      {/* Expense List */}
      <div className="card divide-y divide-gray-100">
        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No expenses found matching your filters.</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const isPayer = expense.paidBy._id === user._id;
            const myShare = expense.participants.find(p => p.user._id === user._id)?.amountOwed || 0;
            const groupName = groups.find(g => g._id === expense.groupId)?.name || 'Non-group expense';
            const date = new Date(expense.createdAt).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric' 
            });

            return (
              <div key={expense._id} className="border-b last:border-b-0 border-gray-100 group/expense block">
                <div 
                  onClick={() => toggleExpense(expense._id)}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg ${isPayer ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {isPayer ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{expense.description}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 mb-2">
                        <span className="font-medium text-gray-700">{date}</span>
                        <span>•</span>
                        {expense.groupId ? (
                          <Link to={`/groups/${expense.groupId}`} className="hover:text-primary-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                            {groupName}
                          </Link>
                        ) : (
                          <span>{groupName}</span>
                        )}
                      </div>
                      {expense.participants.length > 0 && (
                        <div className="text-xs text-gray-400">
                          Split with {expense.participants.map(p => p.user.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center min-w-[120px]">
                    <p className="text-sm text-gray-500 mb-1">
                      {isPayer ? 'You paid' : `${expense.paidBy.name} paid`}
                    </p>
                    <p className="font-bold text-gray-900 text-lg mb-1">₹{expense.amount.toFixed(2)}</p>
                    <p className={`text-sm font-semibold px-2 py-0.5 rounded-full ${isPayer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isPayer 
                        ? `Lent ₹${(expense.amount - myShare).toFixed(2)}` 
                        : `You owe ${expense.paidBy.name.split(' ')[0]} ₹${myShare.toFixed(2)}`}
                    </p>
                  </div>
                </div>
                {expandedExpenseId === expense._id && (
                  <div className="bg-gray-50 px-6 py-4 text-sm border-t border-gray-100">
                    <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">Split Details:</p>
                    <ul className="space-y-2">
                      {expense.participants.map(p => (
                        <li key={p.user._id} className="flex justify-between text-gray-600">
                          <span>{p.user.name} {p.user._id === user._id ? '(You)' : ''}</span>
                          <span className="font-medium">owes ₹{p.amountOwed.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExpenseHistory;
