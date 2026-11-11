// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { PlayerCardTable, type PlayerCardTableProps } from './index';

afterEach(cleanup);

type Player = PlayerCardTableProps['players'][number];
const player = (id: string, operationalStatus: Player['operationalStatus'] = 'eligible', selectable = true): Player =>
  Object.freeze({ id, alias: 'Echo', avatarLabel: 'Approved portrait label', operationalStatus, selectable });

function setup(players: readonly Player[] = Object.freeze([player('p1'), player('p2')])) {
  const props: PlayerCardTableProps = Object.freeze({ players, selectedId: null, votingEnabled: true, onVote: vi.fn(), onDetails: vi.fn() });
  return { props, user: userEvent.setup(), ...render(<PlayerCardTable {...props} />) };
}

function voteButton(id: string) {
  return screen.getByRole('button', { name: new RegExp(`^Echo Player ID: ${id} `) });
}

test('pointer, Enter and Space each directly request exactly one ID without optimistic selection', async () => {
  const { props, user } = setup();
  const button = voteButton('p1');
  await user.click(button);
  expect(props.onVote).toHaveBeenCalledTimes(1);
  expect(props.onVote).toHaveBeenLastCalledWith('p1');
  expect(button.getAttribute('aria-pressed')).toBe('false');
  await user.keyboard('{Enter}');
  expect(props.onVote).toHaveBeenCalledTimes(2);
  await user.keyboard(' ');
  expect(props.onVote).toHaveBeenCalledTimes(3);
  expect(props.onDetails).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /cast|continue/i })).toBeNull();
});

test.each(['cooldown', 'jammed', 'spectator'] as const)('%s cannot vote even if selectable is true; details remain available', async (status) => {
  const { props, user } = setup([player('p1', status)]);
  const button = voteButton('p1');
  expect((button as HTMLButtonElement).disabled).toBe(true);
  await user.click(button);
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Details/ }));
  await user.keyboard('{Enter}');
  expect(props.onVote).not.toHaveBeenCalled();
  expect(props.onDetails).toHaveBeenCalledExactlyOnceWith('p1');
});

test('controlled capabilities and voting gate update immediately on rerender', async () => {
  const { props, user, rerender } = setup([player('p1', 'eligible', false)]);
  await user.click(voteButton('p1'));
  expect(props.onVote).not.toHaveBeenCalled();
  rerender(<PlayerCardTable {...props} players={[player('p1')]} />);
  await user.click(voteButton('p1'));
  expect(props.onVote).toHaveBeenCalledExactlyOnceWith('p1');
  rerender(<PlayerCardTable {...props} players={[player('p1')]} votingEnabled={false} />);
  expect(screen.getByText('Voting unavailable.')).toBeTruthy();
  await user.click(voteButton('p1'));
  await user.keyboard('{Enter} ');
  expect(props.onVote).toHaveBeenCalledTimes(1);
});

test.each(['shift-lead', 'route-operator', 'gate-operator'] as const)('public %s capability permits direct voting', async (status) => {
  const { props, user } = setup([player('p1', status)]);
  await user.click(voteButton('p1'));
  expect(props.onVote).toHaveBeenCalledExactlyOnceWith('p1');
});

test('duplicate aliases retain ID identity, selected text and ARIA through reordering', async () => {
  const { props, user, rerender } = setup();
  const original = voteButton('p2');
  rerender(<PlayerCardTable {...props} players={Object.freeze([...props.players].reverse())} selectedId="p2" />);
  expect(voteButton('p2')).toBe(original);
  expect(original.getAttribute('aria-pressed')).toBe('true');
  expect(within(original).getByText('Selected')).toBeTruthy();
  expect(original.closest('li')?.getAttribute('data-selected')).toBe('true');
  expect(voteButton('p1').getAttribute('aria-pressed')).toBe('false');
  await user.click(screen.getByRole('button', { name: 'Details for Echo (Player ID: p2)' }));
  expect(props.onDetails).toHaveBeenCalledExactlyOnceWith('p2');
  expect(props.onVote).not.toHaveBeenCalled();
  rerender(<PlayerCardTable {...props} selectedId="p1" />);
  expect(voteButton('p2').getAttribute('aria-pressed')).toBe('false');
  expect(voteButton('p1').getAttribute('aria-pressed')).toBe('true');
  expect(props.players.map(({ id }) => id)).toEqual(['p1', 'p2']);
});

test('only explicit public fields render; missing avatar media is honest and empty roster is supported', () => {
  const publicPlayer = Object.freeze({ ...player('p1'), faction: 'PRIVATE_FACTION', secretRole: 'PRIVATE_ROLE' });
  const { props, container, rerender } = setup([publicPlayer]);
  expect(container.innerHTML).not.toMatch(/PRIVATE_FACTION|PRIVATE_ROLE|secretRole|faction/);
  expect(screen.getByRole('img', { name: 'Approved portrait label' }).textContent).toBe('Avatar unavailable');
  expect(container.querySelector('img')).toBeNull();
  rerender(<PlayerCardTable {...props} players={[]} />);
  expect(screen.getByText('No players available.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
