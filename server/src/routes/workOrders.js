import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateWoNumber, paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

// Get all work orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, technicianId } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (search) {
      where.OR = [
        { woNumber: { contains: search } },
        { client: { contains: search } },
        { trade: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true, trade: true } },
          _count: { select: { proposals: true, costs: true, files: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    res.json(formatPaginatedResponse(workOrders, total, page, limit));
  } catch (error) {
    console.error('Get work orders error:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// Get single work order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: {
        technician: true,
        proposals: { orderBy: { createdAt: 'desc' } },
        costs: { orderBy: { createdAt: 'desc' } },
        files: { orderBy: { createdAt: 'desc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('Get work order error:', error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// Create work order
router.post('/', authenticate, async (req, res) => {
  try {
    const { client, trade, description, nte, status, priority, city, state, address, etaAt, technicianId } = req.body;

    if (!client || !trade) {
      return res.status(400).json({ error: 'Client and trade are required' });
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        woNumber: generateWoNumber(),
        client,
        trade,
        description,
        nte: parseFloat(nte) || 0,
        status: status || 'waiting',
        priority: priority || 'normal',
        city,
        state,
        address,
        etaAt: etaAt ? new Date(etaAt) : null,
        technicianId,
        createdById: req.user.id,
      },
      include: { technician: { select: { id: true, name: true } } },
    });

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Create work order error:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// Update work order
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { client, trade, description, nte, status, priority, city, state, address, etaAt, technicianId, notes } = req.body;

    const existing = await prisma.workOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const updateData = {};
    if (client !== undefined) updateData.client = client;
    if (trade !== undefined) updateData.trade = trade;
    if (description !== undefined) updateData.description = description;
    if (nte !== undefined) updateData.nte = parseFloat(nte) || 0;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed' && existing.status !== 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (address !== undefined) updateData.address = address;
    if (etaAt !== undefined) updateData.etaAt = etaAt ? new Date(etaAt) : null;
    if (technicianId !== undefined) updateData.technicianId = technicianId || null;
    if (notes !== undefined) updateData.notes = notes;

    const workOrder = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: { technician: { select: { id: true, name: true } } },
    });

    res.json(workOrder);
  } catch (error) {
    console.error('Update work order error:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// Delete work order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.workOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete work order error:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

export default router;
