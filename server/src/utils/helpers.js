import { v4 as uuidv4 } from 'uuid';

export const generateWoNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WO-${timestamp}${random}`;
};

export const generateProposalNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `PRO-${timestamp}${random}`;
};

export const calculateProposalTotals = (proposal) => {
  const { tripFee, assessmentFee, techHours, techRate, helperHours, helperRate, parts, costMultiplier, taxRate } = proposal;
  
  // Parse parts if string
  const partsArray = typeof parts === 'string' ? JSON.parse(parts || '[]') : (parts || []);
  
  // Calculate costs
  const incurredCost = (tripFee || 0) + (assessmentFee || 0);
  const laborCost = ((techHours || 0) * (techRate || 0)) + ((helperHours || 0) * (helperRate || 0));
  const partsCost = partsArray.reduce((sum, p) => sum + ((p.quantity || 0) * (p.unitPrice || 0)), 0);
  
  const baseCost = incurredCost + laborCost + partsCost;
  const subtotal = baseCost * (costMultiplier || 1);
  const tax = subtotal * ((taxRate || 0) / 100);
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

export const paginate = (page = 1, limit = 20) => {
  const take = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
  return { skip, take };
};

export const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasMore: page < totalPages,
    },
  };
};
