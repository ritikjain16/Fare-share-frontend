import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { TrendingUp, TrendingDown, Activity, Users, Plus } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [balances, setBalances] = useState({ totalOwes: 0, totalOwed: 0, netBalance: 0 });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  const toggleExpense = (id) => {
    setExpandedExpenseId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [balancesRes, expensesRes, groupsRes] = await Promise.all([
          api.get('/settle/dashboard'),
          api.get('/expenses'),
          api.get('/groups')
        ]);
        
        setBalances(balancesRes.data);
        setAllExpenses(expensesRes.data);
        setRecentExpenses(expensesRes.data.slice(0, 5)); // Just get top 5
        setGroups(groupsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const processChartData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const dataPoints = [];
    
    // Get last 6 months backwards
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
      dataPoints.push(0); // Initialize with 0
    }

    // Determine the month offset
    const currentMonthIndex = currentDate.getMonth();

    allExpenses.forEach(expense => {
      // We only care about how much the user SPENT (their share of the expense)
      const myShare = expense.participants.find(p => p.user._id === user._id)?.amountOwed || 0;
      
      if (myShare > 0) {
        const expenseDate = new Date(expense.createdAt);
        // Only include if it's within the last 6 months
        const monthDiff = (currentDate.getFullYear() - expenseDate.getFullYear()) * 12 + (currentDate.getMonth() - expenseDate.getMonth());
        
        if (monthDiff >= 0 && monthDiff < 6) {
          // Index within our 6-month array
          const targetIndex = 5 - monthDiff;
          dataPoints[targetIndex] += myShare;
        }
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Your Expenses',
          data: dataPoints,
          borderColor: '#10b981', // emerald-500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `₹${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value;
          }
        }
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/expenses/add" className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Expense
          </Link>
          <Link to="/groups/create" className="btn-secondary flex items-center gap-2">
            <Users className="h-4 w-4" /> New Group
          </Link>
        </div>
      </div>

      {/* Balances Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Balance</h3>
          </div>
          <p className={`text-3xl font-bold ${balances.netBalance >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            {balances.netBalance >= 0 ? '+' : '-'}₹{Math.abs(balances.netBalance).toFixed(2)}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">You are owed</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">₹{(balances.totalOwed || 0).toFixed(2)}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">You owe</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">₹{(balances.totalOwes || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analytics Chart */}
        <div className="card md:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Your Spending (Last 6 Months)</h2>
          </div>
          <div className="p-6 h-[300px]">
            <Line data={processChartData()} options={chartOptions} />
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentExpenses.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No recent expenses.</p>
            ) : (
              recentExpenses.map((expense) => {
                const isPayer = expense.paidBy._id === user._id;
                const myShare = expense.participants.find(p => p.user._id === user._id)?.amountOwed || 0;
                
                const isExpanded = expandedExpenseId === expense._id;

                return (
                  <div key={expense._id} className="border-b last:border-b-0 border-gray-100 group/expense block">
                    <div 
                      onClick={() => toggleExpense(expense._id)}
                      className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{expense.description}</p>
                        <p className="text-sm text-gray-500">
                          Paid by {isPayer ? 'you' : expense.paidBy.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{expense.amount.toFixed(2)}</p>
                        <p className={`text-sm ${isPayer ? 'text-green-600' : 'text-red-600'}`}>
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

        {/* Groups */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
            <Link to="/groups/create" className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">
              Create new
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {groups.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">You are not part of any groups yet.</p>
            ) : (
              groups.map((group) => (
                <Link key={group._id} to={`/groups/${group._id}`} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-bold group-hover:bg-primary-200 transition-colors">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-500">{group.members.length} members</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
