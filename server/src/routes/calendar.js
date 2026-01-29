import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

// Get calendar events
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, includeWorkOrders } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate);
      if (endDate) where.dateTime.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where,
        skip,
        take,
        orderBy: { dateTime: 'asc' },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.calendarEvent.count({ where }),
    ]);

    // Optionally include work orders with ETAs
    let workOrders = [];
    if (includeWorkOrders === 'true') {
      const woWhere = { etaAt: { not: null } };
      if (startDate || endDate) {
        woWhere.etaAt = {};
        if (startDate) woWhere.etaAt.gte = new Date(startDate);
        if (endDate) woWhere.etaAt.lte = new Date(endDate);
      }

      workOrders = await prisma.workOrder.findMany({
        where: woWhere,
        select: {
          id: true,
          woNumber: true,
          client: true,
          trade: true,
          status: true,
          etaAt: true,
          technician: { select: { id: true, name: true } },
        },
        orderBy: { etaAt: 'asc' },
      });
    }

    res.json({
      ...formatPaginatedResponse(events, total, page, limit),
      workOrders,
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Get single event
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, dateTime, endTime, priority, color } = req.body;

    if (!title || !dateTime) {
      return res.status(400).json({ error: 'Title and date/time are required' });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        dateTime: new Date(dateTime),
        endTime: endTime ? new Date(endTime) : null,
        priority: priority || 'normal',
        color: color || '#0ea5e9',
        createdById: req.user.id,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, dateTime, endTime, priority, color, isCompleted } = req.body;

    const existing = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dateTime !== undefined) updateData.dateTime = new Date(dateTime);
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (color !== undefined) updateData.color = color;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
