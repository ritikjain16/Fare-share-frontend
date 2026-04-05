import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const GroupDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  const toggleExpense = (id) => {
    setExpandedExpenseId(prev => prev === id ? null : id);
  };

  const fetchGroupData = async () => {
    try {
      const [groupRes, debtsRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/settle/group/${id}`)
      ]);
      setGroup(groupRes.data);
      setDebts(debtsRes.data);
    } catch (error) {
      console.error('Failed to fetch group data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const handleSettle = async (fromId, toId, amount) => {
    try {
      await api.post('/settle', { from: fromId, to: toId, amount, groupId: id });
      // Refresh data
      fetchGroupData();
    } catch (error) {
      console.error('Failed to settle debt', error);
      alert('Failed to settle debt');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  }

  if (!group) {
    return <div className="text-center py-10 text-gray-500">Group not found</div>;
  }

  // Get map of members to display proper names in debts
  const memberMap = group.members.reduce((acc, member) => {
    acc[member._id] = member.name;
    return acc;
  }, {});

  const processChartData = () => {
    // Map userId to total spent in this group
    const userTotals = {};

    // Initialize totals to 0 for all members
    group.members.forEach(m => {
      userTotals[m._id] = { name: m.name, total: 0 };
    });

    group.expenses.forEach(expense => {
      expense.participants.forEach(p => {
        if (userTotals[p.user._id]) {
          userTotals[p.user._id].total += p.amountOwed;
        }
      });
    });

    // Array of distinct colors for chart segments
    const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];

    const labels = [];
    const data = [];
    const backgroundColors = [];

    let colorIndex = 0;
    Object.values(userTotals).forEach(u => {
      if (u.total > 0) { // Only plot members who actually incurred expenses
        labels.push(u.name);
        data.push(u.total);
        backgroundColors.push(colors[colorIndex % colors.length]);
        colorIndex++;
      }
    });

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return ` ₹${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '70%' // Thin doughnut
  };

  const hasExpenses = group.expenses.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Users className="h-4 w-4" /> {group.members.length} members
          </p>
        </div>
        <Link to={`/expenses/add?groupId=${group._id}`} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Group Expenses</h2>

          <div className="card divide-y divide-gray-100">
            {group.expenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No expenses yet. Add one to get started!</p>
              </div>
            ) : (
              group.expenses.slice().reverse().map((expense) => {
                const date = new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isPayer = expense.paidBy._id === user._id;
                const myShare = expense.participants.find(p => p.user._id === user._id)?.amountOwed || 0;

                const isExpanded = expandedExpenseId === expense._id;

                return (
                  <div key={expense._id} className="border-b last:border-b-0 border-gray-100 group/expense block">
                    <div
                      onClick={() => toggleExpense(expense._id)}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500">
                          <span className="text-xs font-semibold uppercase">{date.split(' ')[0]}</span>
                          <span className="text-lg font-bold text-gray-900 leading-none">{date.split(' ')[1]}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">{expense.description}</p>
                          <p className="text-sm text-gray-500">{expense.paidBy.name} paid ₹{expense.amount.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isPayer ? 'text-green-600' : 'text-red-600'}`}>
                          {isPayer
                            ? `You lent ₹${(expense.amount - myShare).toFixed(2)}`
                            : `You owe ${expense.paidBy.name.split(' ')[0]} ₹${myShare.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    {isExpanded && (
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

        {/* Sidebar Widgets */}
        <div className="space-y-6">

          {/* Group Expense Shares Chart */}
          {hasExpenses && (
            <div className="card w-full">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Expense Shares</h2>
              </div>
              <div className="p-6 flex justify-center items-center h-[250px]">
                <Doughnut data={processChartData()} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Simplified Debts Widget */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Simplified Debts</h2>

            <div className="card">
              {debts.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2 opacity-80" />
                  <p className="text-gray-500 font-medium text-sm">You are all settled up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {debts.map((debt, index) => {
                    const amIOwing = debt.from === user._id;
                    const amIOwed = debt.to === user._id;

                    return (
                      <div key={index} className="p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-semibold ${amIOwing ? 'text-gray-900' : 'text-gray-600'}`}>
                            {amIOwing ? 'You' : memberMap[debt.from] || 'Unknown'}
                          </span>
                          <ArrowRightLeft className="h-4 w-4 text-gray-300 flex-shrink-0 mx-2" />
                          <span className={`font-semibold ${amIOwed ? 'text-gray-900' : 'text-gray-600'}`}>
                            {amIOwed ? 'You' : memberMap[debt.to] || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">₹{debt.amount.toFixed(2)}</span>
                          {(amIOwing || amIOwed) && (
                            <button
                              onClick={() => handleSettle(debt.from, debt.to, debt.amount)}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-sm font-medium transition-colors"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

}

export default GroupDetails;
