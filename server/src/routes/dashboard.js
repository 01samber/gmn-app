import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get counts
    const [
      totalWorkOrders,
      activeWorkOrders,
      completedWorkOrders,
      totalTechnicians,
      totalProposals,
      totalCosts,
      totalFiles,
      overdueWorkOrders,
      todayWorkOrders,
      pendingCosts,
      recentActivity,
    ] = await Promise.all([
      prisma.workOrder.count(),
      prisma.workOrder.count({ where: { status: { in: ['waiting', 'in_progress'] } } }),
      prisma.workOrder.count({ where: { status: 'completed' } }),
      prisma.technician.count({ where: { isActive: true, isBlacklisted: false } }),
      prisma.proposal.count(),
      prisma.cost.count(),
      prisma.file.count(),
      prisma.workOrder.count({
        where: {
          status: { in: ['waiting', 'in_progress'] },
          etaAt: { lt: now },
        },
      }),
      prisma.workOrder.count({
        where: {
          etaAt: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.cost.count({ where: { status: { in: ['requested', 'approved'] } } }),
      prisma.workOrder.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          woNumber: true,
          client: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    // Financial stats
    const [proposalTotals, costTotals, paidCosts] = await Promise.all([
      prisma.proposal.aggregate({ _sum: { total: true } }),
      prisma.cost.aggregate({ _sum: { amount: true } }),
      prisma.cost.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    ]);

    // Top performers
    const topTechnicians = await prisma.technician.findMany({
      where: { isActive: true, isBlacklisted: false },
      orderBy: { jobsDone: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        trade: true,
        jobsDone: true,
        gmnMoneyMade: true,
        rating: true,
      },
    });

    // Status breakdown
    const statusBreakdown = await prisma.workOrder.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    res.json({
      overview: {
        totalWorkOrders,
        activeWorkOrders,
        completedWorkOrders,
        totalTechnicians,
        totalProposals,
        totalCosts,
        totalFiles,
      },
      alerts: {
        overdueWorkOrders,
        todayWorkOrders,
        pendingCosts,
      },
      financial: {
        totalProposalValue: proposalTotals._sum.total || 0,
        totalCostRequested: costTotals._sum.amount || 0,
        totalCostPaid: paidCosts._sum.amount || 0,
        profitMargin: proposalTotals._sum.total 
          ? Math.round(((proposalTotals._sum.total - (costTotals._sum.amount || 0)) / proposalTotals._sum.total) * 100)
          : 0,
      },
      topTechnicians,
      statusBreakdown: statusBreakdown.reduce((acc, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {}),
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
