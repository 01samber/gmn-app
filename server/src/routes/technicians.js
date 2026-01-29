import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

// Get all technicians
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, trade, search, includeBlacklisted } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = { isActive: true };
    if (includeBlacklisted !== 'true') where.isBlacklisted = false;
    if (trade && trade !== 'all') where.trade = trade;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { trade: { contains: search } },
        { city: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [technicians, total] = await Promise.all([
      prisma.technician.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { workOrders: true, proposals: true, costs: true } },
        },
      }),
      prisma.technician.count({ where }),
    ]);

    res.json(formatPaginatedResponse(technicians, total, page, limit));
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// Get single technician
router.get('/:id', authenticate, async (req, res) => {
  try {
    const technician = await prisma.technician.findUnique({
      where: { id: req.params.id },
      include: {
        workOrders: { take: 10, orderBy: { createdAt: 'desc' } },
        costs: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { workOrders: true, proposals: true, costs: true } },
      },
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json(technician);
  } catch (error) {
    console.error('Get technician error:', error);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// Create technician
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, trade, phone, email, address, city, state, zipCode, notes, hourlyRate } = req.body;

    if (!name || !trade) {
      return res.status(400).json({ error: 'Name and trade are required' });
    }

    // Check for duplicate
    const existing = await prisma.technician.findFirst({
      where: { name: { equals: name }, trade: { equals: trade } },
    });
    if (existing) {
      return res.status(400).json({ error: 'Technician with this name and trade already exists' });
    }

    const technician = await prisma.technician.create({
      data: {
        name,
        trade,
        phone,
        email,
        address,
        city,
        state,
        zipCode,
        notes,
        hourlyRate: parseFloat(hourlyRate) || 0,
      },
    });

    res.status(201).json(technician);
  } catch (error) {
    console.error('Create technician error:', error);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// Update technician
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, trade, phone, email, address, city, state, zipCode, notes, hourlyRate, isBlacklisted, blacklistReason, rating } = req.body;

    const existing = await prisma.technician.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (trade !== undefined) updateData.trade = trade;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (notes !== undefined) updateData.notes = notes;
    if (hourlyRate !== undefined) updateData.hourlyRate = parseFloat(hourlyRate) || 0;
    if (isBlacklisted !== undefined) updateData.isBlacklisted = isBlacklisted;
    if (blacklistReason !== undefined) updateData.blacklistReason = blacklistReason;
    if (rating !== undefined) updateData.rating = parseFloat(rating) || 5;

    const technician = await prisma.technician.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(technician);
  } catch (error) {
    console.error('Update technician error:', error);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

// Delete technician
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if technician has work orders
    const tech = await prisma.technician.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { workOrders: true } } },
    });

    if (tech._count.workOrders > 0) {
      // Soft delete
      await prisma.technician.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
    } else {
      await prisma.technician.delete({ where: { id: req.params.id } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete technician error:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

// Get unique trades
router.get('/meta/trades', authenticate, async (req, res) => {
  try {
    const trades = await prisma.technician.findMany({
      where: { isActive: true },
      select: { trade: true },
      distinct: ['trade'],
      orderBy: { trade: 'asc' },
    });
    res.json(trades.map(t => t.trade));
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

export default router;
