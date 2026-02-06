import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../constants';

export const useCalculations = () => {
  const { transactions, savings, categoryBudgets, allCategories, debts } = useApp();

  // Données mensuelles
  const getMonthlyData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      transactions: monthlyTransactions
    };
  }, [transactions]);

  // Stats par période
  const getPeriodStats = useMemo(() => {
    const now = new Date();
    let startDate;

    // Par défaut : mois en cours
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const periodTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= now;
    });

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      transactions: periodTransactions
    };
  }, [transactions]);

  // Dépenses par catégorie
  const getExpensesByCategory = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = transactions.filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && 
             date.getMonth() === currentMonth && 
             date.getFullYear() === currentYear;
    });

    const byCategory = {};
    monthlyExpenses.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = 0;
      }
      byCategory[t.category] += t.amount;
    });

    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = allCategories.find(c => c.id === categoryId) || {
          id: categoryId,
          name: 'Autre',
          icon: '📌',
          color: '#6B7280'
        };
        return { category, amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, allCategories]);

  // Budget status par catégorie
  const getBudgetStatus = useMemo(() => {
    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === now.getMonth() && 
             tDate.getFullYear() === now.getFullYear() && 
             t.type === 'expense';
    });

    const status = {};
    Object.entries(categoryBudgets).forEach(([categoryId, budgetValue]) => {
      const budget = parseFloat(budgetValue) || 0;
      if (budget <= 0) return;

      const spent = currentMonthTransactions
        .filter(t => t.category === categoryId)
        .reduce((s, t) => s + t.amount, 0);

      const percentage = (spent / budget) * 100;
      const remaining = budget - spent;

      status[categoryId] = {
        budget,
        spent,
        remaining,
        percentage,
        isOverBudget: spent > budget
      };
    });

    return status;
  }, [transactions, categoryBudgets]);

  // Charges fixes mensuelles
  const getMonthlyFixedExpenses = useMemo(() => {
    return transactions
      .filter(t => t.isFixedExpense && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Analyse des données (comparaison mois actuel vs précédent)
  const getAnalysisData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const calcStats = (txList) => ({
      income: txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expenses: txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      balance: txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
               txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    });

    const current = calcStats(currentMonthTx);
    const previous = calcStats(prevMonthTx);

    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    // Analyse par catégorie
    const categoryAnalysis = {};
    allCategories.filter(c => c.type === 'expense').forEach(cat => {
      const currAmount = currentMonthTx
        .filter(t => t.category === cat.id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      const prevAmount = prevMonthTx
        .filter(t => t.category === cat.id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      if (currAmount > 0 || prevAmount > 0) {
        categoryAnalysis[cat.id] = {
          category: cat,
          current: currAmount,
          previous: prevAmount,
          diff: currAmount - prevAmount,
          change: calcChange(currAmount, prevAmount)
        };
      }
    });

    return {
      currentMonth: current,
      previousMonth: previous,
      comparison: {
        incomeChange: calcChange(current.income, previous.income),
        expensesChange: calcChange(current.expenses, previous.expenses),
        balanceChange: current.balance - previous.balance
      },
      categoryAnalysis
    };
  }, [transactions, allCategories]);

  // Évolution du solde cumulé
  const getBalanceEvolution = useMemo(() => {
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    const evolution = [];

    sortedTx.forEach(t => {
      cumulative += t.type === 'income' ? t.amount : -t.amount;
      evolution.push({
        date: t.date,
        balance: cumulative,
        transaction: t
      });
    });

    return evolution;
  }, [transactions]);

  // Total des dettes
  const getTotalDebt = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const remaining = debt.schedule
        ? debt.schedule.filter(s => !s.paid).reduce((s, p) => s + p.amount, 0)
        : debt.totalAmount;
      return sum + remaining;
    }, 0);
  }, [debts]);

  // Prochaines échéances
  const getUpcomingPayments = useMemo(() => {
    const upcoming = [];
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    debts.forEach(debt => {
      if (debt.schedule) {
        debt.schedule
          .filter(s => !s.paid && new Date(s.date) <= nextMonth)
          .forEach(s => {
            upcoming.push({
              debtId: debt.id,
              debtName: debt.name,
              ...s
            });
          });
      }
    });

    return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [debts]);

  // Helper functions
  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280',
      type: 'expense'
    };
  };

  const getBrandInfo = (brandId) => {
    const { allBrands } = useApp();
    return allBrands.find(b => b.id === brandId) || null;
  };

  return {
    getMonthlyData,
    getPeriodStats,
    getExpensesByCategory,
    getBudgetStatus,
    getMonthlyFixedExpenses,
    getAnalysisData,
    getBalanceEvolution,
    getTotalDebt,
    getUpcomingPayments,
    getCategoryInfo
  };
};

export default useCalculations;