/**
 * Utility to calculate the boundaries of the "Culinary Week" (Tuesday to Monday).
 * Standard JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
export const getCulinaryWeekRange = (date = new Date()) => {
  const currentDay = date.getDay();
  
  /**
   * daysToSubtract (assuming Tue is the start):
   * Tue (2): 0
   * Wed (3): 1
   * Thu (4): 2
   * Fri (5): 3
   * Sat (6): 4
   * Sun (0): 5
   * Mon (1): 6
   */
  const daysSinceTuesday = (currentDay - 2 + 7) % 7;
  
  const start = new Date(date);
  start.setDate(date.getDate() - daysSinceTuesday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Returns an array of dates for the current culinary week.
 */
export const getCulinaryWeekDays = (date = new Date()) => {
  const { start } = getCulinaryWeekRange(date);
  const days = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  
  return days;
};

/**
 * Returns a date string in YYYY-MM-DD format using local time.
 * Avoids the "day shift" issue when using toISOString() in different timezones.
 */
export const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
