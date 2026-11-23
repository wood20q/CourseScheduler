import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
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
