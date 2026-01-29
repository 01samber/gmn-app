import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateProposalNumber, calculateProposalTotals, paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

// Get all proposals
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, workOrderId } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (workOrderId) where.workOrderId = workOrderId;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: { select: { id: true, woNumber: true, client: true, trade: true } },
          technician: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    res.json(formatPaginatedResponse(proposals, total, page, limit));
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Get single proposal
router.get('/:id', authenticate, async (req, res) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: {
        workOrder: true,
        technician: true,
        helper: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// Create proposal
router.post('/', authenticate, async (req, res) => {
  try {
    const { workOrderId, technicianId, helperId, tripFee, assessmentFee, techHours, techRate, helperHours, helperRate, parts, costMultiplier, taxRate, notes } = req.body;

    if (!workOrderId) {
      return res.status(400).json({ error: 'Work order is required' });
    }

    // Validate helper != technician
    if (helperId && helperId === technicianId) {
      return res.status(400).json({ error: 'Helper cannot be the same as technician' });
    }

    // Get work order to check trade
    const workOrder = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Validate technician: must exist, not blacklisted, and trade must match
    if (technicianId) {
      const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
      if (!technician) {
        return res.status(400).json({ error: 'Technician not found in tech list' });
      }
      if (technician.isBlacklisted) {
        return res.status(400).json({ error: 'Cannot assign blacklisted technician to proposal' });
      }
      if (technician.trade?.toLowerCase() !== workOrder.trade?.toLowerCase()) {
        return res.status(400).json({ error: `Technician trade (${technician.trade}) does not match work order trade (${workOrder.trade})` });
      }
    }

    // Validate helper: same rules as technician
    if (helperId) {
      const helper = await prisma.technician.findUnique({ where: { id: helperId } });
      if (!helper) {
        return res.status(400).json({ error: 'Helper not found in tech list' });
      }
      if (helper.isBlacklisted) {
        return res.status(400).json({ error: 'Cannot assign blacklisted technician as helper' });
      }
      if (helper.trade?.toLowerCase() !== workOrder.trade?.toLowerCase()) {
        return res.status(400).json({ error: `Helper trade (${helper.trade}) does not match work order trade (${workOrder.trade})` });
      }
    }

    const proposalData = {
      tripFee: parseFloat(tripFee) || 0,
      assessmentFee: parseFloat(assessmentFee) || 0,
      techHours: parseFloat(techHours) || 0,
      techRate: parseFloat(techRate) || 0,
      helperHours: parseFloat(helperHours) || 0,
      helperRate: parseFloat(helperRate) || 0,
      parts: JSON.stringify(parts || []),
      costMultiplier: parseFloat(costMultiplier) || 1.35,
      taxRate: parseFloat(taxRate) || 0,
    };

    const totals = calculateProposalTotals(proposalData);

    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber: generateProposalNumber(),
        ...proposalData,
        ...totals,
        notes,
        workOrderId,
        technicianId,
        helperId,
        createdById: req.user.id,
      },
      include: {
        workOrder: { select: { id: true, woNumber: true, client: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(proposal);
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Update proposal
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status, technicianId, helperId, tripFee, assessmentFee, techHours, techRate, helperHours, helperRate, parts, costMultiplier, taxRate, notes } = req.body;

    const existing = await prisma.proposal.findUnique({ 
      where: { id: req.params.id },
      include: { workOrder: true }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Validate helper != technician
    const finalTechId = technicianId !== undefined ? technicianId : existing.technicianId;
    const finalHelperId = helperId !== undefined ? helperId : existing.helperId;
    if (finalHelperId && finalHelperId === finalTechId) {
      return res.status(400).json({ error: 'Helper cannot be the same as technician' });
    }

    // Validate technician if being updated
    if (technicianId !== undefined && technicianId) {
      const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
      if (!technician) {
        return res.status(400).json({ error: 'Technician not found in tech list' });
      }
      if (technician.isBlacklisted) {
        return res.status(400).json({ error: 'Cannot assign blacklisted technician to proposal' });
      }
      if (technician.trade?.toLowerCase() !== existing.workOrder.trade?.toLowerCase()) {
        return res.status(400).json({ error: `Technician trade (${technician.trade}) does not match work order trade (${existing.workOrder.trade})` });
      }
    }

    // Validate helper if being updated
    if (helperId !== undefined && helperId) {
      const helper = await prisma.technician.findUnique({ where: { id: helperId } });
      if (!helper) {
        return res.status(400).json({ error: 'Helper not found in tech list' });
      }
      if (helper.isBlacklisted) {
        return res.status(400).json({ error: 'Cannot assign blacklisted technician as helper' });
      }
      if (helper.trade?.toLowerCase() !== existing.workOrder.trade?.toLowerCase()) {
        return res.status(400).json({ error: `Helper trade (${helper.trade}) does not match work order trade (${existing.workOrder.trade})` });
      }
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (technicianId !== undefined) updateData.technicianId = technicianId;
    if (helperId !== undefined) updateData.helperId = helperId;
    if (tripFee !== undefined) updateData.tripFee = parseFloat(tripFee) || 0;
    if (assessmentFee !== undefined) updateData.assessmentFee = parseFloat(assessmentFee) || 0;
    if (techHours !== undefined) updateData.techHours = parseFloat(techHours) || 0;
    if (techRate !== undefined) updateData.techRate = parseFloat(techRate) || 0;
    if (helperHours !== undefined) updateData.helperHours = parseFloat(helperHours) || 0;
    if (helperRate !== undefined) updateData.helperRate = parseFloat(helperRate) || 0;
    if (parts !== undefined) updateData.parts = JSON.stringify(parts);
    if (costMultiplier !== undefined) updateData.costMultiplier = parseFloat(costMultiplier) || 1.35;
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate) || 0;
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate totals
    const merged = { ...existing, ...updateData };
    const totals = calculateProposalTotals(merged);

    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { ...updateData, ...totals },
      include: {
        workOrder: { select: { id: true, woNumber: true, client: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    res.json(proposal);
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// Delete proposal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.proposal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

export default router;
