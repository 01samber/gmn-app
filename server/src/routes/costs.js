import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

// Get all costs
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, technicianId, workOrderId } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (workOrderId) where.workOrderId = workOrderId;

    const [costs, total] = await Promise.all([
      prisma.cost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: { select: { id: true, woNumber: true, client: true, trade: true } },
          technician: { select: { id: true, name: true } },
        },
      }),
      prisma.cost.count({ where }),
    ]);

    res.json(formatPaginatedResponse(costs, total, page, limit));
  } catch (error) {
    console.error('Get costs error:', error);
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
});

// Get single cost
router.get('/:id', authenticate, async (req, res) => {
  try {
    const cost = await prisma.cost.findUnique({
      where: { id: req.params.id },
      include: {
        workOrder: true,
        technician: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!cost) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    res.json(cost);
  } catch (error) {
    console.error('Get cost error:', error);
    res.status(500).json({ error: 'Failed to fetch cost' });
  }
});

// Create cost (request payment)
router.post('/', authenticate, async (req, res) => {
  try {
    const { workOrderId, technicianId, amount, note } = req.body;

    if (!workOrderId || !technicianId || !amount) {
      return res.status(400).json({ error: 'Work order, technician, and amount are required' });
    }

    // Verify work order is completed
    const workOrder = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    if (workOrder.status !== 'completed') {
      return res.status(400).json({ error: 'Work order must be completed to request payment' });
    }

    // Check for existing open request
    const existing = await prisma.cost.findFirst({
      where: {
        workOrderId,
        technicianId,
        status: { in: ['requested', 'approved'] },
      },
    });
    if (existing) {
      return res.status(400).json({ error: 'An open payment request already exists for this work order and technician' });
    }

    const cost = await prisma.cost.create({
      data: {
        amount: parseFloat(amount),
        note,
        workOrderId,
        technicianId,
        createdById: req.user.id,
      },
      include: {
        workOrder: { select: { id: true, woNumber: true, client: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(cost);
  } catch (error) {
    console.error('Create cost error:', error);
    res.status(500).json({ error: 'Failed to create cost' });
  }
});

// Update cost (approve/pay)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status, amount, note } = req.body;

    const existing = await prisma.cost.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (note !== undefined) updateData.note = note;
    
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'approved' && existing.status === 'requested') {
        updateData.approvedAt = new Date();
      }
      if (status === 'paid' && (existing.status === 'approved' || existing.status === 'requested')) {
        if (!existing.approvedAt) updateData.approvedAt = new Date();
        updateData.paidAt = new Date();
        
        // Update technician earnings
        await prisma.technician.update({
          where: { id: existing.technicianId },
          data: {
            gmnMoneyMade: { increment: existing.amount },
            jobsDone: { increment: 1 },
          },
        });
      }
    }

    const cost = await prisma.cost.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        workOrder: { select: { id: true, woNumber: true, client: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    res.json(cost);
  } catch (error) {
    console.error('Update cost error:', error);
    res.status(500).json({ error: 'Failed to update cost' });
  }
});

// Delete cost
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const cost = await prisma.cost.findUnique({ where: { id: req.params.id } });
    if (cost?.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid cost' });
    }
    
    await prisma.cost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete cost error:', error);
    res.status(500).json({ error: 'Failed to delete cost' });
  }
});

export default router;
