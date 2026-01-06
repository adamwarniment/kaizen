const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'kaizen-secret-key-123';

app.use(cors());
app.use(bodyParser.json());

// --- Demo User Middleware/Helper ---
const getDemoUser = async () => {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'demo@kaizen.app',
        name: 'Demo User',
        balance: 0
      }
    });
  }
  return user;
};

app.get('/auth/demo', async (req, res) => {
  const user = await getDemoUser();
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ user, token });
});

// --- Auth Routes ---
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        balance: 0
      }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ user, token });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- User Routes ---
app.get('/users/me', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { transactions: true }
  });
  res.json(user);
});
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { measures: true, entries: true, transactions: true }
  });
  res.json(user);
});

// --- Measure Routes ---
// --- Measure Routes ---
// --- Measure Routes ---
app.post('/measures', authenticateToken, async (req, res) => {
  const { name, unit, icon, color } = req.body;
  const userId = req.user.userId;

  if (!name || !unit) {
    return res.status(400).json({ error: 'Name and unit are required' });
  }

  try {
    const measure = await prisma.measure.create({
      data: {
        userId,
        name,
        unit,
        icon: icon || 'Target',
        color: color || 'emerald'
      }
    });
    res.json(measure);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create measure' });
  }
});

app.get('/measures', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const measures = await prisma.measure.findMany({
    where: { userId },
    include: { goals: true }
  });
  res.json(measures);
});

app.put('/measures/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, unit, icon, color } = req.body;
  const userId = req.user.userId;

  try {
    const measure = await prisma.measure.findFirst({ where: { id, userId } });
    if (!measure) return res.sendStatus(404);

    const updated = await prisma.measure.update({
      where: { id },
      data: {
        name,
        unit,
        icon,
        color
      }
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update measure' });
  }
});

app.delete('/measures/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    // Verify ownership
    const measure = await prisma.measure.findFirst({ where: { id, userId } });
    if (!measure) return res.sendStatus(404);

    // Delete (cascade should handle goals/entries if configured, but let's be safe or assume schema handles it)
    // Prisma default cascade might need explicit config, but we'll try standard delete
    await prisma.measure.delete({ where: { id } });
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete measure' });
  }
});

// --- Goal Routes ---
app.get('/goals', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  // We need to find goals where the measure belongs to the user
  // Efficient way: find measures then goals, or usage complex query.
  // Prisma: findMany Goal where measure.userId = userId
  const goals = await prisma.goal.findMany({
    where: {
      measure: {
        userId: userId
      }
    },
    include: {
      measure: true
    }
  });
  res.json(goals);
});

