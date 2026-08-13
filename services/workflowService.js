const transitionMaps = {
  lead: {
    new: ['contacted', 'qualified', 'lost'],
    contacted: ['qualified', 'lost'],
    qualified: ['converted', 'lost'],
    converted: [],
    lost: []
  },
  opportunity: {
    prospecting: ['qualification', 'closed-lost'],
    qualification: ['proposal', 'closed-lost'],
    proposal: ['negotiation', 'closed-won', 'closed-lost'],
    negotiation: ['closed-won', 'closed-lost'],
    'closed-won': [],
    'closed-lost': []
  },
  order: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['ready-to-ship', 'cancelled'],
    'ready-to-ship': ['dispatched', 'shipped', 'cancelled'],
    dispatched: ['shipped', 'delivered'],
    shipped: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: []
  },
  service: {
    open: ['in-progress', 'closed'],
    'in-progress': ['resolved', 'open'],
    resolved: ['closed', 'in-progress'],
    closed: []
  },
  delivery: {
    pending: ['picked-up'],
    'picked-up': ['in-transit'],
    'in-transit': ['delivered'],
    delivered: []
  },
  marketing: {
    active: ['inactive'],
    inactive: ['active']
  }
};

function getTransitions(workflow, state) {
  return transitionMaps[workflow]?.[state] || [];
}

function assertTransition(workflow, currentState, nextState) {
  const allowed = getTransitions(workflow, currentState);
  if (!allowed.includes(nextState)) {
    const error = new Error(`Invalid ${workflow} transition from ${currentState} to ${nextState}`);
    error.status = 409;
    error.code = 'INVALID_TRANSITION';
    throw error;
  }
}

module.exports = { assertTransition, getTransitions, transitionMaps };
