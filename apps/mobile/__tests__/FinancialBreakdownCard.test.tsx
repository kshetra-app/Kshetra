/**
 * Component and behavioral test for FinancialBreakdownCard
 * 
 * Fulfills KSHETRA — W021.5 CTO DIRECTIVE 067 Section 4.2:
 * - Exercises the jest-expo + React Native Testing Library harness
 * - Tests observable behavior for:
 *   1) all components disclosed and positive total
 *   2) partial components and positive total
 *   3) partial components with null total
 *   4) no disclosed components
 *   5) genuine zero total
 *   6) undisclosed total and components
 *   7) mixed disclosed and undisclosed timeline observations
 *   8) null and empty growth observations
 * - Asserts correct labels and values rendered, no missing value represented as zero, zero runtime exceptions
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import FinancialBreakdownCard, {
  resolveBreakdownState,
  formatINR,
} from '../components/legislator/FinancialBreakdownCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('<FinancialBreakdownCard /> & resolveBreakdownState (Directive 067 §4.2)', () => {
  // Scenario 1: all components disclosed and positive total
  describe('Scenario 1: All components disclosed and positive total', () => {
    const record = {
      electionYear: 2024,
      totalAssets: 10_000_000, // ₹1.0 Cr
      totalLiabilities: 2_000_000,
      netWorth: 8_000_000,
      selfMovableAssets: 3_000_000,
      selfImmovableAssets: 5_000_000,
      spouseMovableAssets: 1_000_000,
      spouseImmovableAssets: 1_000_000,
      dependentsAssets: 0,
    };

    it('resolves complete breakdown state with accurate percentages', () => {
      const state = resolveBreakdownState(record);
      expect(state.hasCompleteBreakdown).toBe(true);
      expect(state.hasAnyDisclosedComponent).toBe(true);
      expect(state.allComponentsUndisclosed).toBe(false);
      expect(state.percentages).not.toBeNull();
      expect(state.percentages?.selfMovPct).toBe(30);
      expect(state.percentages?.selfImmPct).toBe(50);
      expect(state.percentages?.spousePct).toBe(20);
    });

    it('renders stacked breakdown and component labels in UI', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getByText('Financial Disclosure')).toBeOnTheScreen();
      expect(screen.getByText('Self Movable')).toBeOnTheScreen();
      expect(screen.getByText('Self Immovable')).toBeOnTheScreen();
      expect(screen.getByText('Spouse')).toBeOnTheScreen();
      expect(screen.getByText('₹80.0 L')).toBeOnTheScreen(); // Net Worth
      expect(screen.getByText('₹30.0 L')).toBeOnTheScreen(); // Self Movable
      expect(screen.getByText('₹50.0 L')).toBeOnTheScreen(); // Self Immovable
      expect(screen.getAllByText('₹20.0 L').length).toBeGreaterThanOrEqual(1); // Spouse & Liabilities
    });
  });

  // Scenario 2: partial components and positive total
  describe('Scenario 2: Partial components and positive total', () => {
    const record = {
      electionYear: 2024,
      totalAssets: 5_000_000, // ₹50.0 L
      totalLiabilities: 500_000,
      netWorth: 4_500_000,
      selfMovableAssets: 2_000_000,
      selfImmovableAssets: null, // undisclosed
      spouseMovableAssets: 500_000,
      spouseImmovableAssets: null, // undisclosed
    };

    it('resolves partial itemization notice without stacked bar', () => {
      const state = resolveBreakdownState(record);
      expect(state.hasCompleteBreakdown).toBe(false);
      expect(state.hasAnyDisclosedComponent).toBe(true);
      expect(state.percentages).toBeNull(); // No misleading percentage calculation
      expect(state.statusNotice).toBe('Partial itemization — complete component breakdown not disclosed in filing');
    });

    it('renders partial components with explicit Not Disclosed for missing values without zero coercion', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getByText('Partial itemization — complete component breakdown not disclosed in filing')).toBeOnTheScreen();
      expect(screen.getByText('₹20.0 L')).toBeOnTheScreen(); // Disclosed Self Movable
      expect(screen.getAllByText('₹5.0 L').length).toBeGreaterThanOrEqual(1); // Disclosed Spouse Movable & Liabilities
      // Undisclosed components must show 'Not Disclosed' and NOT '₹0'
      const notDisclosedElements = screen.getAllByText('Not Disclosed');
      expect(notDisclosedElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Scenario 3: partial components with null total
  describe('Scenario 3: Partial components with null total', () => {
    const record = {
      electionYear: 2024,
      totalAssets: null, // Undisclosed total
      totalLiabilities: null,
      netWorth: null,
      selfMovableAssets: 1_500_000, // ₹15.0 L
      selfImmovableAssets: null,
      spouseMovableAssets: null,
      spouseImmovableAssets: null,
    };

    it('resolves partial itemization with null total notice', () => {
      const state = resolveBreakdownState(record);
      expect(state.hasCompleteBreakdown).toBe(false);
      expect(state.hasAnyDisclosedComponent).toBe(true);
      expect(state.totalAssetsDisclosed).toBe(false);
      expect(state.percentages).toBeNull();
      expect(state.statusNotice).toBe('Total assets not disclosed in filing — partial itemization shown as filed');
    });

    it('renders individually disclosed component even when totalAssets is null', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getByText('Total assets not disclosed in filing — partial itemization shown as filed')).toBeOnTheScreen();
      expect(screen.getByText('₹15.0 L')).toBeOnTheScreen();
      const notDisclosedElements = screen.getAllByText('Not Disclosed');
      expect(notDisclosedElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  // Scenario 4: no disclosed components with positive total
  describe('Scenario 4: No disclosed components with positive total', () => {
    const record = {
      electionYear: 2024,
      totalAssets: 3_000_000, // ₹30.0 L
      totalLiabilities: 0,
      netWorth: 3_000_000,
      selfMovableAssets: null,
      selfImmovableAssets: null,
      spouseMovableAssets: null,
      spouseImmovableAssets: null,
    };

    it('resolves unitemized notice', () => {
      const state = resolveBreakdownState(record);
      expect(state.hasCompleteBreakdown).toBe(false);
      expect(state.hasAnyDisclosedComponent).toBe(false);
      expect(state.allComponentsUndisclosed).toBe(true);
      expect(state.statusNotice).toBe('Component breakdown not itemized in filing');
    });

    it('renders unitemized notice without zero inference', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getByText('Component breakdown not itemized in filing')).toBeOnTheScreen();
      expect(screen.queryByText('Complete itemization')).toBeNull();
    });
  });

  // Scenario 5: genuine zero total
  describe('Scenario 5: Genuine zero total', () => {
    const record = {
      electionYear: 2024,
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      selfMovableAssets: 0,
      selfImmovableAssets: 0,
      spouseMovableAssets: 0,
      spouseImmovableAssets: 0,
    };

    it('resolves genuine zero without coercion to null', () => {
      const state = resolveBreakdownState(record);
      expect(state.isZeroTotal).toBe(true);
      expect(state.totalAssetsDisclosed).toBe(true);
    });

    it('renders affirmative zero labels without error', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getAllByText('₹0').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Assets not disclosed')).toBeNull();
    });
  });

  // Scenario 6: undisclosed total and components
  describe('Scenario 6: Undisclosed total and components', () => {
    const record = {
      electionYear: 2024,
      totalAssets: null,
      totalLiabilities: null,
      netWorth: null,
      selfMovableAssets: null,
      selfImmovableAssets: null,
      spouseMovableAssets: null,
      spouseImmovableAssets: null,
    };

    it('resolves undisclosed assets notice', () => {
      const state = resolveBreakdownState(record);
      expect(state.hasCompleteBreakdown).toBe(false);
      expect(state.hasAnyDisclosedComponent).toBe(false);
      expect(state.allComponentsUndisclosed).toBe(true);
      expect(state.totalAssetsDisclosed).toBe(false);
      expect(state.statusNotice).toBe('Assets not disclosed in filing');
    });

    it('renders Assets not disclosed in filing banner', () => {
      render(<FinancialBreakdownCard records={[record]} />);
      expect(screen.getByText('Assets not disclosed in filing')).toBeOnTheScreen();
      expect(screen.getAllByText('Not Disclosed').length).toBeGreaterThanOrEqual(1);
    });
  });

  // Scenario 7: mixed disclosed and undisclosed timeline observations
  describe('Scenario 7: Mixed disclosed and undisclosed timeline observations', () => {
    const records = [
      {
        electionYear: 2018,
        totalAssets: 1_000_000, // Disclosed
        totalLiabilities: 200_000,
      },
      {
        electionYear: 2021,
        totalAssets: null, // Undisclosed
        totalLiabilities: null,
      },
      {
        electionYear: 2024,
        totalAssets: 2_500_000, // Disclosed
        totalLiabilities: 500_000,
        selfMovableAssets: 1_000_000,
        selfImmovableAssets: 1_500_000,
        spouseMovableAssets: 0,
        spouseImmovableAssets: 0,
      },
    ];

    it('renders timeline with both disclosed and undisclosed bars without throwing', () => {
      render(<FinancialBreakdownCard records={records} />);
      expect(screen.getByText('Wealth Timeline')).toBeOnTheScreen();
      expect(screen.getByText('2018')).toBeOnTheScreen();
      expect(screen.getByText('2021')).toBeOnTheScreen();
      expect(screen.getAllByText('2024').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('₹10.0 L').length).toBeGreaterThanOrEqual(1); // 2018 timeline & self movable
      expect(screen.getAllByText('Not Disclosed').length).toBeGreaterThanOrEqual(1); // 2021 timeline and/or net worth
      expect(screen.getByText('₹25.0 L')).toBeOnTheScreen(); // 2024
    });
  });

  // Scenario 8: null and empty growth observations
  describe('Scenario 8: Null and empty growth observations', () => {
    it('handles empty records cleanly', () => {
      render(<FinancialBreakdownCard records={[]} />);
      expect(screen.getByText('No financial data available')).toBeOnTheScreen();
    });

    it('handles null growth gracefully in compact mode', () => {
      const records = [
        {
          electionYear: 2019,
          totalAssets: null,
          totalLiabilities: null,
        },
        {
          electionYear: 2024,
          totalAssets: 10_000_000,
          totalLiabilities: 1_000_000,
        },
      ];
      render(<FinancialBreakdownCard records={records} compact />);
      expect(screen.getByText('—')).toBeOnTheScreen(); // Growth is '—' because previous is null
      expect(screen.getByText('Assets')).toBeOnTheScreen();
      expect(screen.getByText('Liabilities')).toBeOnTheScreen();
    });
  });
});