app.post('/goals', authenticateToken, async (req, res) => {
  const { measureId, timeframe, type, targetValue, rewardAmount, minPerEntry } = req.body;
  const userId = req.user.userId;

  try {
    // Verify measure ownership
    const measure = await prisma.measure.findUnique({ where: { id: measureId } });
    if (!measure || measure.userId !== userId) {
      return res.status(403).json({ error: 'Invalid measure' });
    }

    const goal = await prisma.goal.create({
      data: {
        measureId,
        timeframe,
        type,
        targetValue: parseFloat(targetValue),
        rewardAmount: parseFloat(rewardAmount),
        minPerEntry: minPerEntry ? parseFloat(minPerEntry) : undefined
      },
      include: { measure: true }
    });
    res.json(goal);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.delete('/goals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { measure: true }
    });
    if (!goal || goal.measure.userId !== userId) return res.sendStatus(404);

    await prisma.goal.delete({ where: { id } });
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// --- Entry Routes & Reward Evaluation ---
const getWeekKey = (date) => {
  // Returns "YYYY-Www" format (e.g. 2023-W43)
  const d = new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
};

app.get('/entries', authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  const userId = req.user.userId;

  const where = { userId };

  if (start && end) {
    where.date = {
      gte: new Date(start),
      lte: new Date(end)
    };
  }

  try {
    const entries = await prisma.entry.findMany({
      where,
      include: { measure: true },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.post('/entries', authenticateToken, async (req, res) => {
  // New payload: { measureId, value, date }
  const { measureId, value, date } = req.body;
  const userId = req.user.userId;

  try {
    // 1. Create the Entry
    const entryDate = new Date(date);
    const entry = await prisma.entry.create({
      data: {
        userId,
        measureId,
        value: parseFloat(value),
        date: entryDate
      }
    });

    // 2. Evaluate Goals
    const measure = await prisma.measure.findUnique({
      where: { id: measureId },
      include: { goals: true }
    });

    console.log(`Evaluating goals for measure ${measure.name} on ${entryDate.toISOString()}`);

    let totalReward = 0;
    const rewardsEarned = [];

    // Helper to check and award
    const processGoal = async (goal, currentAmount, periodId) => {
      // Check if goal conditions met
      if (currentAmount >= goal.targetValue) {
        // Check if already rewarded for this period
        const existingTx = await prisma.transaction.findFirst({
          where: {
            userId,
            goalId: goal.id,
            periodId
          }
        });

        if (!existingTx) {
          console.log(`Goal met! ${goal.timeframe} ${goal.type}: ${currentAmount}/${goal.targetValue}. Rewarding $${goal.rewardAmount}`);

          await prisma.$transaction([
            prisma.user.update({
              where: { id: userId },
              data: { balance: { increment: goal.rewardAmount } }
            }),
            prisma.transaction.create({
              data: {
                userId,
                amount: goal.rewardAmount,
                type: 'REWARD',
                goalId: goal.id,
                periodId,
                title: 'Goal Met',
                notes: `${measure.name} (${goal.timeframe} ${goal.type})`
              }
            })
          ]);

          totalReward += goal.rewardAmount;
          rewardsEarned.push({
            goal: `${goal.timeframe} ${goal.type}`,
            amount: goal.rewardAmount
          });
        }
      }
    };

    // Iterate through all goals for this measure
    for (const goal of measure.goals) {
      if (goal.timeframe === 'DAILY') {
        const periodId = entryDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // Fetch daily stats
        const dayStart = new Date(periodId);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

        const entries = await prisma.entry.findMany({
          where: {
            measureId,
            userId,
            date: { gte: dayStart, lt: dayEnd }
          }
        });

        // Calculate amount based on type
        // TOTAL = Sum of all values
        // COUNT = Count of entries (optionally filtered by minPerEntry)
        let amount = 0;
        if (goal.type === 'TOTAL') {
          amount = entries.reduce((sum, e) => sum + e.value, 0);
        } else if (goal.type === 'COUNT') {
          amount = entries.filter(e => !goal.minPerEntry || e.value >= goal.minPerEntry).length;
        }

        await processGoal(goal, amount, periodId);

      } else if (goal.timeframe === 'WEEKLY') {
        const periodId = getWeekKey(entryDate);

        // Fetch weekly stats
        // Naive week calculation: Find relative to current date entry. 
        // Better: Query DB for week range. 
        // Important: week starts Monday? Let's assume standard ISO week logic or simplify for now.
        // Simplification: We already have getWeekKey. Let's filter entries by date range in JS or DB.

        // Calculate start/end of current week
        const d = new Date(entryDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const weekStart = new Date(d.setDate(diff)); weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

        const entries = await prisma.entry.findMany({
          where: {
            measureId,
            userId,
            date: { gte: weekStart, lt: weekEnd }
          }
        });

        let amount = 0;
        if (goal.type === 'TOTAL') {
          amount = entries.reduce((sum, e) => sum + e.value, 0);
        } else if (goal.type === 'COUNT') {
          amount = entries.filter(e => !goal.minPerEntry || e.value >= goal.minPerEntry).length;
        }

        await processGoal(goal, amount, periodId);
      }
    }

    res.json({ entry, totalReward, rewardsEarned });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// --- Transaction Routes ---
app.get('/transactions', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/transactions', authenticateToken, async (req, res) => {
  const { type, amount, description, title } = req.body;
  const userId = req.user.userId;
  const numericAmount = parseFloat(amount);

  if (!['CREDIT', 'DEBIT'].includes(type) || isNaN(numericAmount) || numericAmount <= 0 || !title) {
    return res.status(400).json({ error: 'Invalid transaction data' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.sendStatus(404);

    if (type === 'DEBIT' && user.balance < numericAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = type === 'CREDIT'
      ? user.balance + numericAmount
      : user.balance - numericAmount;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      }),
      prisma.transaction.create({
        data: {
          userId,
          amount: type === 'CREDIT' ? numericAmount : -numericAmount,
          type: type === 'CREDIT' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT',
          title: title,
          notes: description || null,
        }
      })
    ]);

    res.json({ success: true, newBalance });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update Transaction (Edit)
app.put('/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { notes, amount, title } = req.body; // Allow editing notes, amount, title
  const userId = req.user.userId;

  try {
    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) return res.sendStatus(404);

    // If amount is changing, we need to adjust user balance
    if (amount !== undefined && amount !== tx.amount) {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Revert old amount
      // If old amount was +10 (Reward/Credit), we subtract 10.
      // If old amount was -10 (Debit), we add 10 (subtract -10).
      let adjustedBalance = user.balance - tx.amount;

      // Apply new amount
      // If new amount is positive, add. If negative, subtract (add negative).
      // However, we need to respect the original transaction TYPE logic or just trust the new amount?
      // Let's assume the user edits the MAGNITUDE but the sign depends on the type or they send signed amount?
      // To simplify for the user (Frontend), let's assume valid signed amount is sent or handled carefully.
      // BUT, purely for safety:
      // If type is REWARD/MANUAL_CREDIT, amount should be positive.
      // If type is CASHOUT/MANUAL_DEBIT, amount should be negative.
      // To properly handle this, we should check tx.type

      let newAmount = parseFloat(amount);
      if ((tx.type === 'REWARD' || tx.type === 'MANUAL_CREDIT') && newAmount < 0) newAmount = Math.abs(newAmount);
      if ((tx.type === 'CASHOUT' || tx.type === 'MANUAL_DEBIT') && newAmount > 0) newAmount = -Math.abs(newAmount);

      adjustedBalance += newAmount;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { balance: adjustedBalance }
        }),
        prisma.transaction.update({
          where: { id },
          data: { notes, amount: newAmount, title }
        })
      ]);

      res.json({ success: true, newBalance: adjustedBalance });
    } else {
      // Just updating notes
      const updated = await prisma.transaction.update({
        where: { id },
        data: { notes, title }
      });
      res.json(updated);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete Transaction
app.delete('/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) return res.sendStatus(404);

    // Revert balance
    // If it was +10, we minus 10. If it was -10, we plus 10 (minus -10).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: tx.amount } }
      }),
      prisma.transaction.delete({ where: { id } })
    ]);

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.post('/transactions/cashout', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const transaction = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } }
    }),
    prisma.transaction.create({
      data: {
        userId,
        amount: -amount,
        type: 'CASHOUT',
        title: 'Cashout',
        notes: 'User cashout'
      }
    })
  ]);

  res.json(transaction);
});

app.listen(PORT, () => {
  console.log(`Kaizen API running on port ${PORT}`);
});
