import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as scheduleApi from '../services/scheduleApi';

vi.mock('../services/scheduleApi', () => ({
  fetchCourses: vi.fn(),
  addCourseToSchedule: vi.fn(),
  removeCourseFromSchedule: vi.fn(),
  moveCourseInSchedule: vi.fn()
}));

describe('Issue #12 - Course Equivalency Articulation & Dynamic Catalog Filtering', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS101', name: 'Intro CS', credits: 3, description: 'Intro course' },
      { code: 'CS120', name: 'Programming II', credits: 4, description: 'Intermediate course' },
      { code: 'MATH101', name: 'Calculus I', credits: 4, description: 'Calculus course' }
    ]);
  });

  it('populates Satisfies Home Course dropdown with catalog courses and defaults to None / General Elective', async () => {
    render(<App />);

    const addTransferBtn = await screen.findByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    const satisfiesSelect = screen.getByLabelText(/Satisfies Home Course/i);
    expect(satisfiesSelect.value).toBe('');

    // Should include options for CS101, CS120, MATH101
    expect(screen.getByRole('option', { name: /None \/ General Elective/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /CS101/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /CS120/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /MATH101/i })).toBeInTheDocument();
  });

  it('hides satisfied catalog course from Available Courses when transfer course specifies equivalency', async () => {
    render(<App />);

    // Initially CS120 is visible in sidebar
    expect(await screen.findByText('CS120')).toBeInTheDocument();

    const addTransferBtn = screen.getByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'CC-CS2' } });
    fireEvent.change(screen.getByLabelText(/Course Title/i), { target: { value: 'Data Structures at CC' } });
    fireEvent.change(screen.getByLabelText(/Credits/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Satisfies Home Course/i), { target: { value: 'CS120' } });

    fireEvent.click(screen.getByRole('button', { name: /^Add Transfer Course$/i }));

    // Now CC-CS2 is on the board
    await waitFor(() => {
      expect(screen.getByText('CC-CS2')).toBeInTheDocument();
    });

    // CS120 should be hidden from Available Courses
    const availableContainer = screen.getByPlaceholderText(/Search courses.../i).closest('.availableCourses');
    expect(availableContainer).not.toHaveTextContent('CS120');

    // Searching for CS120 should say no courses match
    fireEvent.change(screen.getByPlaceholderText(/Search courses.../i), { target: { value: 'CS120' } });
    expect(screen.getByText(/No courses match "CS120"/i)).toBeInTheDocument();
  });

  it('hides catalog course when transfer course code directly matches catalog code', async () => {
    render(<App />);

    expect(await screen.findByText('MATH101')).toBeInTheDocument();

    const addTransferBtn = screen.getByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'MATH101' } });
    fireEvent.change(screen.getByLabelText(/Course Title/i), { target: { value: 'Calculus I Transfer' } });
    fireEvent.change(screen.getByLabelText(/Credits/i), { target: { value: '4' } });
    // satisfies defaults to None, but code matches MATH101

    fireEvent.click(screen.getByRole('button', { name: /^Add Transfer Course$/i }));

    await waitFor(() => {
      expect(screen.getByText('Calculus I Transfer')).toBeInTheDocument();
    });

    const availableContainer = screen.getByPlaceholderText(/Search courses.../i).closest('.availableCourses');
    expect(availableContainer).not.toHaveTextContent('MATH101');
  });

  it('allows custom code entry for Satisfies Home Course and permits custom equivalency', async () => {
    render(<App />);

    const addTransferBtn = await screen.findByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    const satisfiesSelect = screen.getByLabelText(/Satisfies Home Course/i);
    fireEvent.change(satisfiesSelect, { target: { value: 'CUSTOM' } });

    const customInput = screen.getByPlaceholderText(/Enter custom course code/i);
    fireEvent.change(customInput, { target: { value: 'PHIL200' } });

    fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'AP-PHIL' } });
    fireEvent.change(screen.getByLabelText(/Course Title/i), { target: { value: 'AP Philosophy' } });
    fireEvent.change(screen.getByLabelText(/Credits/i), { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: /^Add Transfer Course$/i }));

    await waitFor(() => {
      expect(screen.getByText('AP-PHIL')).toBeInTheDocument();
      expect(screen.getByText(/PHIL200/)).toBeInTheDocument();
    });
  });

  it('filters Satisfies Home Course dropdown options as user types in the filter input', async () => {
    render(<App />);

    const addTransferBtn = await screen.findByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    // Initial state: all courses are options
    expect(screen.getByRole('option', { name: /CS101/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /MATH101/i })).toBeInTheDocument();

    // Type "MATH" into the filter input
    const filterInput = screen.getByPlaceholderText(/Type to filter catalog courses/i);
    fireEvent.change(filterInput, { target: { value: 'MATH' } });

    // MATH101 should still be an option
    expect(screen.getByRole('option', { name: /MATH101/i })).toBeInTheDocument();
    // CS101 should be filtered out
    expect(screen.queryByRole('option', { name: /CS101/i })).not.toBeInTheDocument();
  });
});
