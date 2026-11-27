import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App, { FALLBACK_CATALOG } from '../App';
import * as scheduleApi from '../services/scheduleApi';

// Mock scheduleApi
vi.mock('../services/scheduleApi', () => ({
  fetchCourses: vi.fn(),
  addCourseToSchedule: vi.fn(),
  removeCourseFromSchedule: vi.fn(),
  moveCourseInSchedule: vi.fn()
}));

describe('App - Issue #10 Schedule Schema & Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS101', name: 'Intro CS', credits: 3, description: 'Intro course' },
      { code: 'CS120', name: 'Programming II', credits: 4, description: 'Intermediate course' }
    ]);
  });

  it('hydrates legacy 4x3 schedule from localStorage and calculates Total Credits', async () => {
    const legacySchedule = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []));
    legacySchedule[0][0] = [{ code: 'CS101', name: 'Intro CS', credits: 3, description: 'Intro' }];
    localStorage.setItem('course_scheduler_data', JSON.stringify(legacySchedule));

    render(<App />);

    expect(await screen.findByText(/Total Credits:\s*3/i)).toBeInTheDocument();
    expect(screen.getByText('CS101')).toBeInTheDocument();
  });

  it('hydrates modern schema with transferCourses from localStorage', async () => {
    const modernSchedule = {
      transferCourses: [
        { code: 'AP-CALC', name: 'AP Calculus BC', credits: 4, isTransfer: true }
      ],
      years: [
        [[{ code: 'CS101', name: 'Intro CS', credits: 3 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(modernSchedule));

    render(<App />);

    expect(await screen.findByText(/Total Credits:\s*7/i)).toBeInTheDocument();
  });

  it('clears all courses including transferCourses when schedule is reset', async () => {
    const modernSchedule = {
      transferCourses: [
        { code: 'AP-CALC', name: 'AP Calculus BC', credits: 4, isTransfer: true }
      ],
      years: [
        [[{ code: 'CS101', name: 'Intro CS', credits: 3 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(modernSchedule));

    render(<App />);

    expect(await screen.findByText(/Total Credits:\s*7/i)).toBeInTheDocument();

    // Open Import/Export Dialog
    fireEvent.click(screen.getByRole('button', { name: /import \/ export/i }));

    // Click "Clear Entire Schedule"
    const clearButton = screen.getByRole('button', { name: /clear entire schedule/i });
    fireEvent.click(clearButton);

    // Click confirm "Yes, Clear Schedule"
    const confirmButton = screen.getByRole('button', { name: /yes, clear schedule/i });
    fireEvent.click(confirmButton);

    // Total credits should now be 0
    await waitFor(() => {
      expect(screen.getByText(/Total Credits:\s*0/i)).toBeInTheDocument();
    });

    const saved = JSON.parse(localStorage.getItem('course_scheduler_data'));
    expect(saved.transferCourses).toEqual([]);
    expect(saved.years.flat(2)).toEqual([]);
  });
});

describe('Catalog Requirements Schema Integration (Issue #27)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('evaluates requirements dynamically from catalog course records delivered via API', async () => {
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS120', name: 'Intro to Python', credits: 1, prerequisites: [], corequisites: [] },
      { code: 'DYNAMIC201', name: 'Dynamic Advanced Course', credits: 1, prerequisites: [['CS120']], corequisites: [] }
    ]);

    const initialSchedule = {
      transferCourses: [],
      years: [
        [[{ code: 'DYNAMIC201', name: 'Dynamic Advanced Course', credits: 1 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    // Since CS120 is not taken prior to DYNAMIC201, it should show Unsatisfied Requirement Flag
    expect(await screen.findByText('⚠️ Missing Req')).toBeInTheDocument();
  });

  it('uses prerequisites directly from catalog courses without falling back to hardcoded CATALOG_REQUIREMENTS', async () => {
    // When API delivers CS220 without prerequisites, it should not have missing requirements
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS220', name: 'Data Structures and Algorithms', credits: 1, prerequisites: [], corequisites: [] }
    ]);

    const initialSchedule = {
      transferCourses: [],
      years: [
        [[{ code: 'CS220', name: 'Data Structures and Algorithms', credits: 1 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    expect(await screen.findByText('CS220')).toBeInTheDocument();
    expect(screen.queryByText('⚠️ Missing Req')).toBeNull();
  });

  it('uses FALLBACK_CATALOG with embedded prerequisites and corequisites when API fails', async () => {
    scheduleApi.fetchCourses.mockRejectedValue(new Error('Network error'));

    // FALLBACK_CATALOG contains CS220 which requires CS120
    const initialSchedule = {
      transferCourses: [],
      years: [
        [[{ code: 'CS220', name: 'Data Structures and Algorithms', credits: 1 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    // CS220 without CS120 should flag missing requirements from FALLBACK_CATALOG definition
    expect(await screen.findByText('⚠️ Missing Req')).toBeInTheDocument();
  });

  it('defines prerequisites and corequisites directly on catalog courses without hardcoded CATALOG_REQUIREMENTS', () => {
    expect(FALLBACK_CATALOG).toBeDefined();
    for (const course of FALLBACK_CATALOG) {
      expect(Array.isArray(course.prerequisites)).toBe(true);
      expect(Array.isArray(course.corequisites)).toBe(true);
    }
    const cs220 = FALLBACK_CATALOG.find(c => c.code === 'CS220');
    expect(cs220.prerequisites).toEqual([['CS120']]);
    expect(cs220.corequisites).toEqual([]);

    const cs350 = FALLBACK_CATALOG.find(c => c.code === 'CS350');
    expect(cs350.prerequisites).toEqual([['CS220', 'CS240']]);
    expect(cs350.corequisites).toEqual([]);

    const cs240 = FALLBACK_CATALOG.find(c => c.code === 'CS240');
    expect(cs240.prerequisites).toEqual([['CS120']]);
    expect(cs240.corequisites).toEqual([]);

    const phys200 = FALLBACK_CATALOG.find(c => c.code === 'PHYS200');
    expect(phys200.prerequisites).toEqual([]);
    expect(phys200.corequisites).toEqual([['MATH101']]);
  });
});
