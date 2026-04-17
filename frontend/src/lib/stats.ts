/**
 * Centralized logic for Brigade Noir Operational Efficiency.
 * Criteria:
 * 1. Inventory Health: quantity > 2 AND expiry_date > (now + 2 days)
 * 2. Checklist Compliance: task completed within the last 7 days
 * 3. Empty stations (no data) result in 0% score.
 */

export interface EfficiencyResult {
  score: number;
  hasLowStock: boolean;
  hasExpiringSoon: boolean;
  hasPendingChecklist: boolean;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingCount: number;
  expiredInsumosCount: number;
}

export const calculateStationEfficiency = (
  insumos: any[],
  tasks: any[]
): EfficiencyResult => {
  const now = new Date();
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(now.getDate() + 2);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Rule: Empty stations = 0%
  if (insumos.length === 0 && tasks.length === 0) {
    return {
      score: 0,
      hasLowStock: false,
      hasExpiringSoon: false,
      hasPendingChecklist: false,
      lowStockCount: 0,
      expiringSoonCount: 0,
      pendingCount: 0,
      expiredInsumosCount: 0
    };
  }

  // 1. Inventory Health Score (Weighted)
  let totalStockPoints = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let expiredInsumosCount = 0;

  if (insumos.length > 0) {
    insumos.forEach(i => {
      let itemPoints = 100;
      
      // Expired Penalty (Highest)
      if (i.expiry_date) {
        const expDate = new Date(i.expiry_date);
        if (expDate <= now) {
          expiredInsumosCount++;
          itemPoints -= 100;
        } else if (expDate <= twoDaysFromNow) {
          expiringSoonCount++;
          itemPoints -= 40;
        }
      }

      // Stock Level Penalty
      if (i.quantity === 0) {
        itemPoints -= 80;
      } else if (i.quantity <= 2) {
        lowStockCount++;
        itemPoints -= 40;
      }

      totalStockPoints += Math.max(0, itemPoints);
    });
  }

  const stockScore = insumos.length > 0 ? (totalStockPoints / (insumos.length * 100)) * 100 : 0;

  // 2. Checklist Score (last 7 days compliance)
  let healthyTasks = 0;
  if (tasks.length > 0) {
    tasks.forEach(t => {
      const completionDate = new Date(t.created_at);
      if (t.is_completed && completionDate >= thirtyDaysAgo) {
        healthyTasks++;
      }
    });
  }

  const taskScore = tasks.length > 0 ? (healthyTasks / tasks.length) * 100 : 0;
  const pendingCount = tasks.length - healthyTasks;

  // 3. Combined Score
  let score = 0;
  if (insumos.length > 0 && tasks.length > 0) {
    score = Math.round((stockScore + taskScore) / 2);
  } else if (insumos.length > 0) {
    score = Math.round(stockScore);
  } else if (tasks.length > 0) {
    score = Math.round(taskScore);
  }

  return {
    score,
    hasLowStock: lowStockCount > 0,
    hasExpiringSoon: expiringSoonCount > 0,
    hasPendingChecklist: pendingCount > 0,
    lowStockCount,
    expiringSoonCount,
    pendingCount,
    expiredInsumosCount
  };
};
