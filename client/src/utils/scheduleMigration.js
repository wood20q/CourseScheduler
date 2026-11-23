export function createEmptySchedule() {
  return {
    transferCourses: [],
    years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
  };
}

export function isLegacySchedule(data) {
  return (
    Array.isArray(data) &&
    data.length === 4 &&
    data.every((y) => Array.isArray(y) && y.length === 3)
  );
}

export function isModernSchedule(data) {
  return Boolean(
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.years) &&
    data.years.length === 4 &&
    data.years.every((y) => Array.isArray(y) && y.length === 3) &&
    Array.isArray(data.transferCourses || [])
  );
}

export function migrateSchedule(data) {
  if (isModernSchedule(data)) {
    return {
      transferCourses: Array.isArray(data.transferCourses) ? data.transferCourses : [],
      years: data.years
    };
  }

  if (isLegacySchedule(data)) {
    return {
      transferCourses: [],
      years: data
    };
  }

  return createEmptySchedule();
}

function validateCourse(course, locationName) {
  if (!course || typeof course !== 'object' || !course.code || !(course.name || course.title)) {
    return `Invalid course found in ${locationName}: each course requires a code and title/name.`;
  }
  course.credits = Number(course.credits) || 0;
  return null;
}

export function validateSchedule(data) {
  if (!data || typeof data !== 'object') {
    return "Invalid schedule format: schedule must be an object or array.";
  }

  // Check modern schema
  if (!Array.isArray(data) && Array.isArray(data.years)) {
    if (data.years.length !== 4) {
      return "Invalid schedule format: must contain 4 years.";
    }
    if (data.transferCourses && !Array.isArray(data.transferCourses)) {
      return "Invalid format: transferCourses must be a list of courses.";
    }
    if (Array.isArray(data.transferCourses)) {
      for (const course of data.transferCourses) {
        const err = validateCourse(course, "Transfer Credits Section");
        if (err) return err;
      }
    }
    for (let y = 0; y < 4; y++) {
      if (!Array.isArray(data.years[y]) || data.years[y].length !== 3) {
        return `Invalid format in Year ${y + 1}: each year must have 3 terms.`;
      }
      for (let t = 0; t < 3; t++) {
        if (!Array.isArray(data.years[y][t])) {
          return `Invalid format in Year ${y + 1}, Term ${t + 1}: term must be a list of courses.`;
        }
        for (const course of data.years[y][t]) {
          const err = validateCourse(course, `Year ${y + 1}, Term ${t + 1}`);
          if (err) return err;
        }
      }
    }
    return null;
  }

  // Check legacy schema
  if (Array.isArray(data)) {
    if (data.length !== 4) {
      return "Invalid schedule format: must be an array of 4 years.";
    }
    for (let y = 0; y < 4; y++) {
      if (!Array.isArray(data[y]) || data[y].length !== 3) {
        return `Invalid format in Year ${y + 1}: each year must have 3 terms.`;
      }
      for (let t = 0; t < 3; t++) {
        if (!Array.isArray(data[y][t])) {
          return `Invalid format in Year ${y + 1}, Term ${t + 1}: term must be a list of courses.`;
        }
        for (const course of data[y][t]) {
          const err = validateCourse(course, `Year ${y + 1}, Term ${t + 1}`);
          if (err) return err;
        }
      }
    }
    return null;
  }

  return "Invalid schedule format.";
}

export function calculateTotalCredits(schedule) {
  if (!schedule) return 0;
  if (Array.isArray(schedule)) {
    const sum = schedule.flat(2).reduce((total, course) => total + (Number(course?.credits) || 0), 0);
    return Math.round(sum * 100) / 100;
  }
  const transferTotal = (schedule.transferCourses || []).reduce(
    (sum, course) => sum + (Number(course?.credits) || 0),
    0
  );
  const yearsTotal = (schedule.years || []).flat(2).reduce(
    (sum, course) => sum + (Number(course?.credits) || 0),
    0
  );
  return Math.round((transferTotal + yearsTotal) * 100) / 100;
}
