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
      transferCourses: Array.isArray(data.transferCourses)
        ? data.transferCourses.map((c) => ({ ...c, credits: Number(c.credits) || 0 }))
        : [],
      years: data.years.map((year) =>
        year.map((term) =>
          term.map((c) => ({ ...c, credits: Number(c.credits) || 0 }))
        )
      )
    };
  }

  if (isLegacySchedule(data)) {
    return {
      transferCourses: [],
      years: data.map((year) =>
        year.map((term) =>
          term.map((c) => ({ ...c, credits: Number(c.credits) || 0 }))
        )
      )
    };
  }

  return createEmptySchedule();
}

function validateCourse(course, locationName) {
  if (!course || typeof course !== 'object' || !course.code || !(course.name || course.title)) {
    return `Invalid course found in ${locationName}: each course requires a code and title/name.`;
  }
  if (course.credits !== undefined && isNaN(Number(course.credits))) {
    return `Invalid course found in ${locationName}: credits must be a valid number.`;
  }
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

export function calculateCredits(courses) {
  if (!Array.isArray(courses)) return 0;
  const raw = courses.reduce((sum, c) => sum + (Number(c?.credits) || 0), 0);
  return Math.round(raw * 100) / 100;
}

export function calculateTotalCredits(schedule) {
  if (!schedule) return 0;
  if (Array.isArray(schedule)) {
    return calculateCredits(schedule.flat(2));
  }
  const transferTotal = calculateCredits(schedule.transferCourses || []);
  const yearsTotal = calculateCredits((schedule.years || []).flat(2));
  return Math.round((transferTotal + yearsTotal) * 100) / 100;
}

export function parseLocation(location) {
  if (!location || location === 'transfer') {
    return { type: 'transfer' };
  }
  if (typeof location === 'object' && !Array.isArray(location)) {
    if (location.type === 'term') {
      return { type: 'term', year: Number(location.year), term: Number(location.term) };
    }
    return { type: 'transfer' };
  }
  if (Array.isArray(location)) {
    return { type: 'term', year: Number(location[0]), term: Number(location[1]) };
  }
  if (typeof location === 'string' && location.includes(',')) {
    const [y, t] = location.split(',').map(Number);
    return { type: 'term', year: y, term: t };
  }
  return { type: 'transfer' };
}

export function formatLocationKey(location) {
  const parsed = parseLocation(location);
  if (parsed.type === 'transfer') return 'transfer';
  return `${parsed.year},${parsed.term}`;
}

export function isTransferLocation(location) {
  return parseLocation(location).type === 'transfer';
}

export function removeCourseFromSchedule(schedule, code) {
  const normalized = migrateSchedule(schedule);
  const targetCode = code?.trim().toUpperCase();

  return {
    transferCourses: normalized.transferCourses.filter(
      (c) => c.code?.trim().toUpperCase() !== targetCode
    ),
    years: normalized.years.map((year) =>
      year.map((term) =>
        term.filter((c) => c.code?.trim().toUpperCase() !== targetCode)
      )
    )
  };
}

export function addCourseToSchedule(schedule, course, location) {
  const normalized = removeCourseFromSchedule(schedule, course.code);
  const loc = parseLocation(location);

  if (loc.type === 'transfer') {
    return {
      ...normalized,
      transferCourses: [...normalized.transferCourses, course]
    };
  }

  const newYears = normalized.years.map((year, yIdx) =>
    year.map((term, tIdx) => {
      if (yIdx === loc.year && tIdx === loc.term) {
        return [...term, course];
      }
      return [...term];
    })
  );

  return {
    ...normalized,
    years: newYears
  };
}

export function findCourseInSchedule(schedule, code) {
  if (!schedule || !code) return null;
  const targetCode = String(code).trim().toUpperCase();

  const transferCourse = (schedule.transferCourses || []).find(
    (c) => String(c.code).trim().toUpperCase() === targetCode
  );
  if (transferCourse) {
    return {
      course: transferCourse,
      location: { type: 'transfer' },
      locationLabel: 'Pre-College / Transfer Credits'
    };
  }

  const years = schedule.years || [];
  for (let y = 0; y < years.length; y++) {
    const terms = years[y] || [];
    for (let t = 0; t < terms.length; t++) {
      const course = terms[t].find(
        (c) => String(c.code).trim().toUpperCase() === targetCode
      );
      if (course) {
        return {
          course,
          location: { type: 'term', year: y, term: t },
          locationLabel: `Year ${y + 1} Term ${t + 1}`
        };
      }
    }
  }

  return null;
}

export function moveCourseInSchedule(schedule, code, targetLocation) {
  const normalized = migrateSchedule(schedule);
  const found = findCourseInSchedule(normalized, code);
  if (!found) return normalized;

  return addCourseToSchedule(normalized, found.course, targetLocation);
}
